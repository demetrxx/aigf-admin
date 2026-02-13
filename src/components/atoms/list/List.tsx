import type { ReactNode } from 'react';

import { cn } from '@/common/utils';

import s from './List.module.scss';

type ListProps = {
  items: ReactNode[];
  className?: string;
};

export function List({ items, className }: ListProps) {
  return (
    <ul className={cn(s.list, [className])}>
      {items.map((item, index) => (
        <li key={index} className={s.item}>
          <span className={s.marker} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
