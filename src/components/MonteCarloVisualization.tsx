import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

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
}

export function MonteCarloVisualization({ 
  isRunning, 
  onComplete,
  duration = 3000,
  pathCount = 200
}: MonteCarloVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pathsRef = useRef<Path[]>([]);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const pathIdRef = useRef<number>(0);
  const [completed, setCompleted] = useState(false);

  // Generate a wiggly path using random walk with drift
  const generatePath = useCallback((width: number, height: number): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = [];
    const steps = 60;
    const startY = height * 0.85; // Start near bottom
    const endY = height * 0.15; // End near top
    
    let x = 0;
    let y = startY;
    
    // Random final Y position (with some clustering around the middle)
    const targetY = endY + (Math.random() * 0.4 + 0.3) * (startY - endY) * (Math.random() < 0.7 ? 0.5 : 1);
    const yDrift = (targetY - startY) / steps;
    
    // Volatility varies per path
    const volatility = 15 + Math.random() * 35;
    
    for (let i = 0; i <= steps; i++) {
      points.push({ x, y });
      
      // Move right
      x += width / steps;
      
      // Random walk with drift toward target
      const noise = (Math.random() - 0.5) * volatility;
      y += yDrift + noise;
      
      // Soft bounds
      y = Math.max(height * 0.05, Math.min(height * 0.95, y));
    }
    
    return points;
  }, []);

  // Draw a single path with smooth curves
  const drawPath = useCallback((
    ctx: CanvasRenderingContext2D, 
    points: { x: number; y: number }[], 
    opacity: number,
    progress: number // 0-1, how much of the path to draw
  ) => {
    if (points.length < 2 || opacity <= 0) return;
    
    const pointsToDraw = Math.floor(points.length * progress);
    if (pointsToDraw < 2) return;
    
    ctx.beginPath();
    ctx.strokeStyle = `hsla(187, 80%, 60%, ${opacity * 0.15})`;
    ctx.lineWidth = 1;
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
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
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
    setCompleted(false);

    const pathInterval = duration / pathCount;
    const pathDrawDuration = 800; // How long each path takes to draw
    const fadeOutDuration = 2000; // How long paths take to fade

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current;
      const rect = canvas.getBoundingClientRect();
      
      // Clear canvas with slight fade for trail effect
      ctx.fillStyle = 'hsla(222, 47%, 6%, 0.15)';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Add new paths based on elapsed time
      const expectedPaths = Math.min(pathCount, Math.floor(elapsed / pathInterval));
      while (pathsRef.current.length < expectedPaths) {
        pathsRef.current.push({
          id: pathIdRef.current++,
          points: generatePath(rect.width, rect.height),
          startTime: currentTime,
          opacity: 1
        });
      }

      // Update and draw paths
      pathsRef.current = pathsRef.current.filter(path => {
        const pathAge = currentTime - path.startTime;
        const drawProgress = Math.min(1, pathAge / pathDrawDuration);
        
        // Calculate opacity based on age
        if (pathAge > pathDrawDuration) {
          const fadeAge = pathAge - pathDrawDuration;
          path.opacity = Math.max(0, 1 - fadeAge / fadeOutDuration);
        }
        
        drawPath(ctx, path.points, path.opacity, drawProgress);
        
        return path.opacity > 0;
      });

      // Check if animation is complete
      if (elapsed >= duration + pathDrawDuration + fadeOutDuration) {
        setCompleted(true);
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

  if (!isRunning && completed) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isRunning ? 1 : 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Overlay text */}
      <div className="relative z-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="font-mono text-sm text-primary/80 tracking-wider"
        >
          SIMULATING 10,000 SCENARIOS
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1 }}
          className="text-xs text-muted-foreground mt-2"
        >
          Each line represents a possible outcome
        </motion.p>
      </div>

      {/* Progress indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/50"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
