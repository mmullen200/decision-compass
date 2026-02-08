import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SavedExperiment {
  id: string;
  decisionId: string | null;
  decisionText?: string;
  title: string;
  description: string | null;
  targetCriterion: string | null;
  timeEstimate: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export function useExperimentsPersistence() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveExperiment = useCallback(async (
    experiment: {
      decisionId?: string | null;
      title: string;
      description?: string;
      targetCriterion?: string;
      timeEstimate?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
    }
  ): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to save experiments');
      return null;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('experiments')
        .insert({
          user_id: user.id,
          decision_id: experiment.decisionId || null,
          title: experiment.title,
          description: experiment.description || null,
          target_criterion: experiment.targetCriterion || null,
          time_estimate: experiment.timeEstimate || null,
          difficulty: experiment.difficulty || null,
        })
        .select('id')
        .single();

      if (error) throw error;
      toast.success('Experiment saved');
      return data.id;
    } catch (error: any) {
      console.error('Error saving experiment:', error);
      toast.error('Failed to save experiment');
      return null;
    } finally {
      setSaving(false);
    }
  }, [user]);

  const loadExperiments = useCallback(async (): Promise<SavedExperiment[]> => {
    if (!user) return [];

    setLoading(true);
    try {
      const { data: experiments, error } = await supabase
        .from('experiments')
        .select(`
          *,
          decisions(decision)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (experiments ?? []).map((e: any) => ({
        id: e.id,
        decisionId: e.decision_id,
        decisionText: e.decisions?.decision || null,
        title: e.title,
        description: e.description,
        targetCriterion: e.target_criterion,
        timeEstimate: e.time_estimate,
        difficulty: e.difficulty,
        status: e.status,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      }));
    } catch (error: any) {
      console.error('Error loading experiments:', error);
      toast.error('Failed to load experiments');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateExperimentStatus = useCallback(async (
    experimentId: string,
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('experiments')
        .update({ status })
        .eq('id', experimentId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error updating experiment:', error);
      toast.error('Failed to update experiment');
      return false;
    }
  }, [user]);

  const linkExperimentToDecision = useCallback(async (
    experimentId: string,
    decisionId: string | null
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('experiments')
        .update({ decision_id: decisionId })
        .eq('id', experimentId);

      if (error) throw error;
      toast.success(decisionId ? 'Experiment linked to decision' : 'Experiment unlinked');
      return true;
    } catch (error: any) {
      console.error('Error linking experiment:', error);
      toast.error('Failed to link experiment');
      return false;
    }
  }, [user]);

  const deleteExperiment = useCallback(async (experimentId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('experiments')
        .delete()
        .eq('id', experimentId);

      if (error) throw error;
      toast.success('Experiment deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting experiment:', error);
      toast.error('Failed to delete experiment');
      return false;
    }
  }, [user]);

  return {
    saveExperiment,
    loadExperiments,
    updateExperimentStatus,
    linkExperimentToDecision,
    deleteExperiment,
    saving,
    loading,
  };
}
