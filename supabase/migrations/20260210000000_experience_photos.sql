---- Experience Photos table for employers to upload project images
 Follows the same pattern as portfolio_images table

CREATE TABLE "public"."experience_photos" (
    "id" "uuid" DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    "experience_id" "uuid" NOT NULL REFERENCES "public"."experiences"("id") ON DELETE CASCADE,
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "image_url" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now()
);

-- Performance indexes
CREATE INDEX "idx_experience_photos_experience" ON "public"."experience_photos" ("experience_id");
CREATE INDEX "idx_experience_photos_user" ON "public"."experience_photos" ("user_id");

-- Enable Row Level Security
ALTER TABLE "public"."experience_photos" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Experience photos viewable by everyone" ON "public"."experience_photos" FOR SELECT USING (true);
CREATE POLICY "Users insert own experience photos" ON "public"."experience_photos" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own experience photos" ON "public"."experience_photos" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own experience photos" ON "public"."experience_photos" FOR DELETE USING (auth.uid() = user_id);
