-- Create decisions table to store decision records
CREATE TABLE public.decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  decision TEXT NOT NULL,
  initial_confidence NUMERIC NOT NULL DEFAULT 50,
  posterior_probability NUMERIC,
  credible_interval_low NUMERIC,
  credible_interval_high NUMERIC,
  win_percentage NUMERIC,
  geweke_z_score NUMERIC,
  effective_sample_size NUMERIC,
  mc_error NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create criteria table for each decision
CREATE TABLE public.decision_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  importance NUMERIC NOT NULL DEFAULT 50,
  description TEXT,
  is_ai_suggested BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evaluations table for each criterion
CREATE TABLE public.decision_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.decision_criteria(id) ON DELETE CASCADE,
  supports_decision BOOLEAN NOT NULL,
  strength NUMERIC NOT NULL,
  confidence NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS policies for decisions
CREATE POLICY "Users can view their own decisions" 
  ON public.decisions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own decisions" 
  ON public.decisions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decisions" 
  ON public.decisions FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own decisions" 
  ON public.decisions FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for criteria (through decision ownership)
CREATE POLICY "Users can view criteria for their decisions" 
  ON public.decision_criteria FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.decisions 
    WHERE decisions.id = decision_criteria.decision_id 
    AND decisions.user_id = auth.uid()
  ));

CREATE POLICY "Users can create criteria for their decisions" 
  ON public.decision_criteria FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.decisions 
    WHERE decisions.id = decision_criteria.decision_id 
    AND decisions.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete criteria for their decisions" 
  ON public.decision_criteria FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.decisions 
    WHERE decisions.id = decision_criteria.decision_id 
    AND decisions.user_id = auth.uid()
  ));

-- RLS policies for evaluations (through decision ownership)
CREATE POLICY "Users can view evaluations for their decisions" 
  ON public.decision_evaluations FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.decisions 
    WHERE decisions.id = decision_evaluations.decision_id 
    AND decisions.user_id = auth.uid()
  ));

CREATE POLICY "Users can create evaluations for their decisions" 
  ON public.decision_evaluations FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.decisions 
    WHERE decisions.id = decision_evaluations.decision_id 
    AND decisions.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete evaluations for their decisions" 
  ON public.decision_evaluations FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.decisions 
    WHERE decisions.id = decision_evaluations.decision_id 
    AND decisions.user_id = auth.uid()
  ));

-- Create indexes for better query performance
CREATE INDEX idx_decisions_user_id ON public.decisions(user_id);
CREATE INDEX idx_decisions_created_at ON public.decisions(created_at DESC);
CREATE INDEX idx_decision_criteria_decision_id ON public.decision_criteria(decision_id);
CREATE INDEX idx_decision_evaluations_decision_id ON public.decision_evaluations(decision_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();