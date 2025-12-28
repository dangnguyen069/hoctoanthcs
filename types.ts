export enum Difficulty {
  EASY = 'Dễ',
  MEDIUM = 'Trung bình',
  HARD = 'Khó'
}

export enum Grade {
  SIX = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE = '9'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE'
}

export interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  // For Multiple Choice
  options?: string[];
  correctAnswerIndex?: number;
  // For True/False
  propositions?: string[]; // 4 propositions: a, b, c, d
  correctAnswersTF?: boolean[]; // [true, false, true, false]
  explanation: string;
}

export interface QuizConfig {
  grade: Grade;
  topic: string;
  difficulty: Difficulty;
  questionCount: number;
  questionType: QuestionType | 'MIXED';
}

export type UserAnswer = number | boolean[] | null;

export interface QuizState {
  questions: Question[];
  userAnswers: UserAnswer[]; 
  currentQuestionIndex: number;
  isComplete: boolean;
  score: number;
  warnings: number;
  startTime: number;
  endTime?: number;
  submissionReason?: 'normal' | 'cheat';
}