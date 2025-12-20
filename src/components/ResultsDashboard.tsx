import { useMemo } from 'react';
import { DecisionState } from '@/types/decision';
import { Button } from '@/components/ui/button';
import { calculatePosteriorFromEvaluations, getConfidenceColor, generateDistributionData } from '@/lib/bayesian';
import { RotateCcw, FlaskConical, Trophy, Scale, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';

interface ResultsDashboardProps {
  state: DecisionState;
  onBack: () => void;
  onReset: () => void;
  onDesignExperiments: () => void;
}

export function ResultsDashboard({ state, onBack, onReset, onDesignExperiments }: ResultsDashboardProps) {
  
  const { decision, initialConfidence, criteria, criteriaEvaluations } = state;

  // Calculate Monte Carlo results from evaluations
  const results = useMemo(() => {
    return calculatePosteriorFromEvaluations(initialConfidence, criteriaEvaluations, criteria);
  }, [initialConfidence, criteriaEvaluations, criteria]);

  const { posterior, credibleInterval, samples, winPercentage } = results;
  const posteriorColor = getConfidenceColor(posterior);

  // Distribution data for visualization
  const distributionData = generateDistributionData(posterior, credibleInterval, samples);

  // Determine winner
  const decisionWins = winPercentage > 50;
  const isTooClose = winPercentage >= 45 && winPercentage <= 55;

  // Count supporting vs opposing criteria
  const supportingCount = criteriaEvaluations.filter(e => e.supportsDecision).length;
  const opposingCount = criteriaEvaluations.filter(e => !e.supportsDecision).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Result */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="text-center mb-12"
      >
        <motion.div
          initial={{ rotate: -10, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/20 border-2 border-primary mb-6"
        >
          <Trophy className="w-12 h-12 text-primary" />
        </motion.div>

        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Based on your analysis...
        </h2>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-8 mb-6"
        >
          <p className="text-xl text-muted-foreground mb-4">
            {decisionWins ? (
              <>Your decision to</>
            ) : (
              <>Staying with the status quo beats</>
            )}
          </p>
          
          <p className="text-2xl md:text-3xl font-bold text-primary mb-6">
            "{decision}"
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.7 }}
              className="relative"
            >
              <div className={`text-7xl md:text-9xl font-mono font-black ${posteriorColor}`}>
                {winPercentage}
              </div>
              <div className="absolute -right-8 top-4 text-2xl md:text-3xl font-mono text-muted-foreground">
                %
              </div>
            </motion.div>
          </div>
          
          <p className="text-xl mt-4 text-foreground">
            {decisionWins ? (
              <>wins in simulated scenarios</>
            ) : (
              <>of the time</>
            )}
          </p>

          {isTooClose && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-muted-foreground mt-4 text-sm"
            >
              ⚖️ This is very close — more information could help clarify the decision.
            </motion.p>
          )}
        </motion.div>
      </motion.div>

      {/* Monte Carlo Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass-card rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <Scale className="w-5 h-5 text-primary" />
          <h3 className="font-mono text-sm text-muted-foreground">MONTE CARLO SIMULATION (10,000 SCENARIOS)</h3>
        </div>
        
        <div className="h-48 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={distributionData}>
              <defs>
                <linearGradient id="decisionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="x" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis hide />
              <ReferenceLine 
                x={50} 
                stroke="hsl(var(--muted-foreground))" 
                strokeWidth={1}
                strokeDasharray="4 4"
                label={{ value: 'Threshold', position: 'top', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <ReferenceLine 
                x={Math.round(posterior)} 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="y"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#decisionGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-xl bg-secondary/50">
            <p className="text-xs font-mono text-muted-foreground mb-1">STARTING BELIEF</p>
            <p className="text-xl font-mono font-bold">{Math.round(initialConfidence)}%</p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/50">
            <p className="text-xs font-mono text-muted-foreground mb-1">95% RANGE</p>
            <p className="text-xl font-mono font-bold">
              {Math.round(credibleInterval[0])}–{Math.round(credibleInterval[1])}%
            </p>
          </div>
          <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
            <p className="text-xs font-mono text-primary mb-1">FINAL ESTIMATE</p>
            <p className="text-xl font-mono font-bold text-primary">{Math.round(posterior)}%</p>
          </div>
        </div>
      </motion.div>

      {/* Criteria Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="glass-card rounded-2xl p-6 mb-8"
      >
        <h3 className="font-mono text-sm text-muted-foreground mb-4">CRITERIA BREAKDOWN</h3>
        <div className="flex gap-4">
          <div className="flex-1 p-4 rounded-xl bg-confidence-high/10 border border-confidence-high/30 text-center">
            <p className="text-3xl font-bold text-confidence-high">{supportingCount}</p>
            <p className="text-sm text-muted-foreground">criteria support</p>
            <p className="text-xs text-confidence-high font-medium mt-1">your decision</p>
          </div>
          <div className="flex-1 p-4 rounded-xl bg-confidence-low/10 border border-confidence-low/30 text-center">
            <p className="text-3xl font-bold text-confidence-low">{opposingCount}</p>
            <p className="text-sm text-muted-foreground">criteria favor</p>
            <p className="text-xs text-confidence-low font-medium mt-1">status quo</p>
          </div>
        </div>
      </motion.div>

      {/* Experiment Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="glass-card rounded-2xl p-8 mb-8 text-center"
      >
        <FlaskConical className="w-10 h-10 text-accent mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Want to increase your certainty?</h3>
        <p className="text-muted-foreground mb-6">
          We can help you design some quick experiments to gather more evidence.
        </p>
        <Button 
          onClick={onDesignExperiments}
          size="lg"
          className="gap-2"
        >
          Design experiments
          <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="flex justify-between"
      >
        <Button onClick={onBack} variant="outline" size="lg">
          Adjust evaluations
        </Button>
        <Button onClick={onReset} variant="secondary" size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          Start over
        </Button>
      </motion.div>
    </div>
  );
}
