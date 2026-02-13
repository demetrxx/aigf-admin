export enum PlanPeriod {
  Day = 'day',
  Month = 'month',
  Year = 'year',
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
};

export type PlanUpdateDto = {
  isActive: boolean;
  isRecommended: boolean;
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
}
