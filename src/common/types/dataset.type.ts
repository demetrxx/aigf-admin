import type { IFile } from '@/common/types/file.type.ts';

export enum DatasetResolution {
  low = '1K',
  medium = '2K',
  high = '4K',
}

export interface DatasetItemPrompt {
  id: string;
  meta: {
    quality: string;
    camera: string;
    aspect_ratio: string;
    style: string;
  };
  scene: {
    location: string;
    time: string;
    lighting: string;
  };
  camera_angle: {
    shot_type: string;
    angle: string;
    distance: string;
  };
  subject: {
    pose: {
      body: string;
      hands: string;
      expression: string;
    };
    outfit: {
      top: { type: string; color: string; fit: string };
      bottom: { type: string; color: string };
    };
  };
  instruction: string;
  lora_caption: string;
}

export enum DatasetStyle {
  Photorealistic = 'photorealistic',
  Anime = 'anime',
}

export interface IDataset {
  id: string;
  name: string;
  style: DatasetStyle;
  description: string;
  resolution: DatasetResolution;
  loraTriggerWord: string;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export enum DatasetItemStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
}

export interface IDatasetItem {
  id: string;
  status: DatasetItemStatus;
  prompt: DatasetItemPrompt;
  file: IFile | null;
  createdAt: string;
}

export interface IDatasetDetails extends IDataset {
  items: IDatasetItem[];
  refImgs: IFile[];
}

export interface CreateDatasetDto {
  name: string;
  description: string;
  itemsCount: number;
  loraTriggerWord: string;
  resolution: DatasetResolution;
  style: DatasetStyle;
  refImgIds: string[];
}

export interface UpdateDatasetDto {
  name?: string;
}
