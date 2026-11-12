// v5 blocks. Real DS components from the pinned bundle. Custom blocks are only the ones the DS does not have.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LUCIDE } from '../v1/components/lucide';
import { Icon } from '../v1/components/Icon';

export function ds(): any {
  return (window as unknown as { BishSRVDesignSystem_26feec: any }).BishSRVDesignSystem_26feec;
}

export function slug(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const EXTRA: Record<string, string> = {
  'circle-alert': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'wifi-off': '<path d="M12 20h.01"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><path d="M5 12.859a10 10 0 0 1 5.17-2.69"/><path d="M19 12.859a10 10 0 0 0-2.007-1.523"/><path d="M2 8.82a15 15 0 0 1 4.177-2.643"/><path d="M22 8.82a15 15 0 0 0-11.288-3.764"/><path d="m2 2 20 20"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  'folder-open': '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>',
};

export function VIcon({ name, size = 20 }: { name: string; size?: number }) {
  const html = LUCIDE[name] || EXTRA[name];
  if (!html) return <Icon name={name} size={size} />;
  return (
    <svg data-lucide={name} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: `0 0 ${size}px`, display: 'block' }} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function Attrs({ set, sel = 'button,input,select,textarea,a', children }: { set: Record<string, string | null | false | undefined>; sel?: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current?.querySelector(sel);
    if (!el) return;
    Object.entries(set).forEach(([k, v]) => {
      if (v == null || v === false) el.removeAttribute(k);
      else el.setAttribute(k, v === true ? '' : String(v));
    });
  });
  return <span ref={ref} className="ss-contents">{children}</span>;
}

const TAG = {
  rule: ['warning', 'Placeholder · needs-rule'],
  pdb: ['info', 'Per Design Bot · unconfirmed'],
  interp: ['neutral', 'Interpretation'],
  zach: ['success', 'Zach · confirmed'],
  sample: ['neutral', 'Sample'],
} as const;

export function reviewMode() {
  try {
    if (new URLSearchParams(location.search).get('review') === '1') return true;
    return localStorage.getItem('ss-review') === '1';
  } catch { return false; }
}

export function Tag({ kind = 'rule', q, id, children }: { kind?: keyof typeof TAG; q?: string; id: string; children?: ReactNode }) {
  const draft = kind === 'rule' || kind === 'pdb' || kind === 'interp';
  if (draft && !reviewMode()) return null;
  const [type, lead] = TAG[kind];
  const attr = kind === 'rule' ? { 'data-needs-rule': q } : kind === 'pdb' ? { 'data-per-designbot': q } : kind === 'interp' ? { 'data-interpretation': q } : {};
  const pre = kind === 'rule' ? 'info-needs-rule' : kind === 'pdb' ? 'info-per-designbot' : kind === 'interp' ? 'info-interpretation' : kind === 'zach' ? 'info-zach-ruling' : 'info-sample';
  const NS = ds();
  return (
    <span className="ss-tag" {...attr}>
      <NS.Badge type={type} theme="light" specId={`${pre}#${id}`}>{lead}{q ? ` · ${q}` : ''}{children ? ` · ${children}` : ''}</NS.Badge>
    </span>
  );
}

export function Commit({ specId, perm, access = 'act', target, reason, disabled, onClick, children }: {
  specId: string; perm?: string; access?: string; target?: string; reason?: string; disabled?: boolean; onClick?: () => void; children: ReactNode;
}) {
  const NS = ds();
  return (
    <Attrs set={{ type: 'button', 'data-bos-perm': perm || null, 'data-bos-access': perm ? access : null, 'data-perm-status': perm ? 'needs-rule Q13' : null, 'data-bos-target': target || null, 'aria-describedby': disabled && reason ? reason : null }}>
      <NS.Button variant="primary" size="lg" theme="light" specId={specId} disabled={disabled} onClick={onClick}>{children}</NS.Button>
    </Attrs>
  );
}

export function Action({ specId, perm, target, quiet, pressed, label, onClick, dark, children }: {
  specId: string; perm?: string; target?: string; quiet?: boolean; pressed?: boolean; label?: string; onClick?: () => void; dark?: boolean; children: ReactNode;
}) {
  const NS = ds();
  return (
    <Attrs set={{ type: 'button', 'data-bos-perm': perm || null, 'data-bos-access': perm ? 'act' : null, 'data-perm-status': perm ? 'needs-rule Q13' : null, 'data-bos-target': target || null, 'aria-pressed': pressed == null ? null : String(pressed), 'aria-label': label || null }}>
      <NS.Button variant={quiet ? 'ghost' : 'secondary'} size="lg" theme={dark ? 'dark' : 'light'} specId={specId} onClick={onClick}>{children}</NS.Button>
    </Attrs>
  );
}

export function IconButton({ specId, label, icon, onClick }: { specId: string; label: string; icon: string; onClick?: () => void }) {
  return (
    <button type="button" className="ss-icon-btn" data-spec-id={specId} data-bos-class="action" aria-label={label} onClick={onClick}>
      <VIcon name={icon} size={20} />
    </button>
  );
}

export function Field({ id, label, value, onChange, error, helper, type = 'text', autoComplete, inputMode, maxLength, required, placeholder, ariaLabel }: {
  id: string; label: string; value: string; onChange: (v: string) => void; error?: string | null; helper?: string; type?: string; autoComplete?: string; inputMode?: string; maxLength?: number; required?: boolean; placeholder?: string; ariaLabel?: string;
}) {
  const NS = ds();
  const msg = error || helper ? `${id}-msg` : null;
  return (
    <div className="ss-field" data-field={id}>
      <Attrs sel="input" set={{ id, type, autocomplete: autoComplete || null, inputmode: inputMode || null, maxlength: maxLength != null ? String(maxLength) : null, 'aria-label': ariaLabel || label, 'aria-invalid': error ? 'true' : null, 'aria-describedby': msg, 'aria-required': required ? 'true' : null, 'data-bos-class': 'input' }}>
        <NS.Input theme="light" label={label} value={value} onChange={onChange} error={error || undefined} helper={helper} placeholder={placeholder} specId={`input-${slug(id)}`} />
      </Attrs>
    </div>
  );
}

export function SelectField({ id, label, optional, value, onChange, options, group, disabled, placeholder = 'Choose…', hint, warn, children }: {
  id: string; label: string; optional?: boolean; value: string; onChange: (v: string) => void; options: { code: string; label: string; miles?: number }[]; group?: string; disabled?: boolean; placeholder?: string; hint?: string; warn?: boolean; children?: ReactNode;
}) {
  return (
    <div className="ss-field">
      <label className="ss-label" htmlFor={id}>{label}{optional && <span className="ss-opt"> (optional)</span>}</label>
      <select id={id} className="ss-select" data-spec-id={`input-${slug(id)}`} data-bos-class="input" value={value} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {group ? <optgroup label={group}>{options.map((o) => <option key={o.code} value={o.code} data-miles={o.miles != null ? o.miles.toFixed(2) : undefined}>{o.label}</option>)}</optgroup> : options.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
      </select>
      {hint && <p id={`${id}-hint`} className={`ss-hint${warn ? ' is-warn' : ''}`} data-spec-id={`info-${slug(id)}-hint`}>{warn && <VIcon name="circle-alert" size={16} />}<span>{hint}</span></p>}
      {children}
    </div>
  );
}

export function CheckField({ id, checked, onChange, error, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; error?: string | null; children: ReactNode }) {
  return (
    <div className="ss-field">
      <label className={`ss-check${error ? ' is-error' : ''}`} htmlFor={id}>
        <input id={id} type="checkbox" data-spec-id={`input-${slug(id)}`} data-bos-class="input" checked={checked} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? `${id}-msg` : undefined} onChange={(e) => onChange(e.target.checked)} />
        <span>{children}</span>
      </label>
      {error && <p id={`${id}-msg`} className="ss-err" data-spec-id={`info-${slug(id)}-error`}>{error}</p>}
    </div>
  );
}

export function Dialog({ frame, overline, title, onClose, closeLabel = 'Close', children, bar, busy, tone }: {
  frame: string; overline?: string; title: string; onClose?: () => void; closeLabel?: string; children: ReactNode; bar?: ReactNode; busy?: boolean; tone?: string;
}) {
  const tid = `${frame}-title`;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('sp-lock');
    const el = ref.current?.querySelector('h2');
    if (el instanceof HTMLElement) el.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && onClose) onClose(); };
    addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      document.body.classList.remove('sp-lock');
      removeEventListener('keydown', onKey);
    };
  }, [frame, onClose]);
  const node = (
    <div className="ss-app ss-modal-root">
      <div className="ss-modal">
        <div className="ss-scrim" aria-hidden="true" onClick={onClose} />
        <section ref={ref} role={tone === 'alert' ? 'alertdialog' : 'dialog'} aria-modal="true" aria-labelledby={tid} aria-busy={busy ? 'true' : undefined} className="ss-dialog" data-spec-id={frame} data-bos-level="frame">
          <header className="ss-dialog-head" data-spec-id={`sec-${frame.replace(/^frame-/, '')}-header`} data-bos-level="section" data-bos-section="S01" data-bos-type="header">
            <div className="ss-dialog-titles">
              {overline && <p className="ss-overline">{overline}</p>}
              <h2 id={tid} tabIndex={-1} className="ss-dialog-title">{title}</h2>
            </div>
            {onClose && <IconButton specId={`btn-action-close-${frame.replace(/^frame-/, '')}`} label={closeLabel} icon="x" onClick={onClose} />}
          </header>
          <div className="ss-dialog-body" data-spec-id={`sec-${frame.replace(/^frame-/, '')}-body`} data-bos-level="section" data-bos-section="S02" data-bos-type="content">{children}</div>
          {bar && <footer className="ss-dialog-bar" data-spec-id={`sec-${frame.replace(/^frame-/, '')}-action-bar`} data-bos-level="section" data-bos-section="S99" data-bos-type="action">{bar}</footer>}
        </section>
      </div>
    </div>
  );
  return createPortal(node, document.body);
}

export function Banner({ tone = 'danger', icon = 'circle-alert', specId, title, children, action }: {
  tone?: 'danger' | 'warning'; icon?: string; specId: string; title: string; children?: ReactNode; action?: ReactNode;
}) {
  return (
    <div className={`ss-banner tone-${tone}`} role={tone === 'danger' ? 'alert' : 'status'} data-spec-id={specId}>
      <span className="ss-banner-i"><VIcon name={icon} size={20} /></span>
      <div className="ss-banner-t"><p className="ss-banner-h">{title}</p>{children && <p className="ss-banner-b">{children}</p>}</div>
      {action}
    </div>
  );
}

export function Section({ id, sec, type = 'content', label, className = '', children }: {
  id: string; sec: string; type?: string; label: string; className?: string; children: ReactNode;
}) {
  return <section className={`ss-sec ${className}`} data-spec-id={id} data-bos-level="section" data-bos-section={sec} data-bos-type={type} aria-label={label}>{children}</section>;
}
