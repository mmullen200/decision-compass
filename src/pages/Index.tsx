import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DecisionEntry } from '@/components/DecisionEntry';
import { ConfidenceSlider } from '@/components/ConfidenceSlider';
import { EvidenceWizard } from '@/components/EvidenceWizard';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import { DecisionState, EvidenceItem, CategoryId } from '@/types/decision';
import { calculatePosterior } from '@/lib/bayesian';
import { Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = ['decision', 'confidence', 'evidence', 'results'] as const;
type Step = typeof STEPS[number];

const Index = () => {
  const [step, setStep] = useState<Step>('decision');
  const [decisionState, setDecisionState] = useState<DecisionState>({
    decision: '',
    category: '',
    initialConfidence: 50,
    evidence: [],
    posteriorProbability: 50,
    credibleInterval: [35, 65],
  });

  const currentStepIndex = STEPS.indexOf(step);
  const canGoBack = currentStepIndex > 0;
  const canGoForward = step === 'decision' ? decisionState.decision.trim().length > 0 : true;

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      if (STEPS[nextIndex] === 'results') {
        // Calculate posterior before showing results
        const { posterior, credibleInterval } = calculatePosterior(
          decisionState.initialConfidence,
          decisionState.evidence
        );
        setDecisionState(prev => ({
          ...prev,
          posteriorProbability: posterior,
          credibleInterval,
        }));
      }
      setStep(STEPS[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex]);
    }
  };

  const handleDecisionSubmit = (decision: string, category: CategoryId) => {
    setDecisionState(prev => ({ ...prev, decision, category }));
    goToNextStep();
  };

  const handleConfidenceSubmit = (confidence: number) => {
    setDecisionState(prev => ({ ...prev, initialConfidence: confidence }));
    goToNextStep();
  };

  const handleEvidenceSubmit = (evidence: EvidenceItem[]) => {
    setDecisionState(prev => ({ ...prev, evidence }));
    goToNextStep();
  };

  const handleReset = () => {
    setDecisionState({
      decision: '',
      category: '',
      initialConfidence: 50,
      evidence: [],
      posteriorProbability: 50,
      credibleInterval: [35, 65],
    });
    setStep('decision');
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-primary/3 rounded-full blur-2xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-lg gradient-text">Bayesian Reality</h1>
              <p className="text-xs text-muted-foreground font-mono">Decision Simulator</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-500 ${
                  i === currentStepIndex
                    ? 'w-8 bg-primary'
                    : i < currentStepIndex
                    ? 'w-2 bg-primary/50'
                    : 'w-2 bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {step === 'decision' && (
            <motion.div
              key="decision"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DecisionEntry onSubmit={handleDecisionSubmit} initialValue={decisionState.decision} />
            </motion.div>
          )}

          {step === 'confidence' && (
            <motion.div
              key="confidence"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ConfidenceSlider
                decision={decisionState.decision}
                initialValue={decisionState.initialConfidence}
                onSubmit={handleConfidenceSubmit}
                onBack={goToPrevStep}
              />
            </motion.div>
          )}

          {step === 'evidence' && (
            <motion.div
              key="evidence"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <EvidenceWizard
                decision={decisionState.decision}
                category={decisionState.category}
                initialEvidence={decisionState.evidence}
                onSubmit={handleEvidenceSubmit}
                onBack={goToPrevStep}
              />
            </motion.div>
          )}

          {step === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ResultsDashboard
                state={decisionState}
                onBack={goToPrevStep}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default Index;
