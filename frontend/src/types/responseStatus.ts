export type ResponseStatusTone = 'neutral' | 'blue' | 'green' | 'amber' | 'red';

export interface ResponseStatusRecord {
  id: string;
  name: string;
  tone: ResponseStatusTone;
  order: number;
  created_at: string;
}

export interface ResponseStatusInput {
  name: string;
  tone?: ResponseStatusTone;
  order?: number;
}
