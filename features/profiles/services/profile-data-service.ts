"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { ProfileViewName, FullProfile } from "../types";

function getProfileViewName(
  role: string,
  employerType?: string | null,
): ProfileViewName {
  if (role === "worker") return "worker_profiles";

  switch (employerType) {
    case "contractor":
      return "contractor_profiles";
    case "developer":
      return "developer_profiles";
    case "recruiter":
      return "recruiter_profiles";
    case "homeowner":
      return "homeowner_profiles";
    default:
      throw new Error(`Unknown employer type: ${employerType}`);
  }
}

export async function getFullProfile(
  userId: string,
): Promise<{ data: FullProfile | null; error: Error | null }> {
  const supabase = await createClient(await cookies());

  // First get basic user to determine role
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("role, employer_type")
    .eq("id", userId)
    .single();

  if (userError || !user) {
    return { data: null, error: userError };
  }

  const viewName = getProfileViewName(user.role, user.employer_type);

  const { data, error } = await supabase
    .from(viewName)
    .select("*")
    .eq("id", userId)
    .single();

  return { data: data as FullProfile | null, error };
}

export async function getProfileByRole(
  userId: string,
  role: string,
  employerType?: string | null,
): Promise<{ data: FullProfile | null; error: Error | null }> {
  const supabase = await createClient(await cookies());
  const viewName = getProfileViewName(role, employerType);

  const { data, error } = await supabase
    .from(viewName)
    .select("*")
    .eq("id", userId)
    .single();

  return { data: data as FullProfile | null, error };
}
