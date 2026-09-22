export interface CategoryReading {
  interpretation: string;
  microLinesConsidered: string[];
  confidence: number;
}

export interface TimelineEvent {
  ageRange: string;
  phaseName: string;
  keyEventOrShift: string;
  palmEvidence: string;
}

export interface AspectReading {
  aspectName: string;
  summary: string;
  detailedInterpretation: string;
  palmEvidence: string;
}

export interface ReadingContent {
  shareLines?: {theme:string;text:string}[];
  lifeAreas?: LifeAreaReading[];
  imageQualityCheck: {
    clarity: string;
    confidenceImpact: string;
    notes: string;
  };
  openingHook: string;
  majorHighlight: string;
  executiveSummary: string;
  aspects: AspectReading[];
  lifeTimeline: TimelineEvent[];
  behavioralPatterns: { pattern: string; evidence: string; confidence: number; }[];
  recommendedActions: string[];
  overallConfidence: number;
}

export type RoastReadingResponse = ReadingContent;

export interface Reading {
  id?: string;
  userId: string;
  title?: string;
  readingText: string;
  images?: string[];
  createdAt: any;
  mode?: 'standard' | 'roast';
  isSample?: boolean;
  mainFocus?: string;
  storageWarning?: string;
}

export interface LifeAreaReading {
  id: string;
  title: string;
  summary: string;
  questions: {question:string;answer:string}[];
  watchOutFor: string;
  nextStep: string;
  basis: string;
}

