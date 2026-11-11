// Preferred-store select shared by Save Progress and Book a visit.
import { useEffect, useState } from 'react';
import { loadZips } from '../steps/inventory';
import { SAVE_STORES, loadStepZip, nearestStores, type NearStore } from './stores';

export function StorePicker({ id, value, onChange, optPrefix }: {
  id: string;
  value: string;
  onChange: (code: string) => void;
  optPrefix: string;
}) {
  const zip = loadStepZip();
  const [all, setAll] = useState(false);
  const [near, setNear] = useState<{ stores: NearStore[]; fallback: boolean; zip: string } | null>(() => (zip ? null : nearestStores('', null)));

  useEffect(() => {
    let live = true;
    loadZips().then((table) => { if (live) setNear(nearestStores(zip, table)); });
    return () => { live = false; };
  }, [zip]);

  useEffect(() => {
    if (!near || near.fallback || !value || all) return;
    if (!near.stores.some((s) => s.code === value)) setAll(true);
  }, [near, value, all]);

  const fallback = !all && !!near?.fallback;
  const stores = all ? SAVE_STORES : (near?.stores || []);
  const hintId = `${id}-zip-hint`;

  return (
    <>
      <select
        className="sp-ctrl"
        id={id}
        data-spec-id={id === 'sp-book-store' ? 'input-book-store' : 'input-save-store'}
        data-bos-class="input"
        data-store-list={all ? 'all' : !near ? 'pending' : near.fallback ? 'fallback' : 'top3-by-zip'}
        data-zip={near && !near.fallback ? near.zip : undefined}
        aria-describedby={near ? hintId : undefined}
        value={value}
        onChange={(e) => {
          if (e.target.value === '__all__') { setAll(true); return; }
          onChange(e.target.value);
        }}
      >
        <option value="">Choose a store</option>
        {stores.map((s) => (
          <option key={s.code} id={`${optPrefix}${s.code.toLowerCase()}`} value={s.code} data-miles={s.miles != null ? s.miles.toFixed(2) : undefined}>{s.label}</option>
        ))}
        {!all && <option value="__all__">Show all stores</option>}
      </select>
      {near && !near.fallback && !all && (
        <p className="sp-hint" id={hintId} data-spec-id={id === 'sp-book-store' ? 'info-store-zip-hint-book' : 'info-store-zip-hint'}>
          Closest 3 to ZIP <span id={`${id}-zip`}>{near.zip}</span> from step 1: {near.stores.map((s) => s.label.split(',')[0]).join(', ')}. Straight-line miles.
        </p>
      )}
      {fallback && (
        <p className="sp-nr" id={hintId} data-needs-rule="Q25" data-spec-id={id === 'sp-book-store' ? 'info-needs-rule#store-zip-cases-book' : 'info-needs-rule#store-zip-cases'}>
          Placeholder · needs-rule · no ZIP or an invalid ZIP, so this is the fixed short list
        </p>
      )}
    </>
  );
}
