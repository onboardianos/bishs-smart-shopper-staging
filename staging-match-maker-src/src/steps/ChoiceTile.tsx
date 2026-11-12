import type { ReactNode } from 'react';
import { Icon } from '@v1/components/Icon';

// DS ChoiceTile (onboardianos/bishs-design-system @63d64d5 · ui_kits/floor/ChoiceTile.jsx), same anatomy and states,
// re-expressed on DS tokens instead of the kit's inline hex. Unselected: hairline border. Selected: 2px ink border + ink check.
// Never gold: selection is state, not a COMMIT.
export function ChoiceTile({ id, specId, label, hint, image, art, fit = 'contain', selected, multi, disabled, onClick }: {
  id: string; specId: string; label: string; hint?: string; image?: string; art?: ReactNode; fit?: 'contain' | 'cover';
  selected?: boolean; multi?: boolean; disabled?: boolean; onClick?: () => void;
}) {
  return (
    <div className={`ct${selected ? ' ct-sel' : ''}${disabled ? ' ct-off' : ''}`} id={`${id}-wrap`} data-bos-type="choice-tile">
      <button type="button" id={id} data-spec-id={specId} data-bos-class="input" data-bos-perm="discovery.navigate" data-bos-access={disabled ? 'read' : 'act'}
        role={multi ? 'checkbox' : 'radio'} aria-checked={!!selected} aria-disabled={disabled || undefined} disabled={disabled} onClick={disabled ? undefined : onClick} className="ct-btn">
        <span className={`ct-media ct-${fit}`} id={`${id}-media`} aria-hidden="true">
          {image ? <img src={image} alt="" id={`${id}-img`} draggable={false} /> : art}
        </span>
        <span className="ct-text" id={`${id}-text`}>
          <span className="ct-label" id={`${id}-label`}>{label}</span>
          {hint ? <span className="ct-hint" id={`${id}-hint`} data-spec-id={`metric-${specId.replace(/^input-choice-tile-/, '')}`}>{hint}</span> : <span className="ct-pad" />}
        </span>
      </button>
      {selected && <span className="ct-check" id={`${id}-check`} aria-hidden="true"><Icon name="check" size={14} stroke={3} /></span>}
    </div>
  );
}
