import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const withBottomNav = location.pathname !== '/';

  return (
    <div className={`app-shell${withBottomNav ? ' app-shell--with-bottom-nav' : ''}`}>
      <div className="page">{children}</div>
    </div>
  );
}