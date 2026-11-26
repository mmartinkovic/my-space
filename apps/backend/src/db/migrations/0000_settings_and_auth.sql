CREATE TYPE "public"."auth_event_kind" AS ENUM('setup_completed', 'login_succeeded', 'login_failed', 'passkey_added', 'passkey_removed', 'recovery_code_used', 'recovery_codes_regenerated', 'session_revoked', 'ical_token_rotated');--> statement-breakpoint
CREATE TYPE "public"."challenge_kind" AS ENUM('registration', 'authentication');--> statement-breakpoint
CREATE TYPE "public"."client_kind" AS ENUM('web', 'native');--> statement-breakpoint
CREATE TYPE "public"."locale" AS ENUM('sk', 'en');--> statement-breakpoint
CREATE TYPE "public"."session_scope" AS ENUM('full', 'recovery');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"locale" "locale" DEFAULT 'sk' NOT NULL,
	"timezone" text DEFAULT 'Europe/Bratislava' NOT NULL,
	"brief_time" time DEFAULT '07:00' NOT NULL,
	"quiet_hours_start" time DEFAULT '22:00' NOT NULL,
	"quiet_hours_end" time DEFAULT '07:00' NOT NULL,
	"deadline_reminder_offsets_days" smallint[] DEFAULT '{3,1}' NOT NULL,
	"deadline_reminder_time" time DEFAULT '08:00' NOT NULL,
	"spoiler_auto_reveal_hours" smallint DEFAULT 24 NOT NULL,
	"big_match_extra_top_count" smallint DEFAULT 4 NOT NULL,
	"webauthn_user_handle" "bytea",
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_singleton_check" CHECK ("app_settings"."id" = 1),
	CONSTRAINT "app_settings_reminder_offsets_check" CHECK (cardinality("app_settings"."deadline_reminder_offsets_days") <= 5),
	CONSTRAINT "app_settings_auto_reveal_check" CHECK ("app_settings"."spoiler_auto_reveal_hours" > 0 AND "app_settings"."spoiler_auto_reveal_hours" <= 720),
	CONSTRAINT "app_settings_big_match_count_check" CHECK ("app_settings"."big_match_extra_top_count" BETWEEN 0 AND 10)
);
--> statement-breakpoint
CREATE TABLE "auth_event" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" "auth_event_kind" NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recovery_code" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"batch_id" uuid NOT NULL,
	"code_hash" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone,
	CONSTRAINT "recovery_code_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"scope" "session_scope" NOT NULL,
	"client_kind" "client_kind" DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"elevated_until" timestamp with time zone,
	"user_agent" text NOT NULL,
	"ip" "inet" NOT NULL,
	CONSTRAINT "session_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "session_expiry_check" CHECK ("session"."expires_at" > "session"."created_at"),
	CONSTRAINT "session_recovery_lifetime_check" CHECK ("session"."scope" <> 'recovery' OR "session"."expires_at" <= "session"."created_at" + interval '15 minutes')
);
--> statement-breakpoint
CREATE TABLE "webauthn_challenge" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"kind" "challenge_kind" NOT NULL,
	"challenge" "bytea" NOT NULL,
	"session_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webauthn_credential" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"credential_id" "bytea" NOT NULL,
	"public_key" "bytea" NOT NULL,
	"sign_count" bigint NOT NULL,
	"transports" text[] NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "webauthn_credential_credential_id_unique" UNIQUE("credential_id"),
	CONSTRAINT "webauthn_credential_sign_count_check" CHECK ("webauthn_credential"."sign_count" >= 0),
	CONSTRAINT "webauthn_credential_device_type_check" CHECK ("webauthn_credential"."device_type" IN ('singleDevice', 'multiDevice')),
	CONSTRAINT "webauthn_credential_nickname_check" CHECK (char_length("webauthn_credential"."nickname") BETWEEN 1 AND 60)
);
--> statement-breakpoint
ALTER TABLE "webauthn_challenge" ADD CONSTRAINT "webauthn_challenge_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_event_created_at_idx" ON "auth_event" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "recovery_code_unused_batch_idx" ON "recovery_code" USING btree ("batch_id") WHERE "recovery_code"."used_at" IS NULL;--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "webauthn_challenge_expires_at_idx" ON "webauthn_challenge" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "webauthn_challenge_session_id_idx" ON "webauthn_challenge" USING btree ("session_id");