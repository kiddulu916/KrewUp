-- Unified Credentials table for both certifications (workers) and licenses (contractors)
-- This provides a single table with a photo-first verification workflow

CREATE TABLE "public"."credentials" (
    "id" "uuid" DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id" "uuid" NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
    "credential_type" "text" NOT NULL CHECK (credential_type IN ('certification', 'license')),

    -- Required field - photo must be uploaded first
    "image_url" "text" NOT NULL,

    -- Common optional fields
    "holder_name" "text",
    "issue_date" "date",
    "expiration_date" "date",

    -- Certification-specific fields (nullable, used when credential_type = 'certification')
    "certification_name" "text",
    "issuing_organization" "text",
    "credential_id" "text",

    -- License-specific fields (nullable, used when credential_type = 'license')
    "license_number" "text",
    "classification" "text",
    "issuing_state" "text",
    "licensee_name" "text",

    -- Verification workflow
    "verification_status" "text" DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    "rejection_reason" "text",

    -- Timestamps
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Performance indexes
CREATE INDEX "idx_credentials_user" ON "public"."credentials" ("user_id");
CREATE INDEX "idx_credentials_type" ON "public"."credentials" ("credential_type");
CREATE INDEX "idx_credentials_status" ON "public"."credentials" ("verification_status");

-- Enable Row Level Security
ALTER TABLE "public"."credentials" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Credentials are publicly readable (for profile viewing)
CREATE POLICY "Credentials viewable by everyone" ON "public"."credentials" FOR SELECT USING (true);

-- Users can manage their own credentials
CREATE POLICY "Users insert own credentials" ON "public"."credentials" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own credentials" ON "public"."credentials" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own credentials" ON "public"."credentials" FOR DELETE USING (auth.uid() = user_id);

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on row updates
CREATE TRIGGER trigger_credentials_updated_at
    BEFORE UPDATE ON "public"."credentials"
    FOR EACH ROW
    EXECUTE FUNCTION update_credentials_updated_at();

-- Add table comment
COMMENT ON TABLE "public"."credentials" IS 'Unified table for worker certifications and contractor licenses with photo-first verification workflow';
