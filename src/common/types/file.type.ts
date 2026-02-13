export enum FileDir {
  Public = 'public',
  Private = 'private',
}

export interface SignUploadDto {
  fileName: string;
  mime: string;
  folder: FileDir;
}

export enum FileStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
}

export interface IFile {
  id: string;
  name: string;
  dir: FileDir;
  path: string;
  status: FileStatus;
  mime: string;
  url: string | null;
  createdAt: string;
}
