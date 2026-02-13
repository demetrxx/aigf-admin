export type PaginatedResponse<T> = {
  total: number;
  data: T[];
  skip: number;
  take: number;
};
