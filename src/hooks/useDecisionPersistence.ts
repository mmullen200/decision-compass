import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DecisionState, Criterion, CriterionEvaluation } from '@/types/decision';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SavedDecision {
  id: string;
  decision: string;
  initialConfidence: number;
  posteriorProbability: number | null;
  credibleIntervalLow: number | null;
  credibleIntervalHigh: number | null;
  winPercentage: number | null;
  createdAt: string;
  updatedAt: string;
  criteria: Criterion[];
  evaluations: CriterionEvaluation[];
}

export function useDecisionPersistence() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveDecision = useCallback(async (
    state: DecisionState,
    winPercentage: number
  ): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to save your decision');
      return null;
    }

    setSaving(true);
    try {
      // 1. Insert the main decision record
      const { data: decisionData, error: decisionError } = await supabase
        .from('decisions')
        .insert({
          user_id: user.id,
          decision: state.decision,
          initial_confidence: state.initialConfidence,
          posterior_probability: state.posteriorProbability,
          credible_interval_low: state.credibleInterval[0],
          credible_interval_high: state.credibleInterval[1],
          win_percentage: winPercentage,
          geweke_z_score: state.convergenceDiagnostic?.gewekeZScore ?? null,
          effective_sample_size: state.convergenceDiagnostic?.effectiveSampleSize ?? null,
          mc_error: state.convergenceDiagnostic?.mcError ?? null,
        })
        .select('id')
        .single();

      if (decisionError) throw decisionError;

      const decisionId = decisionData.id;

      // 2. Insert criteria with a mapping of old IDs to new IDs
      const criteriaMapping = new Map<string, string>();
      
      for (const criterion of state.criteria) {
        const { data: criterionData, error: criterionError } = await supabase
          .from('decision_criteria')
          .insert({
            decision_id: decisionId,
            name: criterion.name,
            importance: criterion.importance,
            description: criterion.description ?? null,
            is_ai_suggested: criterion.isAISuggested ?? false,
          })
          .select('id')
          .single();

        if (criterionError) throw criterionError;
        criteriaMapping.set(criterion.id, criterionData.id);
      }

      // 3. Insert evaluations using the new criterion IDs
      for (const evaluation of state.criteriaEvaluations) {
        const newCriterionId = criteriaMapping.get(evaluation.criterionId);
        if (!newCriterionId) continue;

        const { error: evalError } = await supabase
          .from('decision_evaluations')
          .insert({
            decision_id: decisionId,
            criterion_id: newCriterionId,
            supports_decision: evaluation.supportsDecision,
            strength: evaluation.strength,
            confidence: evaluation.confidence,
          });

        if (evalError) throw evalError;
      }

      toast.success('Decision saved to your history');
      return decisionId;
    } catch (error: any) {
      console.error('Error saving decision:', error);
      toast.error('Failed to save decision');
      return null;
    } finally {
      setSaving(false);
    }
  }, [user]);

  const loadDecisions = useCallback(async (): Promise<SavedDecision[]> => {
    if (!user) return [];

    setLoading(true);
    try {
      // Load all decisions with their criteria and evaluations
      const { data: decisions, error: decisionsError } = await supabase
        .from('decisions')
        .select('*')
        .order('created_at', { ascending: false });

      if (decisionsError) throw decisionsError;

      const result: SavedDecision[] = [];

      for (const d of decisions) {
        // Load criteria for this decision
        const { data: criteriaData } = await supabase
          .from('decision_criteria')
          .select('*')
          .eq('decision_id', d.id);

        // Load evaluations for this decision
        const { data: evaluationsData } = await supabase
          .from('decision_evaluations')
          .select('*')
          .eq('decision_id', d.id);

        const criteria: Criterion[] = (criteriaData ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          importance: Number(c.importance),
          description: c.description,
          isAISuggested: c.is_ai_suggested,
        }));

        const evaluations: CriterionEvaluation[] = (evaluationsData ?? []).map((e: any) => ({
          criterionId: e.criterion_id,
          supportsDecision: e.supports_decision,
          strength: Number(e.strength),
          confidence: Number(e.confidence),
        }));

        result.push({
          id: d.id,
          decision: d.decision,
          initialConfidence: Number(d.initial_confidence),
          posteriorProbability: d.posterior_probability ? Number(d.posterior_probability) : null,
          credibleIntervalLow: d.credible_interval_low ? Number(d.credible_interval_low) : null,
          credibleIntervalHigh: d.credible_interval_high ? Number(d.credible_interval_high) : null,
          winPercentage: d.win_percentage ? Number(d.win_percentage) : null,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          criteria,
          evaluations,
        });
      }

      return result;
    } catch (error: any) {
      console.error('Error loading decisions:', error);
      toast.error('Failed to load decision history');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteDecision = useCallback(async (decisionId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('decisions')
        .delete()
        .eq('id', decisionId);

      if (error) throw error;
      toast.success('Decision deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting decision:', error);
      toast.error('Failed to delete decision');
      return false;
    }
  }, [user]);

  return {
    saveDecision,
    loadDecisions,
    deleteDecision,
    saving,
    loading,
  };
}
