-- Invite codes for BETA_MODE + legal acceptance timestamps on users

ALTER TABLE "users"
  ADD COLUMN "termsAcceptedAt"   TIMESTAMP(3),
  ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3);

CREATE TABLE "invite_codes" (
  "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
  "code"        TEXT          NOT NULL,
  "note"        TEXT,
  "maxUses"     INTEGER       NOT NULL DEFAULT 1,
  "usedCount"   INTEGER       NOT NULL DEFAULT 0,
  "expiresAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" UUID,
  "usedById"    UUID,
  "usedAt"      TIMESTAMP(3),

  CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invite_codes_code_key"     ON "invite_codes"("code");
CREATE UNIQUE INDEX "invite_codes_usedById_key" ON "invite_codes"("usedById");
CREATE INDEX         "invite_codes_code_idx"        ON "invite_codes"("code");
CREATE INDEX         "invite_codes_createdById_idx" ON "invite_codes"("createdById");

ALTER TABLE "invite_codes"
  ADD CONSTRAINT "invite_codes_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invite_codes"
  ADD CONSTRAINT "invite_codes_usedById_fkey"
  FOREIGN KEY ("usedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
