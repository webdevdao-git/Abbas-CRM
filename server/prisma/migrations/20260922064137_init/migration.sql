-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('PENDING', 'CONFIRMED', 'NOT_ATTENDING');

-- CreateEnum
CREATE TYPE "DareesAttendance" AS ENUM ('NOT_SPECIFIED', 'YES', 'NO');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('NOT_SENT', 'SENT');

-- CreateEnum
CREATE TYPE "TemplateKey" AS ENUM ('INVITATION', 'REMINDER', 'CONFIRMATION');

-- CreateEnum
CREATE TYPE "ResponseSource" AS ENUM ('MANUAL', 'WHATSAPP_API', 'IMPORT');

-- CreateEnum
CREATE TYPE "InvitationChannel" AS ENUM ('CLICK_TO_CHAT', 'WHATSAPP_API');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "venue" TEXT,
    "engagement_time" TEXT,
    "darees_time" TEXT,
    "description" TEXT,
    "host_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "family_name" TEXT,
    "invited_count" INTEGER NOT NULL DEFAULT 1,
    "confirmed_count" INTEGER NOT NULL DEFAULT 0,
    "rsvp_status" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "darees_attendance" "DareesAttendance" NOT NULL DEFAULT 'NOT_SPECIFIED',
    "invitation_status" "InvitationStatus" NOT NULL DEFAULT 'NOT_SENT',
    "invitation_sent_at" TIMESTAMP(3),
    "rsvp_received_at" TIMESTAMP(3),
    "last_reminder_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rsvp_responses" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "status" "RsvpStatus" NOT NULL,
    "confirmed_count" INTEGER,
    "darees_attendance" "DareesAttendance",
    "source" "ResponseSource" NOT NULL DEFAULT 'MANUAL',
    "raw_message" TEXT,
    "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rsvp_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "key" "TemplateKey" NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_logs" (
    "id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "template_key" "TemplateKey" NOT NULL,
    "channel" "InvitationChannel" NOT NULL DEFAULT 'CLICK_TO_CHAT',
    "message_snapshot" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE INDEX "events_is_active_idx" ON "events"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "guests_code_key" ON "guests"("code");

-- CreateIndex
CREATE INDEX "guests_name_idx" ON "guests"("name");

-- CreateIndex
CREATE INDEX "guests_phone_idx" ON "guests"("phone");

-- CreateIndex
CREATE INDEX "guests_family_name_idx" ON "guests"("family_name");

-- CreateIndex
CREATE INDEX "guests_rsvp_status_idx" ON "guests"("rsvp_status");

-- CreateIndex
CREATE INDEX "guests_invitation_status_idx" ON "guests"("invitation_status");

-- CreateIndex
CREATE INDEX "guests_darees_attendance_idx" ON "guests"("darees_attendance");

-- CreateIndex
CREATE INDEX "guests_event_id_created_at_idx" ON "guests"("event_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "guests_event_id_phone_key" ON "guests"("event_id", "phone");

-- CreateIndex
CREATE INDEX "rsvp_responses_guest_id_responded_at_idx" ON "rsvp_responses"("guest_id", "responded_at");

-- CreateIndex
CREATE INDEX "rsvp_responses_source_idx" ON "rsvp_responses"("source");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_event_id_key_key" ON "message_templates"("event_id", "key");

-- CreateIndex
CREATE INDEX "invitation_logs_guest_id_sent_at_idx" ON "invitation_logs"("guest_id", "sent_at");

-- CreateIndex
CREATE INDEX "invitation_logs_template_key_idx" ON "invitation_logs"("template_key");

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rsvp_responses" ADD CONSTRAINT "rsvp_responses_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_logs" ADD CONSTRAINT "invitation_logs_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Data-integrity constraints
-- ---------------------------------------------------------------------------

-- A guest must be invited for at least one person, and no more than a sane max.
ALTER TABLE "guests"
  ADD CONSTRAINT "guests_invited_count_positive"
  CHECK ("invited_count" >= 1 AND "invited_count" <= 500);

-- Confirmed headcount can never be negative, nor exceed the number invited.
ALTER TABLE "guests"
  ADD CONSTRAINT "guests_confirmed_count_valid"
  CHECK ("confirmed_count" >= 0 AND "confirmed_count" <= "invited_count");

-- A guest who is not attending cannot contribute people to the headcount.
ALTER TABLE "guests"
  ADD CONSTRAINT "guests_not_attending_has_zero_confirmed"
  CHECK ("rsvp_status" <> 'NOT_ATTENDING' OR "confirmed_count" = 0);

-- Names and phone numbers are never blank.
ALTER TABLE "guests"
  ADD CONSTRAINT "guests_name_not_blank" CHECK (length(btrim("name")) > 0);
ALTER TABLE "guests"
  ADD CONSTRAINT "guests_phone_not_blank" CHECK (length(btrim("phone")) >= 7);

-- An RSVP response row never carries a negative headcount.
ALTER TABLE "rsvp_responses"
  ADD CONSTRAINT "rsvp_responses_confirmed_count_valid"
  CHECK ("confirmed_count" IS NULL OR "confirmed_count" >= 0);

-- Templates always carry a body.
ALTER TABLE "message_templates"
  ADD CONSTRAINT "message_templates_body_not_blank"
  CHECK (length(btrim("body")) > 0);

-- Case-insensitive search indexes for the guests table.
CREATE INDEX "guests_name_lower_idx" ON "guests" (lower("name"));
CREATE INDEX "guests_family_name_lower_idx" ON "guests" (lower("family_name"));

-- At most one active event.
CREATE UNIQUE INDEX "events_single_active_idx" ON "events" ("is_active") WHERE "is_active" = true;
