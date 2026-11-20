// Real email OTP + ss_save_progress. The only writer of the customer profile.
import type { Answers } from '../answers';
import { findLiveUnit } from '../liveRank';
import { snapshotMeta } from '../liveRank';
import { loadProfile, writeProfile, type CustomerProfile } from './profile';
import { asSaveAuthError, mapAuthError, mapRpcError, SaveAuthError } from './authErrors';
import { APP_VERSION, SS_REDIRECT, answersToJson, picksPayload, savedPayload, stepsDone } from './savePayload';
import { markCodeSent } from './otpTiming';
import { getSupabase } from './supabaseClient';

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

export type SaveResult = {
  profile: CustomerProfile | null;
  merged: boolean;
  signedInOnly: boolean;
  caseId?: string;
};

function padPins(pins: string[]): [string, string, string] {
  return [pins[0] || '', pins[1] || '', pins[2] || ''];
}

function toProfile(draft: ProfileDraft, verified: boolean, extra: Partial<CustomerProfile> = {}): CustomerProfile {
  return {
    firstName: draft.firstName,
    lastName: draft.lastName,
    email: draft.email,
    phone: draft.phone,
    store: draft.store,
    consent: draft.consent,
    answers: draft.answers,
    pins: padPins(draft.pins),
    saved: draft.saved,
    snapshotId: snapshotMeta().inventorySnapshotId,
    savedAt: new Date().toISOString(),
    verified,
    ...extra,
  };
}

function requireStore(store: string) {
  if (!store.trim()) throw new SaveAuthError('store', 'Choose a preferred store, then try again.');
}

function unitOf(stock: string): Record<string, unknown> | null {
  const u = findLiveUnit(stock);
  return u ? { ...u } : null;
}

async function sendOtp(email: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: SS_REDIRECT },
  });
  if (error) throw mapAuthError(error);
  markCodeSent();
}

export async function submitCustomerProfile(draft: ProfileDraft): Promise<CustomerProfile> {
  requireStore(draft.store);
  if (!draft.consent) throw new SaveAuthError('unknown', 'Check the box so we can send your sign-in code.');
  const profile = toProfile(draft, false);
  writeProfile(profile);
  await sendOtp(draft.email.trim());
  return profile;
}

export async function resendSignInCode(email?: string): Promise<void> {
  const address = (email || loadProfile()?.email || '').trim();
  if (!address) throw new SaveAuthError('unknown', 'We need your email to send a new code.');
  await sendOtp(address);
}

export async function confirmSignInCode(code: string): Promise<SaveResult> {
  if (!/^\d{6}$/.test(code)) {
    throw new SaveAuthError('invalid', 'Enter all 6 digits to continue.');
  }
  const profile = loadProfile();
  if (!profile?.email) {
    throw new SaveAuthError('unknown', "We don't have a profile to verify. Start from Save Progress again.");
  }
  const supabase = getSupabase();
  const { error } = await supabase.auth.verifyOtp({ email: profile.email, token: code, type: 'email' });
  if (error) throw mapAuthError(error);
  return saveProgress(profile);
}

export async function confirmEmailLink(tokenHash: string, type: string): Promise<SaveResult> {
  if (!tokenHash || !type) {
    throw new SaveAuthError('invalid', 'This sign-in link is missing details. Request a new code.');
  }
  const supabase = getSupabase();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'email' | 'magiclink' | 'signup' });
  if (error) throw mapAuthError(error);
  const profile = loadProfile();
  if (!profile) {
    // 5A: another device with no local draft — session is set; land signed in without inventing answers.
    return { profile: null, merged: false, signedInOnly: true };
  }
  return saveProgress(profile);
}

export async function signOutShopper(): Promise<void> {
  try { await getSupabase().auth.signOut(); } catch { /* ignore */ }
}

async function saveProgress(draft: CustomerProfile): Promise<SaveResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('ss_save_progress', {
    p_first: draft.firstName,
    p_last: draft.lastName,
    p_phone: draft.phone || null,
    p_store: draft.store,
    p_consent: draft.consent,
    p_answers: answersToJson(draft.answers as unknown as Record<string, unknown>),
    p_picks: picksPayload(draft.pins, unitOf),
    p_saved: savedPayload(draft.saved, unitOf),
    p_snapshot_id: snapshotMeta().inventorySnapshotId,
    p_app_version: APP_VERSION,
    p_steps_done: stepsDone(draft.answers as unknown as Record<string, unknown>),
  });
  if (error) throw mapRpcError(error);
  const row = (data || {}) as { case_id?: string; merged?: boolean };
  const profile = { ...draft, verified: true, savedAt: new Date().toISOString() };
  writeProfile(profile);
  return { profile, merged: Boolean(row.merged), signedInOnly: false, caseId: row.case_id };
}

export { asSaveAuthError, SaveAuthError };
