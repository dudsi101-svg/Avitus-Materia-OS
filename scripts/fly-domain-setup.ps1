param(
  [string]$Domain = "avitus-materia.com",
  [string]$ApiApp = "avitus-materia-api",
  [string]$WebApp = "avitus-materia-web"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
  throw "flyctl is required in PATH."
}

$wwwDomain = "www.$Domain"
$apiDomain = "api.$Domain"

Write-Host "Requesting Fly certificates..."
& fly certs add $Domain -a $WebApp
& fly certs add $wwwDomain -a $WebApp
& fly certs add $apiDomain -a $ApiApp

Write-Host ""
Write-Host "=== WEB apex DNS requirements ==="
& fly certs setup $Domain -a $WebApp

Write-Host ""
Write-Host "=== WEB www DNS requirements ==="
& fly certs setup $wwwDomain -a $WebApp

Write-Host ""
Write-Host "=== API DNS requirements ==="
& fly certs setup $apiDomain -a $ApiApp

Write-Host ""
Write-Host "=== Fly ingress IPs: WEB ==="
& fly ips list -a $WebApp

Write-Host ""
Write-Host "=== Fly ingress IPs: API ==="
& fly ips list -a $ApiApp

Write-Host ""
Write-Host "Copy ONLY the exact DNS records requested above into home.pl."
Write-Host "Do not modify MX, SPF, DKIM or DMARC records."
Write-Host "After DNS propagation, verify certificates with:"
Write-Host "  fly certs list -a $WebApp"
Write-Host "  fly certs list -a $ApiApp"
