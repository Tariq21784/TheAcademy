export type Section = {
  id: string;
  title: string;
  body: string;
  keywords: string[];
};

export type DocumentPlan = {
  documentId: string;
  title: string;
  sections: Section[];
  schedule: number[];
  createdAt: string;
};

export type QuizItem = {
  id: string;
  sectionId: string;
  prompt: string;
  type: 'Recall' | 'Apply' | 'Reflect';
  answerKey: string;
};

export type AnswerResult = {
  correct: boolean;
  feedback: string;
};

export type SessionState = {
  plan: DocumentPlan | null;
  progress: Record<string, number>;
  completed: string[];
};
