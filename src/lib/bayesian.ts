import { EvidenceItem, CriterionEvaluation, Criterion } from '@/types/decision';
import jStat from 'jstat';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/** Number of Monte Carlo samples for posterior estimation */
export const MONTE_CARLO_SAMPLES = 10000;

/** 
 * Base scale factor for converting evidence to pseudo-observations.
 * Higher values = each piece of evidence has more impact on the posterior.
 * Calibrated empirically: 3 strong pieces of evidence should shift posterior ~20-30%
 */
export const EVIDENCE_STRENGTH_SCALE = 5;

/**
 * Default concentration for prior Beta distribution.
 * Lower = more diffuse prior (less confident in initial estimate)
 * Higher = more concentrated prior (more confident in initial estimate)
 * 
 * Visualization reference:
 * - concentration = 2:  Beta(1,1) = uniform, very uncertain
 * - concentration = 10: Beta(5,5) = moderate certainty
 * - concentration = 20: Beta(10,10) = quite certain
 */
export const DEFAULT_PRIOR_CONCENTRATION = 10;

/** Minimum alpha/beta to prevent numerical instability */
const MIN_BETA_PARAM = 0.5;

/** Number of batches for Geweke convergence diagnostic */
const GEWEKE_BATCHES = 10;

/** Threshold for Geweke z-score (|z| < 1.96 indicates convergence at 95% level) */
const GEWEKE_THRESHOLD = 1.96;

// ============================================================================
// TYPES
// ============================================================================

export interface BayesianConfig {
  /** Scale factor for evidence strength (default: EVIDENCE_STRENGTH_SCALE) */
  evidenceStrengthScale?: number;
  /** Prior concentration - higher = more confident in prior (default: DEFAULT_PRIOR_CONCENTRATION) */
  priorConcentration?: number;
  /** Whether to apply correlation adjustments to evidence */
  applyCorrelationAdjustment?: boolean;
  /** Use quasi-random sampling for variance reduction (default: true) */
  useQuasiRandom?: boolean;
}

export interface PosteriorResult {
  posterior: number;
  credibleInterval: [number, number];
  samples: number[];
  convergenceDiagnostic?: ConvergenceDiagnostic;
}

export interface ConvergenceDiagnostic {
  gewekeZScore: number;
  isConverged: boolean;
  effectiveSampleSize: number;
  mcError: number; // Monte Carlo standard error
}

export interface EvaluationPosteriorResult extends PosteriorResult {
  winPercentage: number;
  sensitivityAnalysis?: SensitivityItem[];
}

export interface SensitivityItem {
  criterionId: string;
  criterionName: string;
  impact: number; // Change in posterior when this criterion is removed
  direction: 'supporting' | 'opposing';
}

export interface CorrelationGroup {
  ids: string[]; // IDs of correlated evidence/evaluations
  correlationFactor: number; // 0-1, how correlated they are (1 = identical)
}

// ============================================================================
// QUASI-RANDOM SAMPLING (SOBOL-LIKE SEQUENCES)
// ============================================================================

/**
 * Van der Corput sequence generator for quasi-random numbers.
 * Provides more uniform coverage than pseudo-random numbers,
 * reducing Monte Carlo variance by up to 50%.
 */
function vanDerCorput(n: number, base: number = 2): number {
  let result = 0;
  let f = 1 / base;
  let i = n;
  
  while (i > 0) {
    result += f * (i % base);
    i = Math.floor(i / base);
    f /= base;
  }
  
  return result;
}

/**
 * Generates quasi-random samples using Halton sequence (generalized van der Corput).
 * Uses base 2 for the primary dimension.
 */
function generateQuasiRandomSequence(n: number): number[] {
  const sequence: number[] = [];
  // Start from a random offset to avoid correlation across runs
  const offset = Math.floor(Math.random() * 1000);
  
  for (let i = 0; i < n; i++) {
    sequence.push(vanDerCorput(i + offset + 1, 2));
  }
  
  return sequence;
}

// ============================================================================
// LOG-SPACE BETA CALCULATIONS
// ============================================================================

/**
 * Computes log of the Beta function B(a,b) = Gamma(a)*Gamma(b)/Gamma(a+b)
 * Using log-gamma for numerical stability with extreme parameters.
 */
function logBeta(alpha: number, beta: number): number {
  return jStat.gammaln(alpha) + jStat.gammaln(beta) - jStat.gammaln(alpha + beta);
}

/**
 * Computes log of the Beta PDF: log(x^(a-1) * (1-x)^(b-1) / B(a,b))
 * Stable for extreme alpha/beta values where direct computation would overflow.
 */
function logBetaPdf(x: number, alpha: number, beta: number): number {
  if (x <= 0 || x >= 1) return -Infinity;
  
  return (alpha - 1) * Math.log(x) + 
         (beta - 1) * Math.log(1 - x) - 
         logBeta(alpha, beta);
}

/**
 * Sample from Beta distribution using inverse CDF with quasi-random input.
 * Falls back to log-space rejection sampling for extreme parameters.
 */
function sampleBetaStable(
  alpha: number, 
  beta: number, 
  n: number, 
  useQuasiRandom: boolean = true
): number[] {
  const samples: number[] = [];
  
  // For moderate parameters, use standard sampling with optional quasi-random input
  if (alpha >= 0.1 && beta >= 0.1 && alpha <= 1000 && beta <= 1000) {
    if (useQuasiRandom) {
      const quasiUniform = generateQuasiRandomSequence(n);
      for (let i = 0; i < n; i++) {
        // Use inverse CDF (quantile function) with quasi-random input
        samples.push(jStat.beta.inv(quasiUniform[i], alpha, beta));
      }
    } else {
      for (let i = 0; i < n; i++) {
        samples.push(jStat.beta.sample(alpha, beta));
      }
    }
    return samples;
  }
  
  // For extreme parameters, use log-space acceptance-rejection
  // This prevents overflow/underflow issues
  const mode = alpha > 1 && beta > 1 
    ? (alpha - 1) / (alpha + beta - 2) 
    : (alpha >= beta ? 0.99 : 0.01);
  
  const logPdfMode = logBetaPdf(mode, alpha, beta);
  
  let attempts = 0;
  const maxAttempts = n * 100;
  
  while (samples.length < n && attempts < maxAttempts) {
    attempts++;
    // Sample from a proposal distribution (uniform)
    const x = Math.random();
    const logPdfX = logBetaPdf(x, alpha, beta);
    
    // Accept with probability proportional to the density ratio
    const logAcceptProb = logPdfX - logPdfMode;
    if (Math.log(Math.random()) < logAcceptProb) {
      samples.push(x);
    }
  }
  
  // If we couldn't get enough samples, fall back to jStat
  while (samples.length < n) {
    try {
      samples.push(jStat.beta.sample(alpha, beta));
    } catch {
      // Ultimate fallback: use the mode
      samples.push(mode);
    }
  }
  
  return samples;
}

// ============================================================================
// CONVERGENCE DIAGNOSTICS
// ============================================================================

/**
 * Computes Geweke convergence diagnostic.
 * Compares mean of first 10% of samples to last 50%.
 * A z-score near 0 indicates the chain has converged.
 */
function computeGewekeDiagnostic(samples: number[]): number {
  const n = samples.length;
  const firstPct = 0.1;
  const lastPct = 0.5;
  
  const firstN = Math.floor(n * firstPct);
  const lastN = Math.floor(n * lastPct);
  
  const firstSamples = samples.slice(0, firstN);
  const lastSamples = samples.slice(n - lastN);
  
  const mean1 = mean(firstSamples);
  const mean2 = mean(lastSamples);
  
  const var1 = variance(firstSamples);
  const var2 = variance(lastSamples);
  
  // Spectral density at frequency 0 (simplified - using sample variance)
  const se1 = Math.sqrt(var1 / firstN);
  const se2 = Math.sqrt(var2 / lastN);
  
  const z = (mean1 - mean2) / Math.sqrt(se1 * se1 + se2 * se2);
  
  return isNaN(z) ? 0 : z;
}

/**
 * Computes effective sample size (ESS) accounting for autocorrelation.
 * ESS indicates how many independent samples the chain represents.
 */
function computeEffectiveSampleSize(samples: number[]): number {
  const n = samples.length;
  if (n < 10) return n;
  
  const sampleMean = mean(samples);
  const sampleVar = variance(samples);
  
  if (sampleVar === 0) return n;
  
  // Compute autocorrelation at lag 1
  let autoCorr = 0;
  for (let i = 0; i < n - 1; i++) {
    autoCorr += (samples[i] - sampleMean) * (samples[i + 1] - sampleMean);
  }
  autoCorr /= ((n - 1) * sampleVar);
  
  // Simplified ESS formula: n / (1 + 2*rho)
  // where rho is the first-order autocorrelation
  const rho = Math.max(-0.5, Math.min(0.99, autoCorr)); // Clamp for stability
  const ess = n / (1 + 2 * rho);
  
  return Math.max(1, Math.round(ess));
}

/**
 * Computes Monte Carlo standard error.
 * This is the uncertainty in the posterior mean estimate due to finite sampling.
 */
function computeMCError(samples: number[], ess: number): number {
  const sampleVar = variance(samples);
  return Math.sqrt(sampleVar / ess);
}

/**
 * Full convergence diagnostic suite.
 */
function computeConvergenceDiagnostic(samples: number[]): ConvergenceDiagnostic {
  const gewekeZ = computeGewekeDiagnostic(samples);
  const ess = computeEffectiveSampleSize(samples);
  const mcError = computeMCError(samples, ess);
  
  return {
    gewekeZScore: Math.round(gewekeZ * 100) / 100,
    isConverged: Math.abs(gewekeZ) < GEWEKE_THRESHOLD,
    effectiveSampleSize: ess,
    mcError: Math.round(mcError * 1000) / 1000,
  };
}

// ============================================================================
// CORE BAYESIAN FUNCTIONS
// ============================================================================

/**
 * Computes the effective weight for evidence, accounting for correlation.
 * Correlated evidence provides less new information, so we reduce its weight.
 * 
 * @param baseWeight - Original weight of the evidence
 * @param correlationFactor - 0 = independent, 1 = fully correlated
 * @param groupSize - Number of items in the correlation group
 */
function computeCorrelationAdjustedWeight(
  baseWeight: number,
  correlationFactor: number,
  groupSize: number
): number {
  if (groupSize <= 1 || correlationFactor === 0) return baseWeight;
  
  // With n correlated items at correlation r, effective count ≈ 1 + (n-1)*(1-r)
  // This means fully correlated items count as 1, independent items count as n
  const effectiveCount = 1 + (groupSize - 1) * (1 - correlationFactor);
  const adjustmentFactor = effectiveCount / groupSize;
  
  return baseWeight * adjustmentFactor;
}

/**
 * Performs Monte Carlo Bayesian inference using beta distributions.
 * 
 * The prior is modeled as a Beta distribution parameterized from the user's
 * initial confidence. Evidence updates the distribution through likelihood weighting.
 */
export function calculatePosterior(
  prior: number,
  evidence: EvidenceItem[],
  config: BayesianConfig = {}
): PosteriorResult {
  const {
    evidenceStrengthScale = EVIDENCE_STRENGTH_SCALE,
    priorConcentration = DEFAULT_PRIOR_CONCENTRATION,
    useQuasiRandom = true,
  } = config;

  // Convert prior percentage to probability
  const priorProb = prior / 100;
  
  // Parameterize beta distribution from prior
  let alpha = Math.max(MIN_BETA_PARAM, priorProb * priorConcentration);
  let beta = Math.max(MIN_BETA_PARAM, (1 - priorProb) * priorConcentration);

  if (evidence.length === 0) {
    const samples = sampleBetaStable(alpha, beta, MONTE_CARLO_SAMPLES, useQuasiRandom);
    const posterior = mean(samples) * 100;
    const credibleInterval = computeCredibleInterval(samples);
    const convergenceDiagnostic = computeConvergenceDiagnostic(samples);
    
    return {
      posterior,
      credibleInterval: [credibleInterval[0] * 100, credibleInterval[1] * 100],
      samples: samples.map(s => s * 100),
      convergenceDiagnostic,
    };
  }

  // Update beta parameters based on evidence using pseudo-observations
  evidence.forEach((item) => {
    const weight = item.weight / 100;
    const value = item.value / 100;
    
    // Convert evidence to pseudo-observations
    const pseudoCount = weight * evidenceStrengthScale;
    
    // Evidence supporting the hypothesis adds to alpha
    // Evidence against adds to beta
    const support = value * pseudoCount;
    const against = (1 - value) * pseudoCount;
    
    alpha += support;
    beta += against;
  });

  // Monte Carlo sampling from posterior beta distribution
  const samples = sampleBetaStable(alpha, beta, MONTE_CARLO_SAMPLES, useQuasiRandom);
  
  // Compute statistics from samples
  const posterior = mean(samples) * 100;
  const credibleInterval = computeCredibleInterval(samples);
  const convergenceDiagnostic = computeConvergenceDiagnostic(samples);

  return {
    posterior: Math.max(1, Math.min(99, posterior)),
    credibleInterval: [
      Math.max(0, credibleInterval[0] * 100),
      Math.min(100, credibleInterval[1] * 100),
    ],
    samples: samples.map(s => s * 100),
    convergenceDiagnostic,
  };
}

/**
 * Computes the pseudo-count for a single criterion evaluation.
 * 
 * Formula rationale:
 * - strength: How strongly does this criterion favor one option? (1-100)
 * - confidence: How sure are we about this evaluation? (1-100)
 * - importance: How much does this criterion matter overall? (1-100)
 * 
 * Confidence affects the WEIGHT of the evidence (less confident = less pseudo-observations)
 * Strength affects the VALUE of the evidence (weak = closer to 50/50)
 * 
 * This is conceptually different from the old formula where both multiplied into weight.
 */
function computeEvaluationPseudoCount(
  strength: number,
  confidence: number,
  importance: number,
  scale: number
): { pseudoCount: number; evidenceStrength: number } {
  // Confidence determines how many pseudo-observations this evaluation contributes
  // High confidence = more pseudo-observations = tighter posterior
  const confidenceFactor = confidence / 100;
  const importanceFactor = importance / 100;
  const pseudoCount = confidenceFactor * importanceFactor * scale;
  
  // Strength determines how much the pseudo-observations favor one side
  // 100 = all favor decision, 0 = all favor status quo, 50 = neutral
  const evidenceStrength = strength / 100;
  
  return { pseudoCount, evidenceStrength };
}

/**
 * Calculate posterior from criteria evaluations with optional correlation handling.
 */
export function calculatePosteriorFromEvaluations(
  prior: number,
  evaluations: CriterionEvaluation[],
  criteria: Criterion[],
  config: BayesianConfig = {},
  correlationGroups: CorrelationGroup[] = []
): EvaluationPosteriorResult {
  const {
    evidenceStrengthScale = EVIDENCE_STRENGTH_SCALE,
    priorConcentration = DEFAULT_PRIOR_CONCENTRATION,
    applyCorrelationAdjustment = false,
    useQuasiRandom = true,
  } = config;

  const priorProb = prior / 100;
  let alpha = Math.max(MIN_BETA_PARAM, priorProb * priorConcentration);
  let beta = Math.max(MIN_BETA_PARAM, (1 - priorProb) * priorConcentration);

  if (evaluations.length === 0) {
    const samples = sampleBetaStable(alpha, beta, MONTE_CARLO_SAMPLES, useQuasiRandom);
    const posterior = mean(samples) * 100;
    const credibleInterval = computeCredibleInterval(samples);
    const winPercentage = samples.filter(s => s > 0.5).length / samples.length * 100;
    const convergenceDiagnostic = computeConvergenceDiagnostic(samples);
    
    return {
      posterior,
      credibleInterval: [credibleInterval[0] * 100, credibleInterval[1] * 100],
      samples: samples.map(s => s * 100),
      winPercentage,
      sensitivityAnalysis: [],
      convergenceDiagnostic,
    };
  }

  // Build a map of criterionId -> correlation adjustment factor
  const correlationAdjustments = new Map<string, number>();
  if (applyCorrelationAdjustment && correlationGroups.length > 0) {
    correlationGroups.forEach(group => {
      group.ids.forEach(id => {
        const adjustment = computeCorrelationAdjustedWeight(1, group.correlationFactor, group.ids.length);
        correlationAdjustments.set(id, adjustment);
      });
    });
  }

  // Update based on evaluations
  evaluations.forEach((evaluation) => {
    const criterion = criteria.find(c => c.id === evaluation.criterionId);
    const importance = criterion?.importance ?? 50;
    
    const { pseudoCount, evidenceStrength } = computeEvaluationPseudoCount(
      evaluation.strength,
      evaluation.confidence,
      importance,
      evidenceStrengthScale
    );
    
    // Apply correlation adjustment if enabled
    const correlationMultiplier = correlationAdjustments.get(evaluation.criterionId) ?? 1;
    const adjustedPseudoCount = pseudoCount * correlationMultiplier;
    
    if (evaluation.supportsDecision) {
      // Supporting evidence: strength determines how strongly it supports
      alpha += evidenceStrength * adjustedPseudoCount;
      beta += (1 - evidenceStrength) * adjustedPseudoCount;
    } else {
      // Opposing evidence: strength determines how strongly it opposes
      beta += evidenceStrength * adjustedPseudoCount;
      alpha += (1 - evidenceStrength) * adjustedPseudoCount;
    }
  });

  // Monte Carlo sampling
  const samples = sampleBetaStable(alpha, beta, MONTE_CARLO_SAMPLES, useQuasiRandom);
  
  // Win percentage = how often decision beats status quo (>50%)
  const winPercentage = samples.filter(s => s > 0.5).length / samples.length * 100;
  
  const posterior = mean(samples) * 100;
  const credibleInterval = computeCredibleInterval(samples);
  const convergenceDiagnostic = computeConvergenceDiagnostic(samples);

  // Perform sensitivity analysis (leave-one-out)
  const sensitivityAnalysis = computeSensitivityAnalysis(
    prior,
    evaluations,
    criteria,
    posterior,
    config
  );

  return {
    posterior: Math.max(1, Math.min(99, posterior)),
    credibleInterval: [
      Math.max(0, credibleInterval[0] * 100),
      Math.min(100, credibleInterval[1] * 100),
    ],
    samples: samples.map(s => s * 100),
    winPercentage: Math.round(winPercentage),
    sensitivityAnalysis,
    convergenceDiagnostic,
  };
}

// ============================================================================
// SENSITIVITY ANALYSIS
// ============================================================================

/**
 * Performs leave-one-out sensitivity analysis.
 * For each criterion, computes how the posterior would change if that criterion were removed.
 * This reveals which criteria have the most influence on the final decision.
 */
function computeSensitivityAnalysis(
  prior: number,
  evaluations: CriterionEvaluation[],
  criteria: Criterion[],
  fullPosterior: number,
  config: BayesianConfig
): SensitivityItem[] {
  if (evaluations.length <= 1) {
    return [];
  }

  return evaluations.map(evaluation => {
    const criterion = criteria.find(c => c.id === evaluation.criterionId);
    
    // Calculate posterior without this evaluation
    const reducedEvaluations = evaluations.filter(e => e.criterionId !== evaluation.criterionId);
    const reducedResult = calculatePosteriorFromEvaluationsInternal(
      prior,
      reducedEvaluations,
      criteria,
      config
    );
    
    // Impact = how much the posterior changes when this criterion is removed
    const impact = fullPosterior - reducedResult.posterior;
    
    const direction: 'supporting' | 'opposing' = evaluation.supportsDecision ? 'supporting' : 'opposing';
    return {
      criterionId: evaluation.criterionId,
      criterionName: criterion?.name ?? 'Unknown',
      impact: Math.round(impact * 10) / 10, // Round to 1 decimal
      direction,
    };
  }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)); // Sort by absolute impact
}

/**
 * Internal version that doesn't compute sensitivity (to avoid recursion)
 */
function calculatePosteriorFromEvaluationsInternal(
  prior: number,
  evaluations: CriterionEvaluation[],
  criteria: Criterion[],
  config: BayesianConfig
): { posterior: number } {
  const {
    evidenceStrengthScale = EVIDENCE_STRENGTH_SCALE,
    priorConcentration = DEFAULT_PRIOR_CONCENTRATION,
    useQuasiRandom = true,
  } = config;

  const priorProb = prior / 100;
  let alpha = Math.max(MIN_BETA_PARAM, priorProb * priorConcentration);
  let beta = Math.max(MIN_BETA_PARAM, (1 - priorProb) * priorConcentration);

  evaluations.forEach((evaluation) => {
    const criterion = criteria.find(c => c.id === evaluation.criterionId);
    const importance = criterion?.importance ?? 50;
    
    const { pseudoCount, evidenceStrength } = computeEvaluationPseudoCount(
      evaluation.strength,
      evaluation.confidence,
      importance,
      evidenceStrengthScale
    );
    
    if (evaluation.supportsDecision) {
      alpha += evidenceStrength * pseudoCount;
      beta += (1 - evidenceStrength) * pseudoCount;
    } else {
      beta += evidenceStrength * pseudoCount;
      alpha += (1 - evidenceStrength) * pseudoCount;
    }
  });

  const samples = sampleBetaStable(alpha, beta, MONTE_CARLO_SAMPLES, useQuasiRandom);
  return { posterior: mean(samples) * 100 };
}

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

/**
 * Compute 95% credible interval from samples
 */
function computeCredibleInterval(samples: number[]): [number, number] {
  const sorted = [...samples].sort((a, b) => a - b);
  const lowerIdx = Math.floor(samples.length * 0.025);
  const upperIdx = Math.floor(samples.length * 0.975);
  return [sorted[lowerIdx], sorted[upperIdx]];
}

/**
 * Compute mean of samples
 */
function mean(samples: number[]): number {
  return samples.reduce((sum, val) => sum + val, 0) / samples.length;
}

/**
 * Compute variance of samples (unbiased estimator)
 */
function variance(samples: number[]): number {
  const n = samples.length;
  if (n < 2) return 0;
  
  const m = mean(samples);
  const sumSq = samples.reduce((sum, val) => sum + (val - m) ** 2, 0);
  return sumSq / (n - 1);
}

// ============================================================================
// UI HELPERS
// ============================================================================

export function getConfidenceLabel(confidence: number): string {
  if (confidence < 20) return 'Very Low';
  if (confidence < 40) return 'Low';
  if (confidence < 60) return 'Moderate';
  if (confidence < 80) return 'High';
  return 'Very High';
}

export function getConfidenceColor(confidence: number): string {
  if (confidence < 35) return 'text-confidence-low';
  if (confidence < 65) return 'text-confidence-mid';
  return 'text-confidence-high';
}

/**
 * Generate distribution data from Monte Carlo samples using kernel density estimation
 */
export function generateDistributionData(
  mean: number, 
  interval: [number, number],
  samples?: number[]
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  
  if (samples && samples.length > 0) {
    // Use kernel density estimation on actual samples
    const bandwidth = 3; // Smoothing parameter
    
    for (let x = 0; x <= 100; x += 1) {
      let density = 0;
      for (const sample of samples) {
        const z = (x - sample) / bandwidth;
        density += Math.exp(-0.5 * z * z);
      }
      density /= (samples.length * bandwidth * Math.sqrt(2 * Math.PI));
      points.push({ x, y: density * 1000 }); // Scale for visualization
    }
  } else {
    // Fallback to normal approximation
    const stdDev = (interval[1] - interval[0]) / 4;
    
    for (let x = 0; x <= 100; x += 2) {
      const z = (x - mean) / (stdDev || 1);
      const y = Math.exp(-0.5 * z * z) / (stdDev * Math.sqrt(2 * Math.PI) || 1);
      points.push({ x, y: y * 100 });
    }
  }
  
  return points;
}
