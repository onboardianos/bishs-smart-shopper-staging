// The only place an IP location lookup may live. No provider is approved,
// so this returns null and does not call a geolocation service.
export type ApproxLocation = { lat: number; lon: number };

export function getApproxLocation(): ApproxLocation | null {
  return null;
}
