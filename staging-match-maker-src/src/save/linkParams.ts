// Read scanner-safe magic-link params from the query or the hash. Never auto-verify these.
export type LinkParams = { tokenHash: string; type: string; state: string };

function fromSearch(raw: string): URLSearchParams {
  const s = raw.startsWith('?') || raw.startsWith('#') ? raw.slice(1) : raw;
  return new URLSearchParams(s);
}

export function parseLinkParams(search = '', hash = ''): LinkParams {
  const q = fromSearch(search);
  const h = fromSearch(hash);
  const tokenHash = q.get('token_hash') || h.get('token_hash') || '';
  const type = q.get('type') || h.get('type') || '';
  const state = q.get('state') || h.get('state') || '';
  return { tokenHash, type, state };
}

export function hasConfirmableLink(params: LinkParams): boolean {
  return Boolean(params.tokenHash && params.type);
}
