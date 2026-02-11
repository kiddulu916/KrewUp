import type { GeoCoords } from '@/types';

export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'developer' | 'homeowner' | 'recruiter' | null;
  location: string;
  geo_coords?: GeoCoords | null;
  bio?: string | null;
  profile_image_url?: string | null;
  subscription_status: 'free' | 'pro';
  is_admin: boolean;
  is_lifetime_pro: boolean;
  lifetime_pro_granted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = User & {
  // Joined fields from workers/contractors tables
  trade?: string | null;
  sub_trade?: string | null;
  company_name?: string | null;
  years_of_experience?: number | null;
  has_tools?: boolean;
  tools_owned?: string[] | null;
  skills?: string[] | null;
};

export type PortfolioImage = {
  id: string;
  user_id: string;
  image_url: string;
  description?: string | null;
  display_order: number;
  created_at: string;
};

// Work Experience - DB columns (component uses 'company' directly now)
export type WorkExperience = {
  id: string;
  user_id: string;
  company: string; // DB column
  job_title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  is_verified: boolean;
  endorsement_count: number;
  created_at: string;
};

// Education - DB columns
export type Education = {
  id: string;
  user_id: string;
  institution: string; // DB column
  degree?: string | null; // DB column
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

// Certification - DB columns + mapped fields for UI
export type Certification = {
  id: string;
  worker_id: string; // DB column
  name: string; // DB column
  issuing_organization: string;
  credential_id?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  image_url?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  // Mapped fields for UI
  certification_type?: string; // Mapped from 'name'
  credential_category?: 'license' | 'certification'; // UI categorization
};

// Unified Credential type (replaces separate Certification/License)
export type Credential = {
  id: string;
  user_id: string;
  credential_type: 'certification' | 'license';

  // Required field
  image_url: string;

  // Common optional fields
  holder_name?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;

  // Certification-specific
  certification_name?: string | null;
  issuing_organization?: string | null;
  credential_id?: string | null;

  // License-specific
  license_number?: string | null;
  classification?: string | null;
  issuing_state?: string | null;
  licensee_name?: string | null;

  // Verification
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;

  created_at: string;
  updated_at: string;
};

export type CredentialFormData = {
  credential_type: 'certification' | 'license';
  image_url: string;
  holder_name?: string;
  issue_date?: string;
  expiration_date?: string;
  // Certification fields
  certification_name?: string;
  issuing_organization?: string;
  credential_id?: string;
  // License fields
  license_number?: string;
  classification?: string;
  issuing_state?: string;
  licensee_name?: string;
};

export type Reference = {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at: string;
};

export type ExperiencePhoto = {
  id: string;
  experience_id: string;
  user_id: string;
  image_url: string;
  description?: string | null;
  display_order: number;
  created_at: string;
};

// Profile view types
export type ProfileViewName =
  | "worker_profiles"
  | "contractor_profiles"
  | "developer_profiles"
  | "recruiter_profiles"
  | "homeowner_profiles";

export type WorkerProfile = User & {
  trade: string | null;
  sub_trade: string | null;
  years_of_experience: number | null;
  hourly_rate: number | null;
  union_status: string | null;
  trade_skills: string[] | null;
  has_tools: boolean;
  tools_owned: string[] | null;
  has_certifications: boolean;
  has_portfolio: boolean;
  has_dl: boolean;
  dl_class: string | null;
  reliable_transportation: boolean;
  authorized_to_work: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

export type ContractorProfile = User & {
  company_name: string | null;
  website: string | null;
  has_cl: boolean;
};

export type DeveloperProfile = User & {
  company_name: string | null;
  website: string | null;
};

export type RecruiterProfile = User & {
  company_name: string | null;
  agency_website: string | null;
};

export type HomeownerProfile = User & {
  project_description: string | null;
};

export type FullProfile =
  | WorkerProfile
  | ContractorProfile
  | DeveloperProfile
  | RecruiterProfile
  | HomeownerProfile;
