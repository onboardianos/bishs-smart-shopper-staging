import type { ReactNode } from 'react';
export function Modal({ id, open, onDismiss, labelledBy, children }: { id: string; open: boolean; onDismiss: () => void; labelledBy?: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="v1-modal-back" id={`${id}-back`} onClick={onDismiss}>
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} id={id} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
