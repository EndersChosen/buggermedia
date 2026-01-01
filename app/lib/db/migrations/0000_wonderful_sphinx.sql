DO $$ BEGIN
 CREATE TYPE "game_status" AS ENUM('processing', 'ready', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "upload_status" AS ENUM('started', 'pdf_parsed', 'ai_processing', 'awaiting_review', 'completed', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_generated_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_slug" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"min_players" integer NOT NULL,
	"max_players" integer NOT NULL,
	"status" "game_status" DEFAULT 'processing' NOT NULL,
	"pdf_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"generation_metadata" jsonb,
	CONSTRAINT "ai_generated_games_game_slug_unique" UNIQUE("game_slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"definition" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "game_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"rules" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "upload_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid,
	"upload_timestamp" timestamp DEFAULT now() NOT NULL,
	"status" "upload_status" DEFAULT 'started' NOT NULL,
	"error_message" text,
	"user_fingerprint" varchar(100),
	"generation_metadata" jsonb
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_definitions" ADD CONSTRAINT "game_definitions_game_id_ai_generated_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "ai_generated_games"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "game_rules" ADD CONSTRAINT "game_rules_game_id_ai_generated_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "ai_generated_games"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "upload_logs" ADD CONSTRAINT "upload_logs_game_id_ai_generated_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "ai_generated_games"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
