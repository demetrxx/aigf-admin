import type { IUser } from './user.type';

export enum AdminStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export type IAdmin = IUser & {
  status: AdminStatus;
};
