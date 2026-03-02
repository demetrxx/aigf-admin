export enum PlanPeriod {
  Day = 'day',
  Month = 'month',
  Year = 'year',
}

export interface PlanItem {
  emoji: string;
  value: string;
}

export type PlanCreateDto = {
  code: string;
  period?: PlanPeriod;
  periodCount?: number;
  price: number;
  isActive: boolean;
  air: number;
  isRecommended: boolean;
  type: PlanType;
  items?: PlanItem[];
};

export type PlanUpdateDto = {
  isActive: boolean;
  isRecommended: boolean;
  items?: PlanItem[];
};

export enum PlanType {
  Subscription = 'subscription',
  Air = 'air',
}

export interface IPlan {
  id: string;
  code: string;
  period?: PlanPeriod;
  periodCount?: number;
  price: number;
  isActive: boolean;
  air: number;
  isRecommended: boolean;
  createdAt: string;
  updatedAt: string;
  type: PlanType;
  items?: PlanItem[];
}
