import { EvidenceItem } from '@/types/decision';

export function calculatePosterior(
  prior: number,
  evidence: EvidenceItem[]
): { posterior: number; credibleInterval: [number, number] } {
  if (evidence.length === 0) {
    return {
      posterior: prior,
      credibleInterval: [Math.max(0, prior - 15), Math.min(100, prior + 15)],
    };
  }

  // Normalize prior to log-odds
  const priorOdds = prior / (100 - prior + 0.001);
  let logOdds = Math.log(priorOdds);

  // Calculate weighted evidence impact
  let totalWeight = 0;
  let uncertaintySum = 0;

  evidence.forEach((item) => {
    const normalizedWeight = item.weight / 100;
    const normalizedValue = (item.value - 50) / 50; // Convert 0-100 to -1 to 1
    
    // Apply evidence as likelihood ratio in log-odds space
    const likelihoodImpact = normalizedValue * normalizedWeight * 2;
    logOdds += likelihoodImpact;
    
    totalWeight += normalizedWeight;
    
    // Higher weight = less uncertainty from this evidence
    // Low value or high value = more certainty
    const valueExtremity = Math.abs(normalizedValue);
    uncertaintySum += (1 - valueExtremity) * (1 - normalizedWeight) * 10;
  });

  // Convert back from log-odds to probability
  const posteriorOdds = Math.exp(logOdds);
  let posterior = (posteriorOdds / (1 + posteriorOdds)) * 100;
  
  // Clamp to valid range
  posterior = Math.max(1, Math.min(99, posterior));

  // Calculate credible interval based on evidence strength
  const avgUncertainty = evidence.length > 0 ? uncertaintySum / evidence.length : 15;
  const intervalWidth = Math.max(5, avgUncertainty);
  
  const credibleInterval: [number, number] = [
    Math.max(0, posterior - intervalWidth),
    Math.min(100, posterior + intervalWidth),
  ];

  return { posterior, credibleInterval };
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

export function generateDistributionData(mean: number, interval: [number, number]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const stdDev = (interval[1] - interval[0]) / 4;
  
  for (let x = 0; x <= 100; x += 2) {
    const z = (x - mean) / (stdDev || 1);
    const y = Math.exp(-0.5 * z * z) / (stdDev * Math.sqrt(2 * Math.PI) || 1);
    points.push({ x, y: y * 100 });
  }
  
  return points;
}
