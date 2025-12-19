import { useState } from 'react';
import { DecisionState } from '@/types/decision';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useDecisionAnalysis() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeDecision = async (state: DecisionState) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-decision', {
        body: {
          decision: state.decision,
          category: state.category,
          initialConfidence: state.initialConfidence,
          posteriorProbability: state.posteriorProbability,
          credibleInterval: state.credibleInterval,
          evidence: state.evidence,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze decision';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    analysis,
    isLoading,
    error,
    analyzeDecision,
  };
}
