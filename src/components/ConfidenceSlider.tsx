import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronLeft, ArrowRight, Gauge } from 'lucide-react';
import { motion } from 'framer-motion';
import { getConfidenceLabel, getConfidenceColor } from '@/lib/bayesian';

interface ConfidenceSliderProps {
  decision: string;
  initialValue: number;
  onSubmit: (confidence: number) => void;
  onBack: () => void;
}

export function ConfidenceSlider({ decision, initialValue, onSubmit, onBack }: ConfidenceSliderProps) {
  const [confidence, setConfidence] = useState(initialValue);

  const confidenceLabel = getConfidenceLabel(confidence);
  const confidenceColorClass = getConfidenceColor(confidence);

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
          <Gauge className="w-4 h-4 text-accent" />
          <span className="text-sm font-mono text-accent">Prior Probability</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          What's your <span className="gradient-text">initial confidence?</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Before analyzing evidence, how confident are you that this is the right choice?
          This establishes your Bayesian prior.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-8 mb-8"
      >
        <div className="mb-8 p-4 rounded-xl bg-secondary/50 border border-border">
          <p className="text-sm font-mono text-muted-foreground mb-1">YOUR DECISION</p>
          <p className="text-foreground">{decision}</p>
        </div>

        <div className="text-center mb-10">
          <motion.div
            key={confidence}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="mb-3"
          >
            <span className={`text-8xl font-mono font-bold ${confidenceColorClass}`}>
              {Math.round(confidence)}
            </span>
            <span className="text-4xl font-mono text-muted-foreground">%</span>
          </motion.div>
          <p className={`text-xl font-medium ${confidenceColorClass}`}>
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
            className="mb-6"
          />
          <div className="flex justify-between text-sm font-mono text-muted-foreground">
            <span>Unlikely (1%)</span>
            <span>Uncertain (50%)</span>
            <span>Certain (99%)</span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
            <p className="text-xs font-mono text-destructive/70 mb-1">LOW PRIOR</p>
            <p className="text-sm text-muted-foreground">Needs strong evidence to convince</p>
          </div>
          <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
            <p className="text-xs font-mono text-accent/70 mb-1">NEUTRAL</p>
            <p className="text-sm text-muted-foreground">Evidence will sway either way</p>
          </div>
          <div className="p-4 rounded-xl bg-confidence-high/10 border border-confidence-high/20">
            <p className="text-xs font-mono text-green-400/70 mb-1">HIGH PRIOR</p>
            <p className="text-sm text-muted-foreground">Evidence needed to disprove</p>
          </div>
        </div>
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
        <Button onClick={() => onSubmit(confidence)} size="xl" variant="glow" className="group">
          Gather Evidence
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </motion.div>
    </div>
  );
}
