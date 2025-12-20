import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DecisionState } from '@/types/decision';
import { ChevronLeft, FlaskConical, Plus, Trash2, Clock, Target, Loader2, Lightbulb, Beaker, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Experiment {
  id: string;
  title: string;
  description: string;
  targetCriterion: string;
  timeEstimate: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isUserAdded?: boolean;
}

interface ExperimentDesignProps {
  state: DecisionState;
  winPercentage: number;
  onBack: () => void;
  onComplete: () => void;
}

export function ExperimentDesign({ state, winPercentage, onBack, onComplete }: ExperimentDesignProps) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExperiment, setNewExperiment] = useState<{
    title: string;
    description: string;
    targetCriterion: string;
    timeEstimate: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>({
    title: '',
    description: '',
    targetCriterion: '',
    timeEstimate: '',
    difficulty: 'medium',
  });

  useEffect(() => {
    generateExperiments();
  }, []);

  const generateExperiments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-experiments', {
        body: {
          decision: state.decision,
          criteria: state.criteria,
          evaluations: state.criteriaEvaluations,
          winPercentage,
        },
      });

      if (error) throw error;

      const aiExperiments = (data.experiments || []).map((exp: any, idx: number) => ({
        ...exp,
        id: `ai-${idx}-${Date.now()}`,
        isUserAdded: false,
      }));

      setExperiments(aiExperiments);
    } catch (error) {
      console.error('Error generating experiments:', error);
      toast.error('Failed to generate experiments');
      // Fallback experiments
      setExperiments([
        {
          id: 'fallback-1',
          title: 'Talk to someone who made this choice',
          description: 'Find 1-2 people who faced a similar decision and learn from their experience.',
          targetCriterion: state.criteria[0]?.name || 'General',
          timeEstimate: '2-3 hours',
          difficulty: 'easy',
        },
        {
          id: 'fallback-2',
          title: 'Run a small-scale test',
          description: 'Try a limited version of the decision to gather real data before committing fully.',
          targetCriterion: state.criteria[1]?.name || 'General',
          timeEstimate: '1-2 days',
          difficulty: 'medium',
        },
        {
          id: 'fallback-3',
          title: 'Research the worst-case scenario',
          description: 'Investigate what happens if this decision goes wrong and how recoverable it is.',
          targetCriterion: state.criteria[2]?.name || 'Risk',
          timeEstimate: '1-2 hours',
          difficulty: 'easy',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const addExperiment = () => {
    if (!newExperiment.title.trim()) return;

    const experiment: Experiment = {
      id: `user-${Date.now()}`,
      ...newExperiment,
      isUserAdded: true,
    };

    setExperiments(prev => [...prev, experiment]);
    setNewExperiment({
      title: '',
      description: '',
      targetCriterion: '',
      timeEstimate: '',
      difficulty: 'medium',
    });
    setShowAddForm(false);
    toast.success('Experiment added');
  };

  const removeExperiment = (id: string) => {
    setExperiments(prev => prev.filter(e => e.id !== id));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'hard': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Beaker className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-primary">Experiment Design</span>
        </div>
        <h2 className="text-4xl font-bold mb-4">
          Design <span className="gradient-text">experiments</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Reduce uncertainty before making your final decision
        </p>
      </motion.div>

      {/* What are experiments explanation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-6 mb-8"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
            <Lightbulb className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">What are experiments?</h3>
            <p className="text-muted-foreground leading-relaxed">
              Experiments are small, low-cost actions you can take to gather more information before committing 
              to a major decision. Instead of guessing, you test your assumptions with real data. Good experiments 
              are quick (hours to days, not weeks), specific (target one uncertainty), and actionable (you can 
              actually do them). They help you move from "I think this might work" to "I have evidence this works."
            </p>
          </div>
        </div>
      </motion.div>

      {/* Experiments list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-sm text-muted-foreground">
            SUGGESTED EXPERIMENTS ({experiments.length})
          </h3>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>

        {isLoading ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Generating experiments based on your decision...</p>
          </div>
        ) : (
          <AnimatePresence>
            {experiments.map((experiment, index) => (
              <motion.div
                key={experiment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card rounded-xl p-5 border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FlaskConical className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">{experiment.title}</h4>
                      {experiment.isUserAdded && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          Your idea
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground mb-4">{experiment.description}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Targets:</span>
                        <span className="font-medium">{experiment.targetCriterion}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{experiment.timeEstimate}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(experiment.difficulty)}`}>
                        {experiment.difficulty}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeExperiment(experiment.id)}
                    className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Add experiment form */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        {!showAddForm ? (
          <Button
            onClick={() => setShowAddForm(true)}
            variant="outline"
            className="w-full border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your Own Experiment
          </Button>
        ) : (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="glass-card rounded-xl p-6"
          >
            <h4 className="font-semibold mb-4">Add Custom Experiment</h4>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Experiment Title</label>
                <Input
                  value={newExperiment.title}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Interview 3 customers about their needs"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea
                  value={newExperiment.description}
                  onChange={(e) => setNewExperiment(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What will you do and what do you hope to learn?"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Target Criterion</label>
                  <Input
                    value={newExperiment.targetCriterion}
                    onChange={(e) => setNewExperiment(prev => ({ ...prev, targetCriterion: e.target.value }))}
                    placeholder="e.g., Cost"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Time Estimate</label>
                  <Input
                    value={newExperiment.timeEstimate}
                    onChange={(e) => setNewExperiment(prev => ({ ...prev, timeEstimate: e.target.value }))}
                    placeholder="e.g., 2 hours"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Difficulty</label>
                  <select
                    value={newExperiment.difficulty}
                    onChange={(e) => setNewExperiment(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button onClick={addExperiment} disabled={!newExperiment.title.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Experiment
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-between"
      >
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="w-4 h-4" />
          Back to Results
        </Button>
        <Button onClick={onComplete} size="xl" variant="glow" className="group">
          Complete Analysis
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </motion.div>
    </div>
  );
}
