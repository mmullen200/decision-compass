import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { EvidenceItem, EVIDENCE_TEMPLATES } from '@/types/decision';
import { ChevronLeft, ArrowRight, Plus, X, FlaskConical, Scale, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EvidenceWizardProps {
  decision: string;
  category: string;
  initialEvidence: EvidenceItem[];
  onSubmit: (evidence: EvidenceItem[]) => void;
  onBack: () => void;
}

const EVIDENCE_TYPES = [
  { id: 'past_outcome', label: 'Past Outcomes', icon: '📊' },
  { id: 'emotional', label: 'Emotional State', icon: '💭' },
  { id: 'data', label: 'Available Data', icon: '📈' },
  { id: 'constraint', label: 'Constraints', icon: '⚠️' },
] as const;

export function EvidenceWizard({ decision, category, initialEvidence, onSubmit, onBack }: EvidenceWizardProps) {
  const [evidence, setEvidence] = useState<EvidenceItem[]>(initialEvidence);
  const [activeType, setActiveType] = useState<string>('past_outcome');

  const addEvidence = (type: string, label: string, description: string) => {
    const newEvidence: EvidenceItem = {
      id: `${type}-${Date.now()}`,
      type: type as EvidenceItem['type'],
      label,
      value: 50,
      weight: 50,
      description,
    };
    setEvidence(prev => [...prev, newEvidence]);
  };

  const updateEvidence = (id: string, field: 'value' | 'weight', newValue: number) => {
    setEvidence(prev =>
      prev.map(e => (e.id === id ? { ...e, [field]: newValue } : e))
    );
  };

  const removeEvidence = (id: string) => {
    setEvidence(prev => prev.filter(e => e.id !== id));
  };

  const templates = EVIDENCE_TEMPLATES[activeType] || [];
  const addedOfType = evidence.filter(e => e.type === activeType);

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <FlaskConical className="w-4 h-4 text-primary" />
          <span className="text-sm font-mono text-primary">Evidence Variables</span>
        </div>
        <h2 className="text-4xl font-bold mb-4">
          Map your <span className="gradient-text">evidence</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Add factors that influence your decision. Rate each on a scale and assign importance weights.
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Evidence type selector */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6"
        >
          <h3 className="font-mono text-sm text-muted-foreground mb-4">EVIDENCE TYPES</h3>
          <div className="space-y-2">
            {EVIDENCE_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setActiveType(type.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  activeType === type.id
                    ? 'bg-primary/20 border border-primary/40 text-primary'
                    : 'bg-secondary/50 border border-transparent hover:bg-secondary'
                }`}
              >
                <span className="text-xl">{type.icon}</span>
                <span className="font-medium">{type.label}</span>
                {evidence.filter(e => e.type === type.id).length > 0 && (
                  <span className="ml-auto text-xs bg-primary/20 px-2 py-0.5 rounded-full">
                    {evidence.filter(e => e.type === type.id).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="font-mono text-sm text-muted-foreground mb-3">ADD FACTOR</h4>
            <div className="space-y-2">
              {templates.map((template, idx) => {
                const isAdded = addedOfType.some(e => e.label === template.label);
                return (
                  <button
                    key={idx}
                    onClick={() => !isAdded && addEvidence(activeType, template.label, template.description)}
                    disabled={isAdded}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isAdded
                        ? 'opacity-50 cursor-not-allowed border-border'
                        : 'border-dashed border-border hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{template.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-6">{template.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Evidence configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass-card rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-mono text-sm text-muted-foreground">
              CONFIGURED EVIDENCE ({evidence.length})
            </h3>
            <Scale className="w-5 h-5 text-muted-foreground" />
          </div>

          {evidence.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No evidence added yet</p>
              <p className="text-sm mt-2">Select a type and add factors to analyze</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              <AnimatePresence>
                {evidence.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-xl bg-secondary/30 border border-border"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <button
                        onClick={() => removeEvidence(item.id)}
                        className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
                          <span>VALUE</span>
                          <span className="text-primary">{item.value}%</span>
                        </div>
                        <Slider
                          value={[item.value]}
                          onValueChange={(v) => updateEvidence(item.id, 'value', v[0])}
                          min={0}
                          max={100}
                          step={1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Against</span>
                          <span>For</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-mono text-muted-foreground mb-2">
                          <span>WEIGHT</span>
                          <span className="text-accent">{item.weight}%</span>
                        </div>
                        <Slider
                          value={[item.weight]}
                          onValueChange={(v) => updateEvidence(item.id, 'weight', v[0])}
                          min={0}
                          max={100}
                          step={1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Low</span>
                          <span>High</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-between mt-8"
      >
        <Button onClick={onBack} variant="outline" size="lg">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={() => onSubmit(evidence)} size="xl" variant="glow" className="group">
          Calculate Posterior
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </motion.div>
    </div>
  );
}
