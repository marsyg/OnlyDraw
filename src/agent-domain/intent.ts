export type Intent =
  | { kind: 'act'; diagram: 'flow'; subject: string; targetIds?: string[] }
  | { kind: 'ask'; question: string; options: string[];
      missing: 'subject' | 'target' | 'diagram' }
  | { kind: 'refuse'; reason: string; alternative?: string;
      category: 'permission' | 'locked' | 'too_large' | 'content' | 'unsupported' };