import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DecisionEntry } from '@/components/DecisionEntry';
import { CriteriaWizard } from '@/components/CriteriaWizard';
import { CriteriaEvaluation } from '@/components/CriteriaEvaluation';
import { ResultsDashboard } from '@/components/ResultsDashboard';
import { ExperimentDesign } from '@/components/ExperimentDesign';
import { MonteCarloVisualization } from '@/components/MonteCarloVisualization';
import { DecisionState, Criterion, CriterionEvaluation as CriterionEval } from '@/types/decision';
import { calculatePosterior, calculatePosteriorFromEvaluations } from '@/lib/bayesian';
import { Plane, History, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { SavedDecision } from '@/hooks/useDecisionPersistence';

const STEPS = ['decision', 'criteria', 'evaluation', 'simulating', 'results', 'experiments'] as const;
type Step = typeof STEPS[number];

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<Step>('decision');
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);
  const [decisionState, setDecisionState] = useState<DecisionState>({
    decision: '',
    category: '',
    criteria: [],
    criteriaEvaluations: [],
    initialConfidence: 50,
    evidence: [],
    posteriorProbability: 50,
    credibleInterval: [35, 65],
  });

  // Load saved decision from navigation state
  useEffect(() => {
    const savedDecision = (location.state as { savedDecision?: SavedDecision })?.savedDecision;
    if (savedDecision) {
      setEditingDecisionId(savedDecision.id);
      setDecisionState({
        decision: savedDecision.decision,
        category: '',
        criteria: savedDecision.criteria,
        criteriaEvaluations: savedDecision.evaluations,
        initialConfidence: savedDecision.initialConfidence,
        evidence: [],
        posteriorProbability: savedDecision.posteriorProbability ?? 50,
        credibleInterval: [
          savedDecision.credibleIntervalLow ?? 35,
          savedDecision.credibleIntervalHigh ?? 65,
        ],
      });
      // Start at criteria step so user can update priors
      setStep('criteria');
      // Clear the navigation state to prevent reloading on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const currentStepIndex = STEPS.indexOf(step);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      if (STEPS[nextIndex] === 'simulating') {
        // Calculate posterior with evaluations before showing simulation
        const { posterior, credibleInterval, samples, convergenceDiagnostic } = calculatePosterior(
          decisionState.initialConfidence,
          decisionState.evidence
        );
        setDecisionState(prev => ({
          ...prev,
          posteriorProbability: posterior,
          credibleInterval,
          samples,
          convergenceDiagnostic,
        }));
      }
      setStep(STEPS[nextIndex]);
    }
  };

  const handleSimulationComplete = () => {
    setStep('results');
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex]);
    }
  };

  const handleDecisionSubmit = (decision: string, confidence: number) => {
    setDecisionState(prev => ({ ...prev, decision, initialConfidence: confidence }));
    goToNextStep();
  };

  const handleCriteriaSubmit = (criteria: Criterion[]) => {
    setDecisionState(prev => ({ ...prev, criteria }));
    goToNextStep();
  };

  const handleEvaluationsSubmit = (evaluations: CriterionEval[]) => {
    setDecisionState(prev => ({ ...prev, criteriaEvaluations: evaluations }));
    goToNextStep();
  };

  const handleStartExperiments = () => {
    setStep('experiments');
  };

  const handleExperimentsComplete = () => {
    setStep('results');
  };

  const handleReset = () => {
    setEditingDecisionId(null);
    setDecisionState({
      decision: '',
      category: '',
      criteria: [],
      criteriaEvaluations: [],
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
              <Plane className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-mono font-bold text-lg gradient-text">Flight Simulator</h1>
              <p className="text-xs text-muted-foreground font-mono">for Life</p>
            </div>
          </div>

          {/* Step indicator and actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
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
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/history')}
                className="hidden sm:flex"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
              <Button variant="ghost" size="icon" onClick={() => signOut()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
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
              <DecisionEntry 
                onSubmit={handleDecisionSubmit} 
                initialValue={decisionState.decision}
                initialConfidence={decisionState.initialConfidence}
                hasCriteria={decisionState.criteria.length > 0}
                onReset={handleReset}
              />
            </motion.div>
          )}

          {step === 'criteria' && (
            <motion.div
              key="criteria"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CriteriaWizard
                decision={decisionState.decision}
                initialCriteria={decisionState.criteria}
                onSubmit={handleCriteriaSubmit}
                onBack={goToPrevStep}
              />
            </motion.div>
          )}

          {step === 'evaluation' && (
            <motion.div
              key="evaluation"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CriteriaEvaluation
                decision={decisionState.decision}
                criteria={decisionState.criteria}
                initialEvaluations={decisionState.criteriaEvaluations}
                onSubmit={handleEvaluationsSubmit}
                onBack={goToPrevStep}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Monte Carlo Visualization - rendered outside AnimatePresence for full-screen effect */}
        <MonteCarloVisualization 
          isRunning={step === 'simulating'}
          onComplete={handleSimulationComplete}
          duration={3500}
          pathCount={300}
        />

        <AnimatePresence mode="wait">
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
                onDesignExperiments={handleStartExperiments}
              />
            </motion.div>
          )}

          {step === 'experiments' && (
            <motion.div
              key="experiments"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ExperimentDesign
                state={decisionState}
                winPercentage={calculatePosteriorFromEvaluations(
                  decisionState.initialConfidence,
                  decisionState.criteriaEvaluations,
                  decisionState.criteria
                ).winPercentage}
                onBack={() => setStep('results')}
                onComplete={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default Index;
