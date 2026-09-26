param(
  [string]$ClusterId,
  [string]$ClusterName = "avitus-materia-db",
  [string]$ApiApp = "avitus-materia-api",
  [string]$WebApp = "avitus-materia-web",
  [string]$OrganizationId = "f0e990a7-e27c-4308-b4b6-d619e68c2270"
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Ensure-FlyApp([string]$AppName) {
  & fly status -a $AppName *> $null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Fly app exists: $AppName"
    return
  }

  Write-Host "Creating Fly app: $AppName"
  & fly apps create $AppName
  if ($LASTEXITCODE -ne 0) {
    throw "Could not create Fly app '$AppName'. The name may already be taken globally."
  }
}

function Get-JsonItems($Parsed, [string]$CollectionProperty) {
  if ($Parsed -is [System.Array]) { return $Parsed }
  if ($CollectionProperty -and $null -ne $Parsed.$CollectionProperty) { return $Parsed.$CollectionProperty }
  return @($Parsed)
}

function Resolve-ClusterId([string]$RequestedId, [string]$RequestedName) {
  if ($RequestedId) { return $RequestedId }

  $json = & fly mpg list --json
  if ($LASTEXITCODE -ne 0) {
    throw "Could not list Managed Postgres clusters. Run 'fly auth logout' and 'fly auth login' if your flyctl session is old."
  }

  $parsed = $json | ConvertFrom-Json
  $clusters = Get-JsonItems $parsed "clusters"
  $cluster = $clusters | Where-Object { $_.name -eq $RequestedName } | Select-Object -First 1
  if (-not $cluster) {
    throw "Managed Postgres cluster '$RequestedName' was not found. Create it in Fly first or pass -ClusterId explicitly."
  }

  return $cluster.id
}

function Has-FlySecret([string]$AppName, [string]$SecretName) {
  $json = & fly secrets list -a $AppName --json
  if ($LASTEXITCODE -ne 0) { return $false }

  $parsed = $json | ConvertFrom-Json
  $items = Get-JsonItems $parsed "secrets"
  return $null -ne ($items | Where-Object { $_.name -eq $SecretName } | Select-Object -First 1)
}

Require-Command "fly"

Write-Host "Checking Fly authentication..."
& fly auth whoami
if ($LASTEXITCODE -ne 0) {
  throw "Fly authentication is required. Run 'fly auth login' first."
}

$resolvedClusterId = Resolve-ClusterId $ClusterId $ClusterName
Write-Host "Using Managed Postgres cluster: $ClusterName ($resolvedClusterId)"

Ensure-FlyApp $ApiApp
Ensure-FlyApp $WebApp

if (Has-FlySecret $ApiApp "DATABASE_URL") {
  Write-Host "DATABASE_URL already exists on $ApiApp; skipping Managed Postgres attach."
} else {
  Write-Host "Attaching Managed Postgres to API app..."
  & fly mpg attach $resolvedClusterId -a $ApiApp
  if ($LASTEXITCODE -ne 0) {
    throw "Managed Postgres attach failed."
  }
}

$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$inquirySecret = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')

Write-Host "Setting API secrets..."
& fly secrets set `
  "PUBLIC_INQUIRY_ORGANIZATION_ID=$OrganizationId" `
  "PUBLIC_INQUIRY_API_KEY=$inquirySecret" `
  -a $ApiApp
if ($LASTEXITCODE -ne 0) { throw "Setting API secrets failed." }

Write-Host "Setting web secrets for private API communication..."
& fly secrets set `
  "AVITUS_API_URL=http://$ApiApp.internal:4000" `
  "PUBLIC_INQUIRY_API_KEY=$inquirySecret" `
  -a $WebApp
if ($LASTEXITCODE -ne 0) { throw "Setting web secrets failed." }

Write-Host "Deploying API..."
& fly deploy -c fly.api.toml -a $ApiApp
if ($LASTEXITCODE -ne 0) { throw "API deployment failed." }

Write-Host "Deploying public web..."
& fly deploy -c fly.web.toml -a $WebApp
if ($LASTEXITCODE -ne 0) { throw "Web deployment failed." }

Write-Host "Running basic health checks..."
$apiReady = "https://$ApiApp.fly.dev/ready"
$webUrl = "https://$WebApp.fly.dev"

try {
  $readyResponse = Invoke-WebRequest -Uri $apiReady -UseBasicParsing -TimeoutSec 20
  Write-Host "API ready: $($readyResponse.StatusCode) $apiReady"
} catch {
  Write-Warning "API readiness check failed: $apiReady"
}

try {
  $webResponse = Invoke-WebRequest -Uri $webUrl -UseBasicParsing -TimeoutSec 20
  Write-Host "Web: $($webResponse.StatusCode) $webUrl"
} catch {
  Write-Warning "Web check failed: $webUrl"
}

Write-Host ""
Write-Host "First Fly deployment finished."
Write-Host "Production organization UUID: $OrganizationId"
Write-Host "The inquiry secret was generated and stored directly in Fly secrets; it was not written to disk or printed."
Write-Host "Re-running this script keeps the same production organization UUID and safely rotates the inquiry secret on both apps."
Write-Host "Next: verify the public form, then configure custom domains and home.pl DNS."
