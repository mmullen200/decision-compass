import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useExperimentsPersistence, SavedExperiment } from '@/hooks/useExperimentsPersistence';
import { useDecisionPersistence, SavedDecision } from '@/hooks/useDecisionPersistence';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  FlaskConical,
  Clock,
  Target,
  Trash2,
  ChevronLeft,
  Loader2,
  Link2,
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
  Plus,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const statusConfig = {
  planned: { icon: Circle, label: 'Planned', color: 'text-muted-foreground' },
  in_progress: { icon: PlayCircle, label: 'In Progress', color: 'text-blue-400' },
  completed: { icon: CheckCircle2, label: 'Completed', color: 'text-green-400' },
  cancelled: { icon: XCircle, label: 'Cancelled', color: 'text-red-400' },
};

const difficultyColors: Record<string, string> = {
  easy: 'text-green-400 bg-green-400/10 border-green-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  hard: 'text-red-400 bg-red-400/10 border-red-400/30',
};

export default function Experiments() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { loadExperiments, updateExperimentStatus, linkExperimentToDecision, deleteExperiment, loading } = useExperimentsPersistence();
  const { loadDecisions } = useDecisionPersistence();
  
  const [experiments, setExperiments] = useState<SavedExperiment[]>([]);
  const [decisions, setDecisions] = useState<SavedDecision[]>([]);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadExperiments().then(setExperiments);
      loadDecisions().then(setDecisions);
    }
  }, [user, loadExperiments, loadDecisions]);

  const handleStatusChange = async (experimentId: string, status: SavedExperiment['status']) => {
    const success = await updateExperimentStatus(experimentId, status);
    if (success) {
      setExperiments(prev => prev.map(e => 
        e.id === experimentId ? { ...e, status } : e
      ));
    }
  };

  const handleLinkDecision = async (experimentId: string, decisionId: string | null) => {
    const success = await linkExperimentToDecision(experimentId, decisionId);
    if (success) {
      const decision = decisions.find(d => d.id === decisionId);
      setExperiments(prev => prev.map(e => 
        e.id === experimentId 
          ? { ...e, decisionId, decisionText: decision?.decision || undefined } 
          : e
      ));
      setLinkingId(null);
    }
  };

  const handleDelete = async (experimentId: string) => {
    const success = await deleteExperiment(experimentId);
    if (success) {
      setExperiments(prev => prev.filter(e => e.id !== experimentId));
    }
  };

  const StatusIcon = ({ status }: { status: SavedExperiment['status'] }) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              <span className="font-semibold">Experiments</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
              Decision History
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold mb-4">
            Your <span className="gradient-text">Experiments</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Track experiments to reduce uncertainty in your decisions
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : experiments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <FlaskConical className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-medium mb-2">No experiments yet</h3>
            <p className="text-muted-foreground mb-6">
              Complete a decision analysis to design experiments
            </p>
            <Button onClick={() => navigate('/')}>
              <Plus className="w-4 h-4 mr-2" />
              Start New Analysis
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {experiments.map((experiment, index) => (
                <motion.div
                  key={experiment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass-card rounded-xl p-5 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Title and Status */}
                      <div className="flex items-center gap-3 mb-2">
                        <FlaskConical className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold text-lg">{experiment.title}</h4>
                        <Select
                          value={experiment.status}
                          onValueChange={(value) => handleStatusChange(experiment.id, value as SavedExperiment['status'])}
                        >
                          <SelectTrigger className="w-auto h-7 text-xs gap-1 border-0 bg-secondary/50">
                            <StatusIcon status={experiment.status} />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  <config.icon className={`w-3 h-3 ${config.color}`} />
                                  {config.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Description */}
                      {experiment.description && (
                        <p className="text-muted-foreground mb-3">{experiment.description}</p>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        {experiment.targetCriterion && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Target className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Targets:</span>
                            <span className="font-medium">{experiment.targetCriterion}</span>
                          </div>
                        )}
                        {experiment.timeEstimate && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{experiment.timeEstimate}</span>
                          </div>
                        )}
                        {experiment.difficulty && (
                          <span className={`text-xs px-2 py-1 rounded-full border ${difficultyColors[experiment.difficulty]}`}>
                            {experiment.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Linked Decision */}
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-muted-foreground" />
                        {linkingId === experiment.id ? (
                          <Select
                            value={experiment.decisionId || 'none'}
                            onValueChange={(value) => handleLinkDecision(experiment.id, value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="w-64 h-8 text-sm">
                              <SelectValue placeholder="Select a decision..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No linked decision</SelectItem>
                              {decisions.map(d => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.decision.length > 40 ? d.decision.slice(0, 40) + '...' : d.decision}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : experiment.decisionText ? (
                          <button
                            onClick={() => setLinkingId(experiment.id)}
                            className="text-sm text-foreground/80 hover:text-primary transition-colors"
                          >
                            "{experiment.decisionText.length > 50 
                              ? experiment.decisionText.slice(0, 50) + '...' 
                              : experiment.decisionText}"
                          </button>
                        ) : (
                          <button
                            onClick={() => setLinkingId(experiment.id)}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                          >
                            Link to a decision...
                          </button>
                        )}
                      </div>

                      {/* Created date */}
                      <p className="text-xs text-muted-foreground mt-3">
                        Created {format(new Date(experiment.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>

                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete experiment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this experiment. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(experiment.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
