-- Create the missing update_user_coords function
-- This function updates a user's location and geo_coords (PostGIS geometry)
-- Used by profile actions and onboarding to store user location data

CREATE OR REPLACE FUNCTION "public"."update_user_coords"(
    "p_user_id" "uuid",
    "p_lat" double precision,
    "p_lng" double precision,
    "p_location" "text" DEFAULT NULL
) RETURNS void LANGUAGE "plpgsql" SECURITY DEFINER AS $$
BEGIN
  -- Update geo_coords always, location only if provided
  IF p_location IS NOT NULL THEN
    UPDATE users
    SET
      geo_coords = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
      location = p_location,
      updated_at = NOW()
    WHERE id = p_user_id;
  ELSE
    UPDATE users
    SET
      geo_coords = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326),
      updated_at = NOW()
    WHERE id = p_user_id;
  END IF;
END;
$$;
