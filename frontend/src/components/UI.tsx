import { ReactNode } from 'react';

interface MenuButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  /** Light blue — VPN ဝယ်ရန် / mobile platforms */
  accent?: boolean;
}

export function MenuButton({ icon, label, onClick, accent }: MenuButtonProps) {
  const className = ['menu-btn', accent ? 'menu-btn--accent' : ''].filter(Boolean).join(' ');

  return (
    <button type="button" className={className} onClick={onClick}>
      <span className="menu-btn__icon">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

interface ActionButtonProps {
  icon?: ReactNode;
  label: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'copied';
  disabled?: boolean;
  type?: 'button' | 'submit';
}

export function ActionButton({
  icon,
  label,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
}: ActionButtonProps) {
  const className = ['action-btn', variant !== 'primary' ? `action-btn--${variant}` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={className} onClick={onClick} disabled={disabled}>
      {icon && <span className="action-btn__icon">{icon}</span>}
      <span className="action-btn__label">{label}</span>
    </button>
  );
}

interface CardProps {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function Card({ title, icon, children }: CardProps) {
  return (
    <div className="card">
      {title && (
        <div className="card__title">
          {icon && <span>{icon}</span>}
          <span>{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

interface InfoRowProps {
  icon: string;
  label: string;
  value: ReactNode;
}

export function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="info-row">
      <span className="info-row__icon">{icon}</span>
      <span className="info-row__label">{label}</span>
      <span className="info-row__value">{value}</span>
    </div>
  );
}

interface NavFooterProps {
  children: ReactNode;
}

export function NavFooter({ children }: NavFooterProps) {
  return <div className="nav-footer">{children}</div>;
}