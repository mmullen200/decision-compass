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
    return 'Analysis incomplete — we need your assessment of each criterion to calculate how likely this decision is to succeed.';
  }

  // Analyze the criteria and evaluations
  const supportingEvals = evaluations.filter(e => e.supportsDecision);
  const opposingEvals = evaluations.filter(e => !e.supportsDecision);
  
  // Find strongest factors by impact
  const sortedByImpact = evaluations.map(e => {
    const criterion = criteria.find(c => c.id === e.criterionId);
    const impact = e.strength * e.confidence * (criterion?.importance || 50) / 100;
    return { eval: e, criterion, impact };
  }).sort((a, b) => b.impact - a.impact);

  const topSupporting = sortedByImpact.filter(s => s.eval.supportsDecision).slice(0, 2);
  const topOpposing = sortedByImpact.filter(s => !s.eval.supportsDecision).slice(0, 2);

  const shift = winPercentage - initialConfidence;
  const shiftDirection = shift >= 0 ? 'strengthened' : 'weakened';
  const shiftAmount = Math.abs(Math.round(shift));

  if (winPercentage >= 80) {
    const supportNames = topSupporting.map(s => s.criterion?.name).filter(Boolean).join(' and ');
    return `Strong support — You started with ${Math.round(initialConfidence)}% confidence, and after weighing all ${criteria.length} factors you identified, the evidence ${shiftDirection} your case by ${shiftAmount} points. ${supportingEvals.length} out of ${evaluations.length} criteria worked in your favor, especially ${supportNames || 'your key factors'}. When we ran thousands of "what if" scenarios using your inputs, the overwhelming majority pointed to success. This is a green light.`;
  } else if (winPercentage >= 65) {
    const supportNames = topSupporting.map(s => s.criterion?.name).filter(Boolean).join(' and ');
    const concernNames = topOpposing.map(s => s.criterion?.name).filter(Boolean).join(' and ');
    return `Favorable outlook — Starting from your ${Math.round(initialConfidence)}% gut feeling, we adjusted based on how each criterion actually stacks up. ${supportNames || 'Your supporting factors'} pulled the odds in your favor, though ${concernNames ? `${concernNames}` : 'some concerns'} created drag. The math says proceed, but the evidence isn't unanimous—keep an eye on the weaker areas as you move forward.`;
  } else if (winPercentage >= 50) {
    return `Slight edge — Your initial ${Math.round(initialConfidence)}% confidence ${shiftDirection} by ${shiftAmount} points, landing you just above the tipping point. With ${supportingEvals.length} factors helping and ${opposingEvals.length} factors hurting across ${criteria.length} criteria, you're essentially in a coin-flip zone. The good news: you're on the right side of 50%. The reality: the margin is thin. This is a good candidate for running a small experiment before fully committing.`;
  } else if (winPercentage >= 35) {
    const concernNames = topOpposing.map(s => s.criterion?.name).filter(Boolean).join(' and ');
    return `Mixed signals — We started with your ${Math.round(initialConfidence)}% estimate and ${shiftDirection} it by ${shiftAmount} points based on your evidence. ${concernNames ? `${concernNames}` : 'Some key factors'} weighed against this decision more heavily than the supporting factors could overcome. You're not far from the 50% mark, which means new positive evidence on your weakest criteria could still tip the scales—but right now, the numbers slightly favor staying put.`;
  } else if (winPercentage >= 20) {
    const concernNames = topOpposing.map(s => s.criterion?.name).filter(Boolean).join(', ');
    return `Caution advised — Your probability dropped from ${Math.round(initialConfidence)}% to ${Math.round(winPercentage)}% after we factored in all your evidence. ${opposingEvals.length} of your ${evaluations.length} criteria pointed against this choice, particularly ${concernNames || 'several important factors'}. This doesn't mean the decision is impossible, but the current evidence suggests significant obstacles. Consider what would need to change to flip those negative factors before moving forward.`;
  } else {
    const concernNames = topOpposing.map(s => s.criterion?.name).filter(Boolean).join(', ');
    return `Strong headwinds — The evidence tells a clear story: your confidence fell ${shiftAmount} points from ${Math.round(initialConfidence)}% to just ${Math.round(winPercentage)}%. Across your ${criteria.length} criteria, ${opposingEvals.length} worked against this decision—especially ${concernNames || 'your most important factors'}. In almost every simulated scenario, this path struggles. This isn't a "no forever," but it's a strong signal that the current approach needs fundamental changes before it becomes viable.`;
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
