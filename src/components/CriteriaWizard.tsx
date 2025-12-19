import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Criterion } from '@/types/decision';
import { Plus, Trash2, GripVertical, Sparkles, ArrowRight, ChevronLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CriteriaWizardProps {
  decision: string;
  initialCriteria?: Criterion[];
  onSubmit: (criteria: Criterion[]) => void;
  onBack: () => void;
}

export function CriteriaWizard({ decision, initialCriteria = [], onSubmit, onBack }: CriteriaWizardProps) {
  const [criteria, setCriteria] = useState<Criterion[]>(initialCriteria);
  const [newCriterion, setNewCriterion] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const addCriterion = () => {
    if (newCriterion.trim()) {
      const criterion: Criterion = {
        id: crypto.randomUUID(),
        name: newCriterion.trim(),
        importance: 50,
        isAISuggested: false,
      };
      setCriteria([...criteria, criterion]);
      setNewCriterion('');
    }
  };

  const removeCriterion = (id: string) => {
    setCriteria(criteria.filter(c => c.id !== id));
  };

  const updateImportance = (id: string, importance: number) => {
    setCriteria(criteria.map(c => 
      c.id === id ? { ...c, importance } : c
    ));
  };

  const fetchAISuggestions = async () => {
    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-criteria', {
        body: { decision, existingCriteria: criteria.map(c => c.name) },
      });

      if (error) throw error;

      if (data?.suggestions && Array.isArray(data.suggestions)) {
        const newCriteria: Criterion[] = data.suggestions.map((s: { name: string; description?: string }) => ({
          id: crypto.randomUUID(),
          name: s.name,
          description: s.description,
          importance: 50,
          isAISuggested: true,
        }));
        setCriteria([...criteria, ...newCriteria]);
        toast.success(`Added ${newCriteria.length} AI-suggested criteria`);
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      toast.error('Failed to get AI suggestions');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSubmit = () => {
    if (criteria.length > 0) {
      onSubmit(criteria);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCriterion();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-10"
      >
        <h2 className="text-4xl font-bold mb-4">
          What <span className="gradient-text">criteria</span> matter?
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          List the factors you're considering for this decision, then rank them by importance.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card rounded-2xl p-6 mb-6"
      >
        <p className="text-sm text-muted-foreground mb-4 font-mono">DECISION</p>
        <p className="text-foreground">{decision}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-8 mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <label className="block text-sm font-mono text-muted-foreground">
            YOUR CRITERIA
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAISuggestions}
            disabled={isLoadingAI}
            className="gap-2"
          >
            {isLoadingAI ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            AI Suggestions
          </Button>
        </div>

        {/* Add new criterion */}
        <div className="flex gap-3 mb-6">
          <Input
            value={newCriterion}
            onChange={(e) => setNewCriterion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., Salary, Work-life balance, Growth opportunities..."
            className="flex-1"
          />
          <Button onClick={addCriterion} disabled={!newCriterion.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Criteria list */}
        <AnimatePresence mode="popLayout">
          {criteria.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-muted-foreground"
            >
              <p>No criteria added yet.</p>
              <p className="text-sm mt-2">Add criteria above or get AI suggestions.</p>
            </motion.div>
          ) : (
            <Reorder.Group
              axis="y"
              values={criteria}
              onReorder={setCriteria}
              className="space-y-3"
            >
              {criteria.map((criterion, index) => (
                <Reorder.Item
                  key={criterion.id}
                  value={criterion}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 rounded-xl border ${
                      criterion.isAISuggested
                        ? 'bg-primary/5 border-primary/20'
                        : 'bg-secondary/50 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      
                      <span className="text-sm font-mono text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{criterion.name}</span>
                          {criterion.isAISuggested && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                              AI
                            </span>
                          )}
                        </div>
                        {criterion.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {criterion.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Importance</span>
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={criterion.importance}
                            onChange={(e) => updateImportance(criterion.id, Number(e.target.value))}
                            className="w-20 h-1 accent-primary cursor-pointer"
                          />
                          <span className="text-xs font-mono w-8 text-right">
                            {criterion.importance}%
                          </span>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCriterion(criterion.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </AnimatePresence>

        {criteria.length > 0 && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Drag to reorder by priority. Higher position = higher priority.
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-between"
      >
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={criteria.length === 0}
          size="xl"
          variant="glow"
          className="group"
        >
          Set Confidence
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </motion.div>
    </div>
  );
}
