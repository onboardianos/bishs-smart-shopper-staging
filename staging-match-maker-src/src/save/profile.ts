// Saved customer profile, kept in this browser only.
// submitCustomerProfile() in submitProfile.ts is the only writer. A real backend replaces that function.
import type { Answers } from '../answers';

export const PROFILE_KEY = 'ss-customer-profile-v1';

export type CustomerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  store: string;
  consent: boolean;
  answers: Answers;
  pins: string[];
  saved: string[];
  snapshotId: string;
  savedAt: string;
  verified: boolean;
};

export function loadProfile(): CustomerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomerProfile;
    if (!parsed || typeof parsed.email !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeProfile(profile: CustomerProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
