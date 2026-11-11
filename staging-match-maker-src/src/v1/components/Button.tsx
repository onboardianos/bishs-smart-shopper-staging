import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Props = {
  kind?: 'commit' | 'action';
  size?: string;
  block?: boolean;
  trailingIcon?: string;
  className?: string;
  children?: ReactNode;
  perm?: string;
  id?: string;
  disabled?: boolean;
  onClick?: () => void;
  'data-spec-id'?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-disabled'?: boolean;
};
export function Button({ kind = 'action', size, block, trailingIcon, className = '', children, perm, ...rest }: Props) {
  const commit = kind === 'commit';
  const verb = perm === 'match.send' ? 'match.send' : commit ? 'discovery.advance' : 'discovery.navigate';
  return (
    <button
      {...rest}
      data-bos-perm={verb}
      data-bos-access="act"
      data-bos-class={commit ? 'commit' : 'action'}
      data-bos-level="component"
      className={`v1-btn v1-${kind} ${size === 'lg' ? 'btn-lg' : ''} ${block ? 'is-block' : ''} ${className}`}
    >
      {children}
      {trailingIcon ? <Icon name={trailingIcon} size={18} /> : null}
    </button>
  );
}
