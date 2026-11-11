import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';

// Questions used the Bish's OS customer AppShell (a different header from the landing and results).
// Now every Smart Shopper screen uses the same public Bish's RV header (SiteHeader). `store` stays in the signature for callers.
export function CustomerShell({ children }: { store?: string; children: ReactNode }) {
  return (
    <div className="ss-frame" id="ss-frame" data-spec-id="frame-smart-shopper" data-bos-level="frame">
      <SiteHeader prefix="sq" />
      {children}
    </div>
  );
}
