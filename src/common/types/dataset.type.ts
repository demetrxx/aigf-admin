import type { IFile } from '@/common/types/file.type.ts';

export enum DatasetType {
  Character = 'Character',
}

export interface IDataset {
  id: string;
  name: string;
  type: DatasetType;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDatasetItem {
  id: string;
  prompt: string;
  file: IFile;
  createdAt: string;
  updatedAt: string;
}

export interface IDatasetDetails extends IDataset {
  items: IDatasetItem[];
}

export interface CreateDatasetDto {
  name: string;
  type: DatasetType;
  description?: string;
}

export interface UpdateDatasetDto {
  name?: string;
  description?: string;
  type?: DatasetType;
}

export interface CreateDatasetItemDto {
  prompt: string;
  fileId: string;
}
