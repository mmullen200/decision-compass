import { useState } from 'react';
import { DecisionState, Criterion, CriterionEvaluation } from '@/types/decision';
import { Button } from '@/components/ui/button';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CalculationsPaneProps {
  state: DecisionState;
  posterior: number;
  credibleInterval: [number, number];
  winPercentage: number;
}

export function CalculationsPane({ state, posterior, credibleInterval, winPercentage }: CalculationsPaneProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { initialConfidence, criteria, criteriaEvaluations } = state;

  // Reproduce the calculation logic for display
  const priorProb = initialConfidence / 100;
  const concentration = 10;
  let alpha = Math.max(0.5, priorProb * concentration);
  let beta = Math.max(0.5, (1 - priorProb) * concentration);

  const initialAlpha = alpha;
  const initialBeta = beta;

  // Track updates from each evaluation
  const evaluationUpdates: {
    criterion: Criterion | undefined;
    evaluation: CriterionEvaluation;
    strengthFactor: number;
    confidenceFactor: number;
    importanceFactor: number;
    pseudoCount: number;
    alphaChange: number;
    betaChange: number;
  }[] = [];

  criteriaEvaluations.forEach((evaluation) => {
    const criterion = criteria.find(c => c.id === evaluation.criterionId);
    const importance = criterion?.importance ?? 50;

    const strengthFactor = evaluation.strength / 5;
    const confidenceFactor = evaluation.confidence / 5;
    const importanceFactor = importance / 100;

    const pseudoCount = strengthFactor * confidenceFactor * importanceFactor * 5;

    const alphaChange = evaluation.supportsDecision ? pseudoCount : 0;
    const betaChange = evaluation.supportsDecision ? 0 : pseudoCount;

    evaluationUpdates.push({
      criterion,
      evaluation,
      strengthFactor,
      confidenceFactor,
      importanceFactor,
      pseudoCount,
      alphaChange,
      betaChange,
    });

    alpha += alphaChange;
    beta += betaChange;
  });

  const finalAlpha = alpha;
  const finalBeta = beta;
  const expectedValue = finalAlpha / (finalAlpha + finalBeta);

  return (
    <div className="mt-8">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="lg"
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Calculations
        </span>
        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-6 rounded-xl border border-border bg-card font-mono text-sm space-y-6">
              {/* Prior Setup */}
              <section>
                <h4 className="text-base font-bold text-primary mb-3">1. Prior Distribution (Beta)</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p>Initial confidence: <span className="text-foreground">{initialConfidence}%</span></p>
                  <p>Prior probability: <span className="text-foreground">{priorProb.toFixed(2)}</span></p>
                  <p>Concentration factor: <span className="text-foreground">{concentration}</span></p>
                  <p className="pt-2">
                    α₀ = prior × concentration = {priorProb.toFixed(2)} × {concentration} = <span className="text-primary font-bold">{initialAlpha.toFixed(2)}</span>
                  </p>
                  <p>
                    β₀ = (1 - prior) × concentration = {(1 - priorProb).toFixed(2)} × {concentration} = <span className="text-primary font-bold">{initialBeta.toFixed(2)}</span>
                  </p>
                </div>
              </section>

              {/* Evidence Updates */}
              <section>
                <h4 className="text-base font-bold text-primary mb-3">2. Evidence Updates</h4>
                {evaluationUpdates.length === 0 ? (
                  <p className="text-muted-foreground">No criteria evaluations.</p>
                ) : (
                  <div className="space-y-4">
                    {evaluationUpdates.map((update, i) => (
                      <div key={i} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                        <p className="font-bold text-foreground mb-2">
                          {update.criterion?.name || 'Unknown Criterion'}
                          <span className={`ml-2 text-xs ${update.evaluation.supportsDecision ? 'text-confidence-high' : 'text-confidence-low'}`}>
                            ({update.evaluation.supportsDecision ? 'Supports' : 'Opposes'})
                          </span>
                        </p>
                        <div className="text-muted-foreground space-y-1 text-xs">
                          <p>Strength: {update.evaluation.strength}/5 → factor = <span className="text-foreground">{update.strengthFactor.toFixed(2)}</span></p>
                          <p>Confidence: {update.evaluation.confidence}/5 → factor = <span className="text-foreground">{update.confidenceFactor.toFixed(2)}</span></p>
                          <p>Importance: {update.criterion?.importance ?? 50}% → factor = <span className="text-foreground">{update.importanceFactor.toFixed(2)}</span></p>
                          <p className="pt-1">
                            Pseudo-count = {update.strengthFactor.toFixed(2)} × {update.confidenceFactor.toFixed(2)} × {update.importanceFactor.toFixed(2)} × 5 = <span className="text-primary font-bold">{update.pseudoCount.toFixed(3)}</span>
                          </p>
                          <p>
                            {update.evaluation.supportsDecision 
                              ? `α += ${update.pseudoCount.toFixed(3)}` 
                              : `β += ${update.pseudoCount.toFixed(3)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Final Parameters */}
              <section>
                <h4 className="text-base font-bold text-primary mb-3">3. Posterior Distribution</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p>Final α = {initialAlpha.toFixed(2)} + {evaluationUpdates.reduce((sum, u) => sum + u.alphaChange, 0).toFixed(3)} = <span className="text-primary font-bold">{finalAlpha.toFixed(3)}</span></p>
                  <p>Final β = {initialBeta.toFixed(2)} + {evaluationUpdates.reduce((sum, u) => sum + u.betaChange, 0).toFixed(3)} = <span className="text-primary font-bold">{finalBeta.toFixed(3)}</span></p>
                  <p className="pt-2">
                    Expected value = α / (α + β) = {finalAlpha.toFixed(3)} / {(finalAlpha + finalBeta).toFixed(3)} = <span className="text-foreground font-bold">{(expectedValue * 100).toFixed(1)}%</span>
                  </p>
                </div>
              </section>

              {/* Monte Carlo Results */}
              <section>
                <h4 className="text-base font-bold text-primary mb-3">4. Monte Carlo Simulation (10,000 samples)</h4>
                <div className="space-y-1 text-muted-foreground">
                  <p>Posterior mean: <span className="text-foreground font-bold">{posterior.toFixed(1)}%</span></p>
                  <p>95% Credible Interval: <span className="text-foreground font-bold">[{credibleInterval[0].toFixed(1)}%, {credibleInterval[1].toFixed(1)}%]</span></p>
                  <p>Win percentage (samples &gt; 50%): <span className="text-primary font-bold">{winPercentage}%</span></p>
                </div>
              </section>

              {/* Formula Summary */}
              <section className="pt-4 border-t border-border">
                <h4 className="text-xs font-bold text-muted-foreground mb-2">FORMULA SUMMARY</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• Beta distribution: Prior ~ Beta(α₀, β₀)</p>
                  <p>• Pseudo-count = (strength/5) × (confidence/5) × (importance/100) × 5</p>
                  <p>• Supporting evidence: α += pseudo-count</p>
                  <p>• Opposing evidence: β += pseudo-count</p>
                  <p>• Win % = proportion of 10,000 samples where value &gt; 0.5</p>
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
