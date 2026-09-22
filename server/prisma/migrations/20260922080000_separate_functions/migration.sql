-- ===========================================================================
-- Engagement and DAREES become two separate functions, each with its own
-- guest list, headcount and RSVP. Existing data is carried across, not lost:
--   * every event gains an ENGAGEMENT and a DAREES function
--   * every guest's current RSVP becomes their ENGAGEMENT invitation
--   * guests previously marked "DAREES: Yes" also gain a DAREES invitation
-- ===========================================================================

CREATE TYPE "FunctionKey" AS ENUM ('ENGAGEMENT', 'DAREES');

-- --------------------------------------------------------------- functions

CREATE TABLE "event_functions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "key" "FunctionKey" NOT NULL,
    "name" TEXT NOT NULL,
    "time" TEXT,
    "venue" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_functions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_functions_event_id_key_key" ON "event_functions"("event_id", "key");

ALTER TABLE "event_functions" ADD CONSTRAINT "event_functions_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry the two times that used to live on the event itself.
INSERT INTO "event_functions" ("id","event_id","key","name","time","sort_order","created_at","updated_at")
SELECT gen_random_uuid(), e."id", 'ENGAGEMENT', 'Engagement Ceremony', e."engagement_time", 1, now(), now()
FROM "events" e;

INSERT INTO "event_functions" ("id","event_id","key","name","time","sort_order","created_at","updated_at")
SELECT gen_random_uuid(), e."id", 'DAREES', 'DAREES', e."darees_time", 2, now(), now()
FROM "events" e;

-- ------------------------------------------------------------- invitations

CREATE TABLE "guest_invitations" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "function_id" UUID NOT NULL,
    "invited_count" INTEGER NOT NULL DEFAULT 1,
    "confirmed_count" INTEGER NOT NULL DEFAULT 0,
    "rsvp_status" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "rsvp_received_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guest_invitations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guest_invitations_guest_id_function_id_key" ON "guest_invitations"("guest_id", "function_id");
CREATE INDEX "guest_invitations_function_id_rsvp_status_idx" ON "guest_invitations"("function_id", "rsvp_status");
CREATE INDEX "guest_invitations_guest_id_idx" ON "guest_invitations"("guest_id");

ALTER TABLE "guest_invitations" ADD CONSTRAINT "guest_invitations_guest_id_fkey"
  FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guest_invitations" ADD CONSTRAINT "guest_invitations_function_id_fkey"
  FOREIGN KEY ("function_id") REFERENCES "event_functions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Each existing guest keeps their RSVP, now attached to the engagement.
INSERT INTO "guest_invitations"
  ("id","guest_id","function_id","invited_count","confirmed_count","rsvp_status","rsvp_received_at","checked_in_at","created_at","updated_at")
SELECT gen_random_uuid(), g."id", f."id", g."invited_count", g."confirmed_count",
       g."rsvp_status", g."rsvp_received_at", g."checked_in_at", now(), now()
FROM "guests" g
JOIN "event_functions" f ON f."event_id" = g."event_id" AND f."key" = 'ENGAGEMENT';

-- Guests who had said yes to DAREES get a DAREES invitation as well.
INSERT INTO "guest_invitations"
  ("id","guest_id","function_id","invited_count","confirmed_count","rsvp_status","rsvp_received_at","created_at","updated_at")
SELECT gen_random_uuid(), g."id", f."id", g."invited_count",
       CASE WHEN g."rsvp_status" = 'CONFIRMED' THEN g."confirmed_count" ELSE 0 END,
       g."rsvp_status", g."rsvp_received_at", now(), now()
FROM "guests" g
JOIN "event_functions" f ON f."event_id" = g."event_id" AND f."key" = 'DAREES'
WHERE g."darees_attendance" = 'YES';

-- ---------------------------------------------------------- rsvp responses

ALTER TABLE "rsvp_responses" ADD COLUMN "invitation_id" UUID;

UPDATE "rsvp_responses" r
SET "invitation_id" = i."id"
FROM "guest_invitations" i
JOIN "event_functions" f ON f."id" = i."function_id"
WHERE i."guest_id" = r."guest_id" AND f."key" = 'ENGAGEMENT';

-- Any response we cannot attribute to a function is history we cannot place.
DELETE FROM "rsvp_responses" WHERE "invitation_id" IS NULL;

ALTER TABLE "rsvp_responses" ALTER COLUMN "invitation_id" SET NOT NULL;
ALTER TABLE "rsvp_responses" DROP COLUMN "darees_attendance";

CREATE INDEX "rsvp_responses_invitation_id_responded_at_idx" ON "rsvp_responses"("invitation_id", "responded_at");

ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_invitation_id_fkey"
  FOREIGN KEY ("invitation_id") REFERENCES "guest_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------- drop the old shape

DROP INDEX "guests_darees_attendance_idx";
DROP INDEX "guests_rsvp_status_idx";

ALTER TABLE "guests"
  DROP CONSTRAINT "guests_invited_count_positive",
  DROP CONSTRAINT "guests_confirmed_count_valid",
  DROP CONSTRAINT "guests_not_attending_has_zero_confirmed";

ALTER TABLE "guests"
  DROP COLUMN "checked_in_at",
  DROP COLUMN "confirmed_count",
  DROP COLUMN "darees_attendance",
  DROP COLUMN "invited_count",
  DROP COLUMN "rsvp_received_at",
  DROP COLUMN "rsvp_status";

ALTER TABLE "events" DROP COLUMN "darees_time", DROP COLUMN "engagement_time";

DROP TYPE "DareesAttendance";

-- ------------------------------------------- constraints on the new tables

ALTER TABLE "guest_invitations"
  ADD CONSTRAINT "guest_invitations_invited_count_positive"
  CHECK ("invited_count" >= 1 AND "invited_count" <= 500);

ALTER TABLE "guest_invitations"
  ADD CONSTRAINT "guest_invitations_confirmed_count_valid"
  CHECK ("confirmed_count" >= 0 AND "confirmed_count" <= "invited_count");

ALTER TABLE "guest_invitations"
  ADD CONSTRAINT "guest_invitations_not_attending_has_zero_confirmed"
  CHECK ("rsvp_status" <> 'NOT_ATTENDING' OR "confirmed_count" = 0);

ALTER TABLE "event_functions"
  ADD CONSTRAINT "event_functions_name_not_blank" CHECK (length(btrim("name")) > 0);
