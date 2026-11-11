import { SiteHeader } from './SiteHeader';
// Kept for the existing call sites (landing s00, known-unit loading sl, matches sm): now the one shared header.
export function SiteBar({ prefix }: { prefix: string }) {
  return <SiteHeader prefix={prefix} current={prefix === 's00' ? 'landing' : undefined} />;
}
