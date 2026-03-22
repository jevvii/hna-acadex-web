'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CircularScoreProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function CircularScore({
  score,
  maxScore = 100,
  size = 120,
  strokeWidth = 8,
  className,
}: CircularScoreProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max((score / maxScore) * 100, 0), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 90) return '#10B981'; // emerald-500
    if (percentage >= 80) return '#3B82F6'; // blue-500
    if (percentage >= 70) return '#F59E0B'; // amber-500
    return '#EF4444'; // red-500
  };

  const color = getColor();

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="font-display text-2xl font-bold"
          style={{ color }}
        >
          {Math.round(score)}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-gray-400"
        >
          / {maxScore}
        </motion.span>
      </div>
    </div>
  );
}

// Simple score badge variant
interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreBadge({ score, maxScore = 100, size = 'md' }: ScoreBadgeProps) {
  const percentage = (score / maxScore) * 100;

  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-xl',
    lg: 'w-20 h-20 text-2xl',
  };

  const getBgColor = () => {
    if (percentage >= 90) return 'bg-emerald-100 text-emerald-700';
    if (percentage >= 80) return 'bg-blue-100 text-blue-700';
    if (percentage >= 70) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-display font-bold',
        sizeClasses[size],
        getBgColor()
      )}
    >
      {Math.round(score)}
    </div>
  );
}
