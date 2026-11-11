// Save Progress entry. The dialogs are the v5 frames; this file keeps the results-page button and the ?state= list.
import { Action, VIcon } from './v5ui';
import { V5Save } from './v5save';

export const SAVE_PHASES = [
  'save', 'save-error', 'save-loading', 'save-network-error', 'save-code', 'save-code-wrong', 'save-code-expired',
  'save-merge', 'save-success', 'save-ip', 'save-ip-failed', 'save-zip-invalid', 'save-zip-state', 'save-tie',
] as const;
export type SavePhase = '' | (typeof SAVE_PHASES)[number];

export function savePhaseFromUrl(): SavePhase {
  const q = new URLSearchParams(location.search);
  const raw = q.get('state') || q.get('save') || '';
  return (SAVE_PHASES as readonly string[]).includes(raw) ? (raw as SavePhase) : '';
}

export function SaveButton({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="sp-save-slot" data-spec-id="sec-save-progress-slot">
      <Action specId="btn-action-save-progress" perm="profile.create" target="frame-save-progress" onClick={onOpen}>
        <VIcon name="save" size={18} />
        Save Progress
      </Action>
    </div>
  );
}

export function SaveFlow({ phase, pins, saved, onPhase }: { phase: SavePhase; pins: string[]; saved: string[]; onPhase: (p: SavePhase) => void }) {
  return <V5Save phase={phase} pins={pins} saved={saved} onPhase={onPhase} />;
}
