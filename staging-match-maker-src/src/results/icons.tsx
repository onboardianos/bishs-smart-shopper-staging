import type { ReactNode } from 'react';
type Props = { id: string; d?: string; size?: number; stroke?: number; children?: ReactNode; className?: string };
export function Svg({ id, d, size = 16, stroke = 1.5, children, className }: Props) {
  return (
    <svg id={id} className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d ? <path id={`${id}-p`} d={d} /> : children}
    </svg>
  );
}

export const I = {
  check: 'M20 6 9 17l-5-5',
  alert: 'M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  dollar: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  chevronLeft: 'm15 18-6-6 6-6',
  chevronRight: 'm9 18 6-6-6-6',
  bookmark: 'm19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z',
  chevronsLeft: 'm11 17-5-5 5-5 M18 17l-5-5 5-5',
  chevronsRight: 'm6 17 5-5-5-5 M13 17l5-5-5-5',
  minus: 'M5 12h14',
  plus: 'M12 5v14 M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z m9 2-3.5-3.5',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01',
  x: 'M18 6 6 18 M6 6l12 12',
  pin: 'M12 17v5 M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z',
  chevronDown: 'm6 9 6 6 6-6',
  sliders: 'M4 6h10 M18 6h2 M4 12h4 M12 12h8 M4 18h12 M20 18h0 M14 4v4 M8 10v4 M16 16v4',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  truck: 'M1 4h14v11H1z M15 8h4l3 3v4h-7 M5.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M18.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  mapPin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  bed: 'M2 18V6 M2 12h20v6 M22 18v-3 M6 12V9h5v3',
  ruler: 'M3 17 17 3l4 4L7 21z M7 13l2 2 M10 10l2 2 M13 7l2 2',
};

export function ListGlyph({ id }: { id: string }) {
  return (
    <svg id={id} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
      <path id={`${id}-1`} d="M8 6h13" /><path id={`${id}-2`} d="M8 12h13" /><path id={`${id}-3`} d="M8 18h13" />
      <path id={`${id}-4`} d="M3 6h.01" /><path id={`${id}-5`} d="M3 12h.01" /><path id={`${id}-6`} d="M3 18h.01" />
    </svg>
  );
}
export function GridGlyph({ id }: { id: string }) {
  return (
    <svg id={id} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" aria-hidden="true">
      <rect id={`${id}-1`} x="3" y="3" width="7" height="7" rx="1" />
      <rect id={`${id}-2`} x="14" y="3" width="7" height="7" rx="1" />
      <rect id={`${id}-3`} x="14" y="14" width="7" height="7" rx="1" />
      <rect id={`${id}-4`} x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function Grip({ id, size = 16 }: { id: string; size?: number }) {
  return (
    <svg id={id} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle id={`${id}-1`} cx="9" cy="6" r="1.5" />
      <circle id={`${id}-2`} cx="9" cy="12" r="1.5" />
      <circle id={`${id}-3`} cx="9" cy="18" r="1.5" />
      <circle id={`${id}-4`} cx="15" cy="6" r="1.5" />
      <circle id={`${id}-5`} cx="15" cy="12" r="1.5" />
      <circle id={`${id}-6`} cx="15" cy="18" r="1.5" />
    </svg>
  );
}
