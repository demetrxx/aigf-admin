import type { IFile } from './file.type.ts';
import type { IGift } from './gift.type.ts';
import type { ILora } from './lora.type';

export interface ICharacter {
  id: string;
  name: string;
  description: string;
  promoImg?: IFile | null;
  isFeatured: boolean;
  avatar: IFile;
  emoji: string;
  isActive: boolean;
  gender: string;
  createdAt: string;
  updatedAt: string;
}

export enum RoleplayStage {
  // hook
  Acquaintance = 'ACQUAINTANCE',
  Flirting = 'FLIRTING',
  Seduction = 'SEDUCTION',

  // resistance
  Resistance = 'RESISTANCE',

  // retention
  Undressing = 'UNDRESSING',
  Prelude = 'PRELUDE',
  Sex = 'SEX',
  Aftercare = 'AFTERCARE',
}

export const STAGES_IN_ORDER = [
  RoleplayStage.Acquaintance,
  RoleplayStage.Flirting,
  RoleplayStage.Seduction,
  RoleplayStage.Resistance,
  RoleplayStage.Undressing,
  RoleplayStage.Prelude,
  RoleplayStage.Sex,
  RoleplayStage.Aftercare,
];

export interface StageDirectives {
  toneAndBehavior: string;
  restrictions: string;
  environment: string;
  characterLook: string;
  goal: string;
  escalationTrigger: string;
}

export type StageDirectivesMap = Record<RoleplayStage, StageDirectives>;

interface ICharacterGift {
  id: string;
  scenarioId: string;
  giftId: string;
  gift: IGift;
  stage: RoleplayStage;
  reason: string;
  buyText: string;
  createdAt: string;
  updatedAt: string;
}

export interface IScenario {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  promoImg?: IFile | null;
  promoImgHorizontal?: IFile | null;
  isActive: boolean;
  isNew: boolean;
  personality: string;
  messagingStyle: string;
  appearance: string;
  situation: string;
  openingMessage: string;
  openingImage: IFile;
  stages: StageDirectivesMap;
  gifts: ICharacterGift[];
  createdAt: string;
  updatedAt: string;
}

export interface ICharacterDetails extends ICharacter {
  lora: ILora;
  scenarios: IScenario[];
}
