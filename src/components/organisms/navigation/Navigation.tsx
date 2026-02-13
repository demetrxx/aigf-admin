import type { JSX } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  ChartIcon,
  CircleDotIcon,
  DollarSignIcon,
  GiftIcon,
  ImageIcon,
  LayersIcon,
  LogsIcon,
  MessageSquareQuoteIcon,
  NewspaperIcon,
  UserCogIcon,
  UserIcon,
  UsersRoundIcon,
} from '@/assets/icons';
import { Button } from '@/atoms';

import s from './Navigation.module.scss';

type NavItem = {
  label: string;
  to: string;
  icon: JSX.Element;
};

const navItems: NavItem[] = [
  { label: 'Analytics', to: '/', icon: <ChartIcon /> },
  { label: 'Characters', to: '/characters', icon: <UsersRoundIcon /> },
  { label: 'Images', to: '/character-images', icon: <ImageIcon /> },
  { label: 'LoRAs', to: '/loras', icon: <LayersIcon /> },
  { label: 'Gifts', to: '/gifts', icon: <GiftIcon /> },
  { label: 'Users', to: '/users', icon: <UserIcon /> },
  { label: 'Plans', to: '/plans', icon: <DollarSignIcon /> },
  { label: 'Prompts', to: '/prompts', icon: <MessageSquareQuoteIcon /> },
  { label: 'Datasets', to: '/datasets', icon: <CircleDotIcon /> },
  { label: 'Generations', to: '/generations', icon: <NewspaperIcon /> },
  { label: 'Logs', to: '/logs', icon: <LogsIcon /> },
  { label: 'Admins', to: '/admins', icon: <UserCogIcon /> },
];

export function Navigation() {
  const location = useLocation();

  return (
    <nav className={s.nav} aria-label="Primary">
      {navItems.map((item) => {
        const isActive =
          location.pathname === item.to ||
          (item.to !== '/' && location.pathname.startsWith(item.to));
        return (
          <Button
            key={item.to}
            as={NavLink}
            to={item.to}
            variant={isActive ? 'secondary' : 'ghost'}
            fullWidth
            iconLeft={item.icon}
            className={s.button}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}
