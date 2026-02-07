import { useEffect, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MonteCarloVisualizationProps {
  isRunning: boolean;
  onComplete?: () => void;
  duration?: number; // Total animation duration in ms
  pathCount?: number; // Total paths to draw
}

interface Path {
  id: number;
  points: { x: number; y: number }[];
  startTime: number;
  opacity: number;
  isHighlighted?: boolean;
}

const TOTAL_SIMULATIONS = 10000;

export function MonteCarloVisualization({ 
  isRunning, 
  onComplete,
  duration = 7000,
  pathCount = 300
}: MonteCarloVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathsRef = useRef<Path[]>([]);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const pathIdRef = useRef<number>(0);
  const phaseRef = useRef<'intro' | 'running' | 'complete'>('intro');
  const [simulationCount, setSimulationCount] = useState(0);
  const [displayPhase, setDisplayPhase] = useState<'intro' | 'running' | 'complete'>('intro');

  // Generate a wiggly path using random walk with drift
  const generatePath = useCallback((width: number, height: number): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [];
    const steps = 60;
    const startY = height * 0.85;
    const endY = height * 0.15;
    
    let x = 0;
    let y = startY;
    
    const targetY = endY + (Math.random() * 0.4 + 0.3) * (startY - endY) * (Math.random() < 0.7 ? 0.5 : 1);
    const yDrift = (targetY - startY) / steps;
    const volatility = 15 + Math.random() * 35;
    
    for (let i = 0; i <= steps; i++) {
      points.push({ x, y });
      x += width / steps;
      const noise = (Math.random() - 0.5) * volatility;
      y += yDrift + noise;
      y = Math.max(height * 0.05, Math.min(height * 0.95, y));
    }
    
    return points;
  }, []);

  // Draw a single path with smooth curves
  const drawPath = useCallback((
    ctx: CanvasRenderingContext2D, 
    points: { x: number; y: number }[], 
    opacity: number,
    progress: number,
    isHighlighted: boolean = false
  ) => {
    if (points.length < 2 || opacity <= 0) return;
    
    const pointsToDraw = Math.floor(points.length * progress);
    if (pointsToDraw < 2) return;
    
    ctx.beginPath();
    
    if (isHighlighted) {
      // Brighter, thicker line for the "current" simulation
      ctx.strokeStyle = `hsla(187, 90%, 70%, ${opacity * 0.8})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'hsla(187, 80%, 60%, 0.5)';
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = `hsla(187, 80%, 60%, ${opacity * 0.12})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    }
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < pointsToDraw; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }
    
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setSimulationCount(0);
      phaseRef.current = 'intro';
      setDisplayPhase('intro');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();

    pathsRef.current = [];
    pathIdRef.current = 0;
    startTimeRef.current = performance.now();
    phaseRef.current = 'intro';
    setDisplayPhase('intro');

    // Intro delay before starting
    const introDelay = 800;
    const pathDrawDuration = 600;
    const fadeOutDuration = 1500;
    
    // Easing function for path spawning - starts slow, speeds up
    const getExpectedPaths = (elapsed: number): number => {
      if (elapsed < introDelay) return 0;
      const t = (elapsed - introDelay) / duration;
      // Ease-in curve: slow start, fast finish
      const eased = t * t * t;
      return Math.min(pathCount, Math.floor(eased * pathCount * 1.5));
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const rect = canvas.getBoundingClientRect();
      
      // Update phase (use ref to avoid re-triggering effect)
      if (elapsed >= introDelay && phaseRef.current === 'intro') {
        phaseRef.current = 'running';
        setDisplayPhase('running');
      }
      
      // Clear canvas with fade
      ctx.fillStyle = 'hsla(222, 47%, 6%, 0.12)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Add new paths with easing
      const expectedPaths = getExpectedPaths(elapsed);
      while (pathsRef.current.length < expectedPaths) {
        // Mark previous highlighted path as normal
        pathsRef.current.forEach(p => p.isHighlighted = false);
        
        pathsRef.current.push({
          id: pathIdRef.current++,
          points: generatePath(rect.width, rect.height),
          startTime: currentTime,
          opacity: 1,
          isHighlighted: true
        });
      }

      // Update simulation counter (scaled to represent 10,000)
      const displayCount = Math.min(
        TOTAL_SIMULATIONS,
        Math.floor((pathsRef.current.length / pathCount) * TOTAL_SIMULATIONS)
      );
      setSimulationCount(displayCount);

      // Draw paths (non-highlighted first, then highlighted on top)
      const nonHighlighted = pathsRef.current.filter(p => !p.isHighlighted);
      const highlighted = pathsRef.current.filter(p => p.isHighlighted);
      
      [...nonHighlighted, ...highlighted].forEach(path => {
        const pathAge = currentTime - path.startTime;
        const drawProgress = Math.min(1, pathAge / pathDrawDuration);
        
        if (pathAge > pathDrawDuration) {
          const fadeAge = pathAge - pathDrawDuration;
          path.opacity = Math.max(0, 1 - fadeAge / fadeOutDuration);
        }
        
        drawPath(ctx, path.points, path.opacity, drawProgress, path.isHighlighted);
      });
      
      // Filter out faded paths
      pathsRef.current = pathsRef.current.filter(p => p.opacity > 0);

      // Check if animation is complete
      if (elapsed >= introDelay + duration + pathDrawDuration + fadeOutDuration) {
        phaseRef.current = 'complete';
        setDisplayPhase('complete');
        onComplete?.();
        return;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, duration, pathCount, generatePath, drawPath, onComplete]);

  if (!isRunning) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Header explanation */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <p className="font-mono text-xs text-muted-foreground tracking-wider mb-1">
            MONTE CARLO SIMULATION
          </p>
          <p className="text-sm text-foreground/80">
            Testing your decision across thousands of possible futures
          </p>
        </motion.div>
      </div>

      {/* Live counter */}
      <div className="relative z-10 text-center">
        <AnimatePresence mode="wait">
          {displayPhase === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <p className="font-mono text-lg text-primary mb-2">Initializing simulation...</p>
              <p className="text-sm text-muted-foreground">
                Each line = one possible outcome
              </p>
            </motion.div>
          )}
          
          {displayPhase === 'running' && (
            <motion.div
              key="running"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="font-mono text-xs text-muted-foreground">SCENARIO</span>
                <motion.span 
                  key={simulationCount}
                  initial={{ opacity: 0.5, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-mono text-5xl md:text-6xl font-bold text-primary tabular-nums"
                >
                  {simulationCount.toLocaleString()}
                </motion.span>
                <span className="font-mono text-lg text-muted-foreground">
                  / {TOTAL_SIMULATIONS.toLocaleString()}
                </span>
              </div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.5 }}
                className="text-sm text-muted-foreground"
              >
                ↑ bright line = current simulation
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legend at bottom */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-primary/30" />
            <span>Past simulations</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-primary shadow-[0_0_8px_hsl(187,80%,60%)]" />
            <span>Current simulation</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
