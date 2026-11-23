export type ActiveSection = 'checkin' | 'counseling' | 'breathing' | 'chat';

export interface MoodOption {
  id: string;
  label: string;
  description: string;
  warmReply: string;
  suggestedPrompt: string;
}

export interface CounselingMessage {
  id: string;
  role: 'child' | 'counselor';
  text: string;
  gentleTip?: string;
  timestamp: string;
}

export interface GoogleChatSpace {
  name: string;
  type?: string;
  displayName?: string;
  spaceType?: string;
  threaded?: boolean;
}

export interface GoogleChatMessage {
  name: string;
  sender?: {
    name?: string;
    displayName?: string;
    type?: string;
  };
  createTime?: string;
  text?: string;
}
