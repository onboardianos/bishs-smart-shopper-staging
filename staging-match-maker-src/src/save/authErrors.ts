// Friendly messages for Auth and ss_save_progress failures. No raw server text in the UI.
export type SaveAuthCode =
  | 'expired'
  | 'invalid'
  | 'rate_limited'
  | 'locked'
  | 'network'
  | 'staff'
  | 'store'
  | 'missing_setup'
  | 'unknown';

export class SaveAuthError extends Error {
  code: SaveAuthCode;
  constructor(code: SaveAuthCode, message: string) {
    super(message);
    this.name = 'SaveAuthError';
    this.code = code;
  }
}

type AuthLike = { message?: string; code?: string; status?: number } | null | undefined;

function hay(err: AuthLike): { code: string; msg: string; status: number } {
  return {
    code: String(err?.code || '').toLowerCase(),
    msg: String(err?.message || '').toLowerCase(),
    status: Number(err?.status || 0),
  };
}

export function mapAuthError(err: AuthLike): SaveAuthError {
  const { code, msg, status } = hay(err);
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    status === 429 ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('email rate')
  ) {
    return new SaveAuthError(
      'rate_limited',
      "We've sent several codes already. Wait a minute, then try again.",
    );
  }
  if (code === 'otp_expired' || (msg.includes('expired') && !msg.includes('invalid'))) {
    return new SaveAuthError('expired', 'This code expired. Send a new one to keep going.');
  }
  if (
    code === 'otp_disabled' ||
    msg.includes('token has expired or is invalid') ||
    msg.includes('invalid') ||
    status === 403
  ) {
    return new SaveAuthError(
      'invalid',
      "That code doesn't match. Check the newest email from Bish's RV and try again.",
    );
  }
  if (msg.includes('failed to fetch') || msg.includes('network') || status >= 500) {
    return new SaveAuthError('network', "We couldn't reach the sign-in service. Check your connection and try again.");
  }
  return new SaveAuthError('unknown', "We couldn't verify that code. Try again, or send a new one.");
}

export function mapRpcError(err: AuthLike): SaveAuthError {
  const { msg } = hay(err);
  if (msg.includes('staff') || msg.includes('customer accounts')) {
    return new SaveAuthError('staff', "This email is a staff account, so it can't save shopper progress. Use a personal email.");
  }
  if (msg.includes('store')) {
    return new SaveAuthError('store', 'Choose a preferred store, then try again.');
  }
  if (msg.includes('consent')) {
    return new SaveAuthError('unknown', 'Check the box so we can send your sign-in code, then try again.');
  }
  return new SaveAuthError('unknown', "Your sign-in worked, but we couldn't save this search. Try again in a moment.");
}

export function asSaveAuthError(err: unknown): SaveAuthError {
  if (err instanceof SaveAuthError) return err;
  if (err && typeof err === 'object') return mapAuthError(err as AuthLike);
  return new SaveAuthError('unknown', "Something went wrong. Try again in a moment.");
}
