import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Plane, History as HistoryIcon, Plus, Trash2, ChevronRight, LogOut } from 'lucide-react';
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
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(d.createdAt), 'MMM d, yyyy · h:mm a')}
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
