// Preferred-store select shared by Save Progress and Book a visit.
import { useEffect, useState } from 'react';
import { loadZips } from '../steps/inventory';
import {
  SAVE_STORES, SHORT_STORES, STORE_STATES, loadStepZip, pickerModeFor, storesInState,
  type NearStore, type PickerMode,
} from './stores';

export function StorePicker({ id, value, onChange, optPrefix }: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  optPrefix: string;
}) {
  const zip = loadStepZip();
  const book = id === 'sp-book-store';
  const [all, setAll] = useState(false);
  const [stateCode, setStateCode] = useState('');
  const [mode, setMode] = useState<PickerMode | null>(() => (zip.trim() ? null : pickerModeFor('', null)));

  useEffect(() => {
    let live = true;
    setAll(false);
    setStateCode('');
    if (!zip.trim()) {
      setMode(pickerModeFor('', null));
      return () => { live = false; };
    }
    setMode(null);
    loadZips().then((table) => { if (live) setMode(pickerModeFor(zip, table)); });
    return () => { live = false; };
  }, [zip]);

  const hintId = `${id}-zip-hint`;
  const invalid = mode?.kind === 'invalid';
  const stateStores = invalid && stateCode ? storesInState(stateCode) : [];
  const stateName = STORE_STATES.find((s) => s.code === stateCode)?.name || '';
  const shortStores: NearStore[] = mode?.kind === 'zip' || mode?.kind === 'ip'
    ? mode.stores
    : mode?.kind === 'ip-fallback'
      ? []
      : stateStores;
  const fallbackStores = mode?.kind === 'ip-fallback' ? SHORT_STORES : [];
  const listed = all ? SAVE_STORES : (mode?.kind === 'ip-fallback' ? fallbackStores : shortStores);
  const waitingForState = !!invalid && !stateCode && !all;
  const shown = listed.some((s) => s.code === value) ? value : '';
  const tie = !all && mode?.kind === 'zip' && mode.tie;
  const ipFallback = !all && mode?.kind === 'ip-fallback';

  useEffect(() => {
    if (!mode || mode.kind === 'invalid' || mode.kind === 'ip-fallback' || !value || all) return;
    if (!mode.stores.some((s) => s.code === value)) setAll(true);
  }, [mode, value, all]);

  return (
    <>
      {invalid && (
        <div className="sp-field" id={`${id}-state-wrap`} data-spec-id={book ? 'sec-store-state-book' : 'sec-store-state'}>
          <label className="sp-label" id={`${id}-state-l`} htmlFor={`${id}-state`}>State</label>
          <select
            className="sp-ctrl"
            id={`${id}-state`}
            data-spec-id={book ? 'input-store-state-book' : 'input-store-state'}
            data-bos-class="input"
            value={stateCode}
            onChange={(e) => { setStateCode(e.target.value); setAll(false); }}
          >
            <option value="">Choose a state</option>
            {STORE_STATES.map((s) => (
              <option key={s.code} id={`${id}-state-opt-${s.code.toLowerCase()}`} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      <select
        className="sp-ctrl"
        id={id}
        data-spec-id={book ? 'input-book-store' : 'input-save-store'}
        data-bos-class="input"
        data-store-list={!mode ? 'pending' : all ? 'all' : mode.kind === 'zip' ? 'nearest-by-zip' : mode.kind === 'ip' ? 'nearest-by-ip' : mode.kind === 'ip-fallback' ? 'ip-fallback' : 'by-state'}
        data-zip={mode?.kind === 'zip' || mode?.kind === 'invalid' ? mode.zip : undefined}
        aria-describedby={mode ? hintId : undefined}
        disabled={waitingForState}
        value={waitingForState ? '' : shown}
        onChange={(e) => {
          if (e.target.value === '__all__') { setAll(true); return; }
          onChange(e.target.value);
        }}
      >
        <option value="">{waitingForState ? 'Choose a state first' : 'Choose a store'}</option>
        {listed.map((s) => (
          <option key={s.code} id={`${optPrefix}${s.code.toLowerCase()}`} value={s.code} data-miles={s.miles != null ? s.miles.toFixed(2) : undefined}>{s.label}</option>
        ))}
        {!all && !waitingForState && <option value="__all__">Show all stores</option>}
      </select>
      {mode?.kind === 'zip' && !all && (
        <p className="sp-hint" id={hintId} data-spec-id={book ? 'info-store-zip-hint-book' : 'info-store-zip-hint'} role="status">
          Closest {mode.stores.length} to ZIP <span id={`${id}-zip`}>{mode.zip}</span> from step 1: {mode.stores.map((s) => s.label.split(',')[0]).join(', ')}.
          {mode.tie ? ' The 3rd and 4th are within 5 miles of each other.' : ''} Straight-line miles.
        </p>
      )}
      {mode?.kind === 'ip' && !all && (
        <p className="sp-hint" id={hintId} role="status">No ZIP yet, so these are the stores closest to your area, based on your approximate location. Straight-line miles.</p>
      )}
      {invalid && (
        <p className="sp-hint is-warn" id={hintId} data-spec-id={book ? 'info-store-zip-hint-book' : 'info-store-zip-hint'} role="status">
          We couldn't find ZIP <span id={`${id}-zip`}>{mode.zip}</span>. {stateName ? `Showing stores in ${stateName}.` : 'Choose your state to see its stores.'}
        </p>
      )}
      {ipFallback && (
        <p className="sp-hint" id={hintId} role="status">No ZIP yet, so this is the fixed short list: Meridian, Twin Falls, Idaho Falls, Salt Lake.</p>
      )}
      {ipFallback && (
        <p className="sp-nr" data-needs-rule="Q28" data-spec-id={book ? 'info-needs-rule#ip-provider-book' : 'info-needs-rule#ip-provider'}>
          Placeholder · needs-rule Q28 · IP geolocation provider (backend)
        </p>
      )}
      {tie && (
        <p className="sp-nr" data-needs-rule="Q27" data-spec-id={book ? 'info-needs-rule#tie-book' : 'info-needs-rule#tie'}>
          Placeholder · needs-rule Q27 · 4th store shown when it is within 5 mi of the 3rd. Not confirmed.
        </p>
      )}
    </>
  );
}
