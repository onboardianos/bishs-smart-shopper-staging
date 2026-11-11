import type { ReactNode } from 'react';
export type NavGroup = { label: string; items: { id: string; label: string; icon: string }[] };
export function AppShell({ children, storeLabel }: { children: ReactNode; session?: unknown; groups?: NavGroup[]; current?: string; storeLabel?: string; onNav?: () => void; onSignOut?: () => void; onSearch?: () => void }) {
  return (
    <div className="v1-shell" data-spec-id="frame-app-shell" data-bos-level="frame">
      <header className="v1-shell-bar" data-spec-id="sec-header" data-bos-level="shell">
        <img src="vendor/logo-bishs-os.png" alt="Bish's OS" />
        <span>Smart Shopper</span>
        <span className="v1-store">{storeLabel || 'All locations'}</span>
      </header>
      {children}
    </div>
  );
}
