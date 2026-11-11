// STUB SUBMIT — the only place a customer profile is saved.
// There is no backend approval. This function must not call Supabase, fetch, or any API.
// Replace this function (and nothing else) when a real profile service exists.
import type { Answers } from '../answers';
import { snapshotMeta } from '../liveRank';
import { loadProfile, writeProfile, type CustomerProfile } from './profile';

export type ProfileDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  store: string;
  consent: boolean;
  answers: Answers;
  pins: string[];
  saved: string[];
};

export async function submitCustomerProfile(draft: ProfileDraft): Promise<CustomerProfile> {
  const profile: CustomerProfile = {
    ...draft,
    pins: [draft.pins[0] || '', draft.pins[1] || '', draft.pins[2] || ''],
    snapshotId: snapshotMeta().inventorySnapshotId,
    savedAt: new Date().toISOString(),
    verified: false,
  };
  writeProfile(profile);
  await new Promise((resolve) => setTimeout(resolve, 900));
  return profile;
}

/** Local stand-in for the sign-in code check. Any 4 digits pass. No message is sent. */
export function confirmSignInCode(code: string): boolean {
  if (!/^\d{4}$/.test(code)) return false;
  const profile = loadProfile();
  if (!profile) return false;
  profile.verified = true;
  writeProfile(profile);
  return true;
}
