-- Schema para invitaciones digitales Jeifry & Karen · 19 Jun 2026
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Invitados con su cupo de acompañantes
CREATE TABLE IF NOT EXISTS guests (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(100) NOT NULL,
  invite_code    CHAR(10)     UNIQUE NOT NULL,
  max_companions INT          NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- Una fila por invitado una vez que confirma (o declina)
CREATE TABLE IF NOT EXISTS rsvps (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id     UUID        NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  attending    BOOLEAN     NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (guest_id)
);

-- Una fila por persona (invitado principal + cada acompañante)
CREATE TABLE IF NOT EXISTS rsvp_people (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_id         UUID         NOT NULL REFERENCES rsvps(id) ON DELETE CASCADE,
  person_name     VARCHAR(100) NOT NULL,
  is_companion    BOOLEAN      NOT NULL DEFAULT FALSE,
  companion_index INT          NOT NULL DEFAULT 0,
  dish            VARCHAR(50)
  -- 'pollo_tallarines' | 'pollo_champi' | 'pescado_teriyaki'
);
