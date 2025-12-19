import { useEffect } from 'react';
import { DecisionState } from '@/types/decision';
import { Button } from '@/components/ui/button';
import { getConfidenceLabel, getConfidenceColor, generateDistributionData } from '@/lib/bayesian';
import { ChevronLeft, RotateCcw, TrendingUp, TrendingDown, Minus, Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useDecisionAnalysis } from '@/hooks/useDecisionAnalysis';

interface ResultsDashboardProps {
  state: DecisionState;
  onBack: () => void;
  onReset: () => void;
}

export function ResultsDashboard({ state, onBack, onReset }: ResultsDashboardProps) {
  const { analysis, isLoading, analyzeDecision } = useDecisionAnalysis();

  useEffect(() => {
    analyzeDecision(state);
  }, []);
  const { decision, initialConfidence, posteriorProbability, credibleInterval, evidence, samples } = state;

  const priorLabel = getConfidenceLabel(initialConfidence);
  const posteriorLabel = getConfidenceLabel(posteriorProbability);
  const posteriorColor = getConfidenceColor(posteriorProbability);

  const confidenceChange = posteriorProbability - initialConfidence;
  const changeDirection = confidenceChange > 2 ? 'up' : confidenceChange < -2 ? 'down' : 'neutral';

  // Use Monte Carlo samples for distribution if available
  const distributionData = generateDistributionData(posteriorProbability, credibleInterval, samples);

  // Find top contributors
  const sortedEvidence = [...evidence].sort((a, b) => {
    const impactA = Math.abs(a.value - 50) * (a.weight / 100);
    const impactB = Math.abs(b.value - 50) * (b.weight / 100);
    return impactB - impactA;
  });
  const topContributors = sortedEvidence.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-10"
      >
        <h2 className="text-4xl font-bold mb-4">
          Bayesian <span className="gradient-text">Analysis Complete</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Your uncertainty has been quantified. Here's what the evidence suggests.
        </p>
      </motion.div>

      {/* Main results */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Posterior probability card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-mono text-sm text-muted-foreground">POSTERIOR PROBABILITY</h3>
            {changeDirection === 'up' && <TrendingUp className="w-5 h-5 text-confidence-high" />}
            {changeDirection === 'down' && <TrendingDown className="w-5 h-5 text-confidence-low" />}
            {changeDirection === 'neutral' && <Minus className="w-5 h-5 text-muted-foreground" />}
          </div>

          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
            >
              <span className={`text-8xl font-mono font-bold ${posteriorColor}`}>
                {Math.round(posteriorProbability)}
              </span>
              <span className="text-4xl font-mono text-muted-foreground">%</span>
            </motion.div>
            <p className={`text-xl font-medium mt-2 ${posteriorColor}`}>
              {posteriorLabel} Confidence
            </p>
          </div>

          {/* Prior to posterior comparison */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs font-mono text-muted-foreground mb-1">PRIOR</p>
              <p className="text-2xl font-mono font-bold">{Math.round(initialConfidence)}%</p>
              <p className="text-xs text-muted-foreground">{priorLabel}</p>
            </div>
            <div className="p-3 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className={`text-xl font-mono font-bold ${
                confidenceChange > 0 ? 'text-confidence-high' : confidenceChange < 0 ? 'text-confidence-low' : 'text-muted-foreground'
              }`}>
                {confidenceChange > 0 ? '+' : ''}{Math.round(confidenceChange)}%
              </span>
            </div>
            <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
              <p className="text-xs font-mono text-primary mb-1">POSTERIOR</p>
              <p className="text-2xl font-mono font-bold text-primary">{Math.round(posteriorProbability)}%</p>
              <p className="text-xs text-primary/70">{posteriorLabel}</p>
            </div>
          </div>
        </motion.div>

        {/* Distribution visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-8"
        >
          <h3 className="font-mono text-sm text-muted-foreground mb-6">PROBABILITY DISTRIBUTION</h3>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={distributionData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
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
                />
                <YAxis hide />
                <ReferenceLine 
                  x={posteriorProbability} 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">95% Credible Interval:</span>
              <span className="font-mono text-primary">
                {Math.round(credibleInterval[0])}% — {Math.round(credibleInterval[1])}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decision summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card rounded-2xl p-8 mb-8"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
            <Lightbulb className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1">Decision Summary</h3>
            <p className="text-muted-foreground">{decision}</p>
          </div>
        </div>

        {topContributors.length > 0 && (
          <>
            <h4 className="font-mono text-sm text-muted-foreground mb-4">KEY EVIDENCE CONTRIBUTORS</h4>
            <div className="grid md:grid-cols-3 gap-4">
              {topContributors.map((item, idx) => {
                const isPositive = item.value > 50;
                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border ${
                      isPositive
                        ? 'bg-confidence-high/10 border-confidence-high/20'
                        : 'bg-confidence-low/10 border-confidence-low/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{['🥇', '🥈', '🥉'][idx]}</span>
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {isPositive ? 'Supports' : 'Opposes'} ({item.value}%)
                      </span>
                      <span className={`font-mono ${isPositive ? 'text-confidence-high' : 'text-confidence-low'}`}>
                        w: {item.weight}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {evidence.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No evidence was provided. The posterior equals the prior.</p>
            <p className="text-sm mt-2">Add evidence to see how it affects your confidence.</p>
          </div>
        )}
      </motion.div>

      {/* AI Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass-card rounded-2xl p-8 mb-8"
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1">AI-Powered Insights</h3>
            <p className="text-muted-foreground text-sm">Analysis powered by Gemini</p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Analyzing your decision...</span>
          </div>
        )}

        {analysis && !isLoading && (
          <div className="prose prose-sm prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {analysis}
            </div>
          </div>
        )}

        {!analysis && !isLoading && (
          <div className="text-center py-6">
            <Button onClick={() => analyzeDecision(state)} variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate AI Analysis
            </Button>
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-between"
      >
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="w-4 h-4" />
          Adjust Evidence
        </Button>
        <div className="flex gap-3">
          <Button onClick={onReset} variant="secondary" size="lg">
            <RotateCcw className="w-4 h-4" />
            New Analysis
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
