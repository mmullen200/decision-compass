export interface Criterion {
  id: string;
  name: string;
  importance: number; // 1-100, used as prior weight
  description?: string;
  isAISuggested?: boolean;
}

export interface CriterionEvaluation {
  criterionId: string;
  supportsDecision: boolean; // true = supports decision, false = supports status quo
  strength: number; // 1-100, very weakly to very strongly
  confidence: number; // 1-100, not very sure to very sure
}

export interface DecisionState {
  decision: string;
  category: string;
  criteria: Criterion[];
  criteriaEvaluations: CriterionEvaluation[];
  initialConfidence: number;
  evidence: EvidenceItem[];
  posteriorProbability: number;
  credibleInterval: [number, number];
  samples?: number[];
  convergenceDiagnostic?: {
    gewekeZScore: number;
    isConverged: boolean;
    effectiveSampleSize: number;
    mcError: number;
  };
}

export interface EvidenceItem {
  id: string;
  type: 'past_outcome' | 'emotional' | 'data' | 'constraint';
  label: string;
  value: number;
  weight: number;
  description: string;
}

export const CATEGORIES = [
  { id: 'career', label: 'Career', icon: 'Briefcase' },
  { id: 'finance', label: 'Finance', icon: 'DollarSign' },
  { id: 'health', label: 'Health', icon: 'Heart' },
  { id: 'relationships', label: 'Relationships', icon: 'Users' },
  { id: 'education', label: 'Education', icon: 'GraduationCap' },
  { id: 'lifestyle', label: 'Lifestyle', icon: 'Compass' },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];

export const EVIDENCE_TEMPLATES: Record<string, { label: string; description: string }[]> = {
  past_outcome: [
    { label: 'Previous similar decisions', description: 'How did similar decisions turn out?' },
    { label: 'Success rate history', description: 'Your track record with this type of decision' },
  ],
  emotional: [
    { label: 'Current stress level', description: 'How stressed are you about this decision?' },
    { label: 'Gut feeling strength', description: 'How strong is your intuitive pull?' },
    { label: 'Fear of missing out', description: 'How much does FOMO influence you?' },
  ],
  data: [
    { label: 'Quality of available data', description: 'How reliable is the information you have?' },
    { label: 'Completeness of research', description: 'How thoroughly have you researched?' },
  ],
  constraint: [
    { label: 'Time pressure', description: 'How urgent is this decision?' },
    { label: 'Financial constraints', description: 'How limited are your resources?' },
    { label: 'External obligations', description: 'How much do others depend on your choice?' },
  ],
};
