import { EvidenceItem } from '@/types/decision';
import jStat from 'jstat';

const MONTE_CARLO_SAMPLES = 10000;

/**
 * Performs Monte Carlo Bayesian inference using beta distributions.
 * 
 * The prior is modeled as a Beta distribution parameterized from the user's
 * initial confidence. Evidence updates the distribution through likelihood weighting.
 */
export function calculatePosterior(
  prior: number,
  evidence: EvidenceItem[]
): { posterior: number; credibleInterval: [number, number]; samples: number[] } {
  // Convert prior percentage to probability
  const priorProb = prior / 100;
  
  // Parameterize beta distribution from prior
  // Using a concentration of 10 gives reasonable uncertainty around the prior
  const concentration = 10;
  let alpha = priorProb * concentration;
  let beta = (1 - priorProb) * concentration;
  
  // Ensure valid parameters
  alpha = Math.max(0.5, alpha);
  beta = Math.max(0.5, beta);

  if (evidence.length === 0) {
    // No evidence: sample from prior
    const samples = sampleBeta(alpha, beta, MONTE_CARLO_SAMPLES);
    const posterior = mean(samples) * 100;
    const credibleInterval = computeCredibleInterval(samples);
    
    return {
      posterior,
      credibleInterval: [credibleInterval[0] * 100, credibleInterval[1] * 100],
      samples: samples.map(s => s * 100),
    };
  }

  // Update beta parameters based on evidence using pseudo-observations
  evidence.forEach((item) => {
    const weight = item.weight / 100;
    const value = item.value / 100;
    
    // Convert evidence to pseudo-observations
    // Higher weight = more pseudo-observations
    const pseudoCount = weight * 5; // Scale factor for evidence strength
    
    // Evidence supporting the hypothesis adds to alpha
    // Evidence against adds to beta
    const support = value * pseudoCount;
    const against = (1 - value) * pseudoCount;
    
    alpha += support;
    beta += against;
  });

  // Monte Carlo sampling from posterior beta distribution
  const samples = sampleBeta(alpha, beta, MONTE_CARLO_SAMPLES);
  
  // Compute statistics from samples
  const posterior = mean(samples) * 100;
  const credibleInterval = computeCredibleInterval(samples);

  return {
    posterior: Math.max(1, Math.min(99, posterior)),
    credibleInterval: [
      Math.max(0, credibleInterval[0] * 100),
      Math.min(100, credibleInterval[1] * 100),
    ],
    samples: samples.map(s => s * 100),
  };
}

/**
 * Sample from a Beta distribution using jStat
 */
function sampleBeta(alpha: number, beta: number, n: number): number[] {
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    samples.push(jStat.beta.sample(alpha, beta));
  }
  return samples;
}

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
