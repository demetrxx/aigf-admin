export interface ILora {
  id: string;
  fileName: string;
  seed: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoraUploadDto {
  fileName: string;
  seed: number;
}
