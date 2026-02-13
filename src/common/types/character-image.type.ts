import {
  type ICharacter,
  type IScenario,
  RoleplayStage,
} from '@/common/types/character.type.ts';
import type { IFile } from '@/common/types/file.type.ts';

export type CreateCharacterImageDto = {
  characterId: string;
  scenarioId: string;
  description: string;
  stage: RoleplayStage;
  isPregenerated: boolean;
  isPromotional: boolean;
  fileId: string;
  blurredFileId?: string;
};

export interface ICharacterImage {
  id: string;
  description: string;
  stage: RoleplayStage;
  isPregenerated: boolean;
  isPromotional: boolean;
  character: ICharacter;
  scenario: IScenario;
  createdAt: string;
  updatedAt: string;
}

export interface ICharacterImageDetails extends ICharacterImage {
  file: IFile;
  blurredFile: IFile;
}
