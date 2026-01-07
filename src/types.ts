export interface User {
  fullName: string;
  docId: string;
}

export enum AppStep {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  SESSION_1 = 'SESSION_1',
  BREAK_1 = 'BREAK_1',
  SESSION_2 = 'SESSION_2',
  BREAK_2 = 'BREAK_2',
  SESSION_3 = 'SESSION_3',
  COMPLETION = 'COMPLETION'
}

export interface Recording {
  sessionId: number;
  blob: Blob;
  url: string;
  filename: string;
}

export const SESSION_DURATION = 60; // seconds