import type { ITgUser } from '@/common/types/tg-user.type.ts';

import type { IScenario } from './character.type.ts';
import { type ICharacter, RoleplayStage } from './character.type.ts';

export interface IChat {
  id: string;
  scenario: IScenario;
  character: ICharacter;
  user: ITgUser;
  stage: RoleplayStage;
  historyLength: number;
  photosSent: number;
  createdAt: string;
  updatedAt: string;
}

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface IChatDetails extends IChat {
  history: IChatMessage[];
}

export interface ChatSearchParams {
  characterId?: string;
  scenarioId?: string;
  stage?: RoleplayStage;
  userId?: string;
}
