import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plane, History as HistoryIcon, Plus, Trash2, ChevronRight, LogOut, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useDecisionPersistence, SavedDecision } from '@/hooks/useDecisionPersistence';
import { getConfidenceColor } from '@/lib/bayesian';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function getOutcomeDescription(decision: SavedDecision): string {
  const { winPercentage, criteria, evaluations, initialConfidence } = decision;
  
  if (winPercentage === null) {
    return 'Analysis incomplete — the Bayesian model requires criterion evaluations to update the prior probability. Without evidence inputs, the posterior cannot be calculated.';
  }

  // Analyze the criteria and evaluations
  const supportingEvals = evaluations.filter(e => e.supportsDecision);
  const opposingEvals = evaluations.filter(e => !e.supportsDecision);
  
  // Find strongest factors
  const sortedByImpact = evaluations.map(e => {
    const criterion = criteria.find(c => c.id === e.criterionId);
    const impact = e.strength * e.confidence * (criterion?.importance || 50) / 100;
    return { eval: e, criterion, impact };
  }).sort((a, b) => b.impact - a.impact);

  const topSupporting = sortedByImpact.filter(s => s.eval.supportsDecision).slice(0, 2);
  const topOpposing = sortedByImpact.filter(s => !s.eval.supportsDecision).slice(0, 2);

  const shift = winPercentage - initialConfidence;
  const shiftDirection = shift >= 0 ? 'increased' : 'decreased';
  const shiftAmount = Math.abs(Math.round(shift));

  if (winPercentage >= 80) {
    const supportNames = topSupporting.map(s => s.criterion?.name).filter(Boolean).join(' and ');
    return `Strong support — The Bayesian model started with your ${Math.round(initialConfidence)}% prior and ${shiftDirection} it by ${shiftAmount} percentage points after weighing ${criteria.length} criteria. ${supportingEvals.length} of ${evaluations.length} evaluations supported this decision, with ${supportNames || 'key factors'} contributing the strongest positive evidence. The Monte Carlo simulation's posterior distribution shows high probability mass above 50%, indicating consistent alignment between your evidence and the decision's success.`;
  } else if (winPercentage >= 65) {
    const supportNames = topSupporting.map(s => s.criterion?.name).filter(Boolean).join(' and ');
    const concernNames = topOpposing.map(s => s.criterion?.name).filter(Boolean).join(' and ');
    return `Favorable outlook — Starting from ${Math.round(initialConfidence)}% confidence, the model ${shiftDirection} your probability by ${shiftAmount} points. While ${supportNames || 'supporting criteria'} provided strong positive evidence, ${concernNames ? `concerns around ${concernNames}` : 'some factors'} introduced uncertainty. The Beta-Binomial update weighted each criterion by its importance and your confidence level, resulting in a posterior that favors proceeding but suggests monitoring the weaker areas.`;
  } else if (winPercentage >= 50) {
    return `Slight edge — The Bayesian analysis ${shiftDirection} your initial ${Math.round(initialConfidence)}% estimate by ${shiftAmount} points, landing just above the decision threshold. With ${supportingEvals.length} supporting and ${opposingEvals.length} opposing evaluations across ${criteria.length} criteria, the evidence is nearly balanced. The model's pseudo-count calculations show that neither direction accumulated enough weighted evidence to create strong separation. Consider running experiments on criteria where your confidence was lowest to gather stronger signals.`;
  } else if (winPercentage >= 35) {
    const concernNames = topOpposing.map(s => s.criterion?.name).filter(Boolean).join(' and ');
    return `Mixed signals — Despite starting at ${Math.round(initialConfidence)}%, the model ${shiftDirection} your probability by ${shiftAmount} points based on the evidence provided. ${concernNames ? `${concernNames}` : 'Key criteria'} contributed notable negative weight to the posterior. The Monte Carlo simulation shows the 95% credible interval spanning both sides of 50%, indicating genuine uncertainty. The current evidence slightly favors the status quo, though the margin is small enough that additional positive evidence could shift the balance.`;
  } else if (winPercentage >= 20) {
    const concernNames = topOpposing.map(s => s.criterion?.name).filter(Boolean).join(', ');
    return `Caution advised — The Bayesian update moved your probability from ${Math.round(initialConfidence)}% down to ${Math.round(winPercentage)}%, a ${shiftAmount}-point ${shiftDirection}. ${opposingEvals.length} of ${evaluations.length} criterion evaluations went against this decision, with ${concernNames || 'multiple factors'} contributing the strongest negative evidence. The model's importance-weighted pseudo-counts accumulated more evidence against than for, suggesting you should address these specific concerns or explore alternative approaches before proceeding.`;
  } else {
    const concernNames = topOpposing.map(s => s.criterion?.name).filter(Boolean).join(', ');
    return `Strong headwinds — The analysis shows a significant ${shiftAmount}-point drop from your ${Math.round(initialConfidence)}% prior to ${Math.round(winPercentage)}%. Across ${criteria.length} criteria, ${opposingEvals.length} evaluations opposed this decision, with ${concernNames || 'critical factors'} driving the largest negative updates to the Beta distribution's α and β parameters. The posterior probability mass sits firmly below the decision threshold, indicating that this path is unlikely to succeed without substantial changes to address the fundamental concerns raised by your evidence.`;
  }
}

export default function History() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { loadDecisions, deleteDecision, loading } = useDecisionPersistence();
  const [decisions, setDecisions] = useState<SavedDecision[]>([]);

  useEffect(() => {
    if (user) {
      loadDecisions().then(setDecisions);
    }
  }, [user, loadDecisions]);

  const handleDelete = async (id: string) => {
    const success = await deleteDecision(id);
    if (success) {
      setDecisions((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
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

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/experiments')}>
              <FlaskConical className="w-4 h-4 mr-2" />
              Experiments
            </Button>
            <span className="text-sm text-muted-foreground hidden md:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Page header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <HistoryIcon className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Decision History</h2>
            </div>
            <Button onClick={() => navigate('/')}>
              <Plus className="w-4 h-4 mr-2" />
              New Decision
            </Button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-12 text-muted-foreground">Loading your decisions...</div>
          )}

          {/* Empty state */}
          {!loading && decisions.length === 0 && (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-secondary/50 inline-block mb-4">
                <HistoryIcon className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">No decisions yet</h3>
              <p className="text-muted-foreground mb-6">
                Start your first decision analysis to build your history
              </p>
              <Button onClick={() => navigate('/')}>
                <Plus className="w-4 h-4 mr-2" />
                Make your first decision
              </Button>
            </div>
          )}

          {/* Decision list */}
          {!loading && decisions.length > 0 && (
            <div className="space-y-4">
                {decisions.map((d, i) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card rounded-xl p-6 hover:border-primary/30 transition-colors cursor-pointer"
                    onClick={() => navigate('/', { state: { savedDecision: d } })}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-medium truncate mb-1">"{d.decision}"</p>
                      <p className="text-sm text-muted-foreground mb-2">
                        {format(new Date(d.createdAt), 'MMM d, yyyy · h:mm a')}
                      </p>
                      <p className="text-sm text-foreground/80 italic">
                        {getOutcomeDescription(d)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {d.winPercentage !== null && (
                        <div className="text-right">
                          <p className={`text-2xl font-mono font-bold ${getConfidenceColor(d.winPercentage)}`}>
                            {Math.round(d.winPercentage)}%
                          </p>
                          <p className="text-xs text-muted-foreground">win rate</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this decision?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this decision and all its data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(d.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="mt-4 pt-4 border-t border-border/50 flex gap-6 text-sm">
                    <div>
                      <span className="text-muted-foreground">Initial:</span>{' '}
                      <span className="font-mono">{Math.round(d.initialConfidence)}%</span>
                    </div>
                    {d.credibleIntervalLow !== null && d.credibleIntervalHigh !== null && (
                      <div>
                        <span className="text-muted-foreground">95% CI:</span>{' '}
                        <span className="font-mono">
                          {Math.round(d.credibleIntervalLow)}–{Math.round(d.credibleIntervalHigh)}%
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Criteria:</span>{' '}
                      <span className="font-mono">{d.criteria.length}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </main>
  );
}
