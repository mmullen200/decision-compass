import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, ArrowRight, Loader2, Lightbulb, CheckCircle2 } from 'lucide-react';
import { Criterion, CriterionEvaluation } from '@/types/decision';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CriteriaEvaluationProps {
  decision: string;
  criteria: Criterion[];
  initialEvaluations: CriterionEvaluation[];
  onSubmit: (evaluations: CriterionEvaluation[]) => void;
  onBack: () => void;
}

export function CriteriaEvaluation({
  decision,
  criteria,
  initialEvaluations,
  onSubmit,
  onBack,
}: CriteriaEvaluationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evaluations, setEvaluations] = useState<CriterionEvaluation[]>(
    initialEvaluations.length > 0 
      ? initialEvaluations 
      : criteria.map(c => ({
          criterionId: c.id,
          supportsDecision: true,
          strength: 50,
          confidence: 50,
        }))
  );
  const [facts, setFacts] = useState<string[]>([]);
  const [isLoadingFacts, setIsLoadingFacts] = useState(false);

  const currentCriterion = criteria[currentIndex];
  const currentEvaluation = evaluations.find(e => e.criterionId === currentCriterion?.id);
  const isLastCriterion = currentIndex === criteria.length - 1;

  useEffect(() => {
    if (currentCriterion) {
      fetchFacts();
    }
  }, [currentIndex, currentCriterion?.id]);

  const fetchFacts = async () => {
    if (!currentCriterion) return;
    
    setIsLoadingFacts(true);
    setFacts([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-criteria-facts', {
        body: {
          decision,
          criterion: {
            name: currentCriterion.name,
            description: currentCriterion.description,
            importance: currentCriterion.importance,
          },
        },
      });

      if (error) {
        console.error('Error fetching facts:', error);
        toast.error('Failed to generate insights');
        return;
      }

      if (data?.facts) {
        setFacts(data.facts);
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to connect to AI service');
    } finally {
      setIsLoadingFacts(false);
    }
  };

  const updateEvaluation = (updates: Partial<CriterionEvaluation>) => {
    setEvaluations(prev =>
      prev.map(e =>
        e.criterionId === currentCriterion?.id
          ? { ...e, ...updates }
          : e
      )
    );
  };

  const handleNext = () => {
    if (isLastCriterion) {
      onSubmit(evaluations);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex === 0) {
      onBack();
    } else {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!currentCriterion || !currentEvaluation) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-mono text-muted-foreground">
            Criterion {currentIndex + 1} of {criteria.length}
          </span>
          <div className="flex gap-1">
            {criteria.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i === currentIndex
                    ? 'bg-primary'
                    : i < currentIndex
                    ? 'bg-primary/50'
                    : 'bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Criterion header */}
      <motion.div
        key={currentCriterion.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5">
          <h2 className="text-2xl font-bold gradient-text mb-2">
            {currentCriterion.name}
          </h2>
          {currentCriterion.description && (
            <p className="text-muted-foreground">{currentCriterion.description}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">Importance:</span>
            <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${currentCriterion.importance}%` }}
              />
            </div>
            <span className="text-xs font-mono text-primary">{currentCriterion.importance}%</span>
          </div>
        </div>

        {/* AI-generated facts */}
        <div className="p-6 rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold">Key Context</h3>
          </div>
          
          {isLoadingFacts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Analyzing criterion...</span>
            </div>
          ) : facts.length > 0 ? (
            <ul className="space-y-3">
              {facts.map((fact, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                  <span className="text-sm text-foreground/90">{fact}</span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">
              Unable to load contextual facts. You can still proceed with your assessment.
            </p>
          )}
        </div>

        {/* Assessment questions */}
        <div className="space-y-8 p-6 rounded-2xl border border-border bg-card">
          {/* Question 1: Support direction */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Based on this criterion, which option does this support?
            </Label>
            <RadioGroup
              value={currentEvaluation.supportsDecision ? 'decision' : 'status-quo'}
              onValueChange={(value) => updateEvaluation({ supportsDecision: value === 'decision' })}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center space-x-3 p-4 rounded-xl border border-border hover:border-primary/50 transition-colors cursor-pointer">
                <RadioGroupItem value="status-quo" id="status-quo" />
                <Label htmlFor="status-quo" className="cursor-pointer flex-1">
                  <span className="font-medium">Status Quo</span>
                  <span className="block text-sm text-muted-foreground">Keep things as they are</span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 rounded-xl border border-border hover:border-primary/50 transition-colors cursor-pointer">
                <RadioGroupItem value="decision" id="decision" />
                <Label htmlFor="decision" className="cursor-pointer flex-1">
                  <span className="font-medium">{decision}</span>
                  <span className="block text-sm text-muted-foreground">Make the change</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Question 2: Strength */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">How strongly?</Label>
              <span className="text-sm font-mono text-primary">
                {currentEvaluation.strength}%
              </span>
            </div>
            <Slider
              value={[currentEvaluation.strength]}
              onValueChange={([value]) => updateEvaluation({ strength: value })}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Very weakly</span>
              <span>Very strongly</span>
            </div>
          </div>

          {/* Question 3: Confidence */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">How sure are you about this assessment?</Label>
              <span className="text-sm font-mono text-primary">
                {currentEvaluation.confidence}%
              </span>
            </div>
            <Slider
              value={[currentEvaluation.confidence]}
              onValueChange={([value]) => updateEvaluation({ confidence: value })}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Not very sure</span>
              <span>Very sure</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {currentIndex === 0 ? 'Back to Criteria' : 'Previous'}
          </Button>
          <Button
            onClick={handleNext}
            className="gap-2"
          >
            {isLastCriterion ? 'See Results' : 'Next Criterion'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
