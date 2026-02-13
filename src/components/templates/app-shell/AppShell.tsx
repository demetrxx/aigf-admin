import { useAuth } from '@/app/auth';
import Logo from '@/assets/logo/logo.png';
import { Typography } from '@/atoms';
import { capitalize, cn } from '@/common/utils';
import { Navigation, UserCard } from '@/organisms';

import s from './AppShell.module.scss';

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
};

export function AppShell({ children, className }: AppShellProps) {
  const { user } = useAuth();
  const name =
    user?.firstName || user?.lastName
      ? [user?.firstName, user?.lastName].filter(Boolean).join(' ')
      : (user?.email ?? 'AIgf admin');

  return (
    <div className={cn(s.page, [className])}>
      <aside className={s.sidebar}>
        <div className={s.brandLogo}>
          <img src={Logo} alt="AIgf" />

          <Typography variant="h2" className={s.logoText}>
            AIgf
          </Typography>
        </div>

        <Navigation />
        <div className={s.sidebarFooter}>
          <UserCard name={name} role={capitalize(user?.role ?? 'admin')} />
        </div>
      </aside>
      <main className={s.main}>{children}</main>
    </div>
  );
}
