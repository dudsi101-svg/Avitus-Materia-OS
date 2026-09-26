CREATE TYPE organization_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE membership_status AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE lead_status AS ENUM ('NEW','CONTACT_PENDING','CONTACTED','QUALIFYING','QUALIFIED','DISCOVERY','CONFIGURING','QUOTE_PENDING','QUOTED','NEGOTIATION','WON','LOST','DORMANT','DISQUALIFIED');
CREATE TYPE lead_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE actor_type AS ENUM ('USER','AI_AGENT','SYSTEM','INTEGRATION','CUSTOMER','PARTNER');
CREATE TYPE outbox_status AS ENUM ('PENDING','PUBLISHED','FAILED');

CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  name varchar(255) NOT NULL,
  slug varchar(120) NOT NULL UNIQUE,
  status organization_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE users (
  id uuid PRIMARY KEY,
  auth_provider_id varchar(255) NOT NULL UNIQUE,
  email varchar(320) NOT NULL,
  status user_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE roles (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  code varchar(120) NOT NULL,
  name varchar(160) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE permissions (
  id uuid PRIMARY KEY,
  code varchar(160) NOT NULL UNIQUE,
  description text
);
CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);
CREATE TABLE organization_users (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id),
  status membership_status NOT NULL DEFAULT 'ACTIVE',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);
CREATE TABLE leads (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title varchar(255),
  source varchar(120),
  status lead_status NOT NULL DEFAULT 'NEW',
  priority lead_priority NOT NULL DEFAULT 'NORMAL',
  assigned_to_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_org_created_idx ON leads(organization_id, created_at);
CREATE INDEX leads_org_status_idx ON leads(organization_id, status);
CREATE TABLE domain_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type varchar(160) NOT NULL,
  aggregate_type varchar(160) NOT NULL,
  aggregate_id uuid NOT NULL,
  event_version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  correlation_id uuid NOT NULL,
  causation_id uuid,
  actor_type actor_type NOT NULL,
  actor_id uuid NOT NULL
);
CREATE INDEX domain_events_correlation_idx ON domain_events(correlation_id);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_type actor_type NOT NULL,
  actor_id uuid NOT NULL,
  entity_type varchar(160) NOT NULL,
  entity_id uuid NOT NULL,
  action varchar(160) NOT NULL,
  before_data jsonb,
  after_data jsonb,
  reason text,
  correlation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_entity_idx ON audit_events(organization_id, entity_type, entity_id);
CREATE TABLE outbox_events (
  id uuid PRIMARY KEY,
  domain_event_id uuid NOT NULL REFERENCES domain_events(id) ON DELETE CASCADE,
  topic varchar(160) NOT NULL,
  payload jsonb NOT NULL,
  status outbox_status NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_pending_idx ON outbox_events(status, available_at);
