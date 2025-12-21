import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { ArrowRight, Sparkles, Gauge, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getConfidenceLabel, getConfidenceColor } from '@/lib/bayesian';

interface DecisionEntryProps {
  onSubmit: (decision: string, confidence: number) => void;
  initialValue?: string;
  initialConfidence?: number;
  hasCriteria?: boolean;
  onReset?: () => void;
}

export function DecisionEntry({ onSubmit, initialValue = '', initialConfidence = 50, hasCriteria = false, onReset }: DecisionEntryProps) {
  const [decision, setDecision] = useState(initialValue);
  const [confidence, setConfidence] = useState(initialConfidence);

  const hasDecision = decision.trim().length > 0;
  const confidenceLabel = getConfidenceLabel(confidence);
  const confidenceColorClass = getConfidenceColor(confidence);

  const handleSubmit = () => {
    if (hasDecision) {
      onSubmit(decision.trim(), confidence);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-primary">Uncertainty Quantification</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          What decision are you <span className="gradient-text">facing?</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Describe the choice you need to make. Be specific — the more detail you provide, 
          the better we can quantify your uncertainty.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-8 mb-8"
      >
        <label className="block text-sm font-mono text-muted-foreground mb-3">
          YOUR DECISION
        </label>
        <Textarea
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          placeholder="e.g., Should I accept this job offer at a startup over my current stable position?"
          className="text-lg leading-relaxed"
          rows={4}
        />
      </motion.div>

      <AnimatePresence>
        {hasDecision && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <Gauge className="w-5 h-5 text-accent" />
                <span className="text-sm font-mono text-accent">INITIAL CONFIDENCE (Prior Probability)</span>
              </div>

              <div className="text-center mb-8">
                <motion.div
                  key={confidence}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="mb-2"
                >
                  <span className={`text-6xl font-mono font-bold ${confidenceColorClass}`}>
                    {Math.round(confidence)}
                  </span>
                  <span className="text-3xl font-mono text-muted-foreground">%</span>
                </motion.div>
                <p className={`text-lg font-medium ${confidenceColorClass}`}>
                  {confidenceLabel} Confidence
                </p>
              </div>

              <div className="px-4">
                <Slider
                  value={[confidence]}
                  onValueChange={(values) => setConfidence(values[0])}
                  min={1}
                  max={99}
                  step={1}
                  className="mb-4"
                />
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>Unlikely (1%)</span>
                  <span>Uncertain (50%)</span>
                  <span>Certain (99%)</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center mt-6">
                Before analyzing evidence, how confident are you that this is the right choice?
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-between items-end"
      >
        {hasCriteria && onReset ? (
          <div className="flex flex-col items-start gap-1">
            <Button
              onClick={onReset}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              New decision
            </Button>
            <p className="text-xs text-muted-foreground pl-1">
              This will clear everything you have entered so far.
            </p>
          </div>
        ) : (
          <div />
        )}
        <Button
          onClick={handleSubmit}
          disabled={!hasDecision}
          size="xl"
          variant="glow"
          className="group"
        >
          Define Criteria
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </motion.div>
    </div>
  );
}
