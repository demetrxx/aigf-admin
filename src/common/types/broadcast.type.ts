export interface BroadcastFilters {
  lastVisitedBefore?: Date;
  lastVisitedAfter?: Date;
  subscribed?: boolean;
  userIds?: string[];
}

export enum MessageActionType {
  Callback = 'cb',
  Url = 'url',
  App = 'app',
}

interface BroadcastMessage {
  imgId?: string;
  text: string;
  action?: {
    text: string;
    value: string;
    type: MessageActionType;
  };
}

export interface BroadcastDto {
  message: BroadcastMessage;
  filters: BroadcastFilters;
}
