// features/profiles/constants/experience-labels.ts

export type UserType =
  | "worker"
  | "contractor"
  | "developer"
  | "recruiter"
  | "homeowner";

export type ExperienceLabels = {
  jobTitle: string;
  company: string;
  description: string;
  isCurrent: string;
  tabTitle: string;
  addButton: string;
  emptyState: string;
};

export const EXPERIENCE_FIELD_LABELS: Record<
  Exclude<UserType, "homeowner">,
  ExperienceLabels
> = {
  worker: {
    jobTitle: "Job Title",
    company: "Company",
    description: "Description",
    isCurrent: "I currently work here",
    tabTitle: "Work Experience",
    addButton: "Add Experience",
    emptyState: "No experiences added yet",
  },
  contractor: {
    jobTitle: "Project Name",
    company: "Client",
    description: "Project Details",
    isCurrent: "Ongoing project",
    tabTitle: "Projects",
    addButton: "Add Project",
    emptyState: "No projects added yet",
  },
  developer: {
    jobTitle: "Project Name",
    company: "Company",
    description: "Project Details",
    isCurrent: "Ongoing project",
    tabTitle: "Projects",
    addButton: "Add Project",
    emptyState: "No projects added yet",
  },
  recruiter: {
    jobTitle: "Role",
    company: "Agency",
    description: "Specialization",
    isCurrent: "I currently work here",
    tabTitle: "Experience",
    addButton: "Add Experience",
    emptyState: "No experiences added yet",
  },
};

/**
 * Get experience labels for a user based on their role and employer_type
 */
export function getExperienceLabels(
  role: "worker" | "employer",
  employerType?: "contractor" | "developer" | "recruiter" | "homeowner" | null,
): ExperienceLabels | null {
  if (role === "worker") {
    return EXPERIENCE_FIELD_LABELS.worker;
  }

  if (role === "employer") {
    // Homeowners don't have experience section
    if (employerType === "homeowner" || !employerType) {
      return null;
    }
    return EXPERIENCE_FIELD_LABELS[employerType];
  }

  return null;
}

/**
 * Check if a user type can have experiences
 */
export function canHaveExperiences(
  role: "worker" | "employer",
  employerType?: "contractor" | "developer" | "recruiter" | "homeowner" | null,
): boolean {
  if (role === "worker") return true;
  if (role === "employer" && employerType && employerType !== "homeowner")
    return true;
  return false;
}
