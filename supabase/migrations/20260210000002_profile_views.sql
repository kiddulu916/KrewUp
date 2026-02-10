-- Profile Views for Role-Based Data Access
-- These views automatically join users with their role-specific tables

-- 1. Worker Profile View
CREATE OR REPLACE VIEW worker_profiles AS
SELECT
  u.id, u.first_name, u.last_name, u.email, u.phone,
  u.role, u.employer_type, u.location, u.geo_coords,
  u.bio, u.profile_image_url, u.subscription_status,
  u.is_admin, u.is_lifetime_pro, u.created_at, u.updated_at,
  w.trade, w.sub_trade, w.years_of_experience, w.hourly_rate,
  w.union_status, w.trade_skills, w.has_tools, w.tools_owned,
  w.has_certifications, w.has_portfolio,
  w.has_dl, w.dl_class, w.reliable_transportation, w.authorized_to_work,
  w.emergency_contact_name, w.emergency_contact_phone, w.emergency_contact_relationship
FROM users u
JOIN workers w ON w.user_id = u.id
WHERE u.role = 'worker';

-- 2. Contractor Profile View
CREATE OR REPLACE VIEW contractor_profiles AS
SELECT
  u.id, u.first_name, u.last_name, u.email, u.phone,
  u.role, u.employer_type, u.location, u.geo_coords,
  u.bio, u.profile_image_url, u.subscription_status,
  u.is_admin, u.is_lifetime_pro, u.created_at, u.updated_at,
  c.company_name, c.website, c.has_cl
FROM users u
JOIN contractors c ON c.user_id = u.id
WHERE u.role = 'employer' AND u.employer_type = 'contractor';

-- 3. Developer Profile View
CREATE OR REPLACE VIEW developer_profiles AS
SELECT
  u.id, u.first_name, u.last_name, u.email, u.phone,
  u.role, u.employer_type, u.location, u.geo_coords,
  u.bio, u.profile_image_url, u.subscription_status,
  u.is_admin, u.is_lifetime_pro, u.created_at, u.updated_at,
  d.company_name, d.website
FROM users u
JOIN developers d ON d.user_id = u.id
WHERE u.role = 'employer' AND u.employer_type = 'developer';

-- 4. Recruiter Profile View
CREATE OR REPLACE VIEW recruiter_profiles AS
SELECT
  u.id, u.first_name, u.last_name, u.email, u.phone,
  u.role, u.employer_type, u.location, u.geo_coords,
  u.bio, u.profile_image_url, u.subscription_status,
  u.is_admin, u.is_lifetime_pro, u.created_at, u.updated_at,
  r.company_name, r.agency_website
FROM users u
JOIN recruiters r ON r.user_id = u.id
WHERE u.role = 'employer' AND u.employer_type = 'recruiter';

-- 5. Homeowner Profile View
CREATE OR REPLACE VIEW homeowner_profiles AS
SELECT
  u.id, u.first_name, u.last_name, u.email, u.phone,
  u.role, u.employer_type, u.location, u.geo_coords,
  u.bio, u.profile_image_url, u.subscription_status,
  u.is_admin, u.is_lifetime_pro, u.created_at, u.updated_at,
  h.project_description
FROM users u
JOIN home_owners h ON h.user_id = u.id
WHERE u.role = 'employer' AND u.employer_type = 'homeowner';

-- Grant access to authenticated users (views inherit RLS from base tables)
GRANT SELECT ON worker_profiles TO authenticated;
GRANT SELECT ON contractor_profiles TO authenticated;
GRANT SELECT ON developer_profiles TO authenticated;
GRANT SELECT ON recruiter_profiles TO authenticated;
GRANT SELECT ON homeowner_profiles TO authenticated;
