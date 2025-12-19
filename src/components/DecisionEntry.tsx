import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORIES, CategoryId } from '@/types/decision';
import { Briefcase, DollarSign, Heart, Users, GraduationCap, Compass, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const iconMap = {
  Briefcase,
  DollarSign,
  Heart,
  Users,
  GraduationCap,
  Compass,
};

interface DecisionEntryProps {
  onSubmit: (decision: string, category: CategoryId) => void;
  initialValue?: string;
}

export function DecisionEntry({ onSubmit, initialValue = '' }: DecisionEntryProps) {
  const [decision, setDecision] = useState(initialValue);
  const [category, setCategory] = useState<CategoryId | ''>('');

  const handleSubmit = () => {
    if (decision.trim() && category) {
      onSubmit(decision.trim(), category);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-primary">Uncertainty Quantification</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          What decision are you <span className="gradient-text">facing?</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Describe the choice you need to make. Be specific — the more detail you provide, 
          the better we can quantify your uncertainty.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-8 mb-8"
      >
        <label className="block text-sm font-mono text-muted-foreground mb-3">
          YOUR DECISION
        </label>
        <Textarea
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          placeholder="e.g., Should I accept this job offer at a startup over my current stable position?"
          className="text-lg leading-relaxed mb-6"
          rows={4}
        />

        <label className="block text-sm font-mono text-muted-foreground mb-4">
          CATEGORY
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = iconMap[cat.icon as keyof typeof iconMap];
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20'
                    : 'border-border bg-secondary/50 hover:bg-secondary hover:border-primary/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="font-medium">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-end"
      >
        <Button
          onClick={handleSubmit}
          disabled={!decision.trim() || !category}
          size="xl"
          variant="glow"
          className="group"
        >
          Set Initial Confidence
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </motion.div>
    </div>
  );
}
