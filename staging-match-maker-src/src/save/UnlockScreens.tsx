import { useState } from 'react';
import { loadProfile } from './profile';
import { savePhaseFromUrl, type SavePhase } from './SaveFlow';
import { V5Save } from './v5save';
import './welcome.css';

/** ZIP + email gate, 6-digit code, and save-link confirm — no match inventory on this screen. */
export function UnlockScreens() {
  const [phase, setPhase] = useState<SavePhase>(() => {
    const raw = savePhaseFromUrl();
    if (raw === 'save' || raw === 'save-error' || raw === 'save-network-error' || raw === 'save-ip' || raw === 'save-ip-failed' || raw === 'save-zip-invalid' || raw === 'save-zip-state' || raw === 'save-tie') {
      return 'unlock';
    }
    return raw || 'unlock';
  });
  const profile = loadProfile();
  return (
    <div className="ss-unlock-shell" data-spec-id="screen-unlock-matches">
      <V5Save phase={phase || 'unlock'} pins={profile?.pins || []} saved={profile?.saved || []} onPhase={setPhase} />
    </div>
  );
}
