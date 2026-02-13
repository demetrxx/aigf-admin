export enum UserRole {
  Owner = 'owner',
  Moderator = 'moderator',
  Developer = 'developer',
}

export interface IUser {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  email: string;
  createdAt: string;
  updatedAt: string;
}
