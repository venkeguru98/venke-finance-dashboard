import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Layers, CheckSquare, Calendar, Bell } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../ui/Button';

interface PlannerEmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  iconType?: 'sparkles' | 'notes' | 'tasks' | 'calendar' | 'reminders';
}

export default function PlannerEmptyState({
  title,
  description,
  actionText,
  onAction,
  iconType = 'sparkles'
}: PlannerEmptyStateProps) {
  const { themeData } = useTheme();

  const renderIcon = () => {
    switch (iconType) {
      case 'notes':
        return <Layers className="w-7 h-7" />;
      case 'tasks':
        return <CheckSquare className="w-7 h-7" />;
      case 'calendar':
        return <Calendar className="w-7 h-7" />;
      case 'reminders':
        return <Bell className="w-7 h-7" />;
      default:
        return <Sparkles className="w-7 h-7" />;
    }
  };

  return (
    <div 
      style={{ backgroundColor: `${themeData.bgCard}B0`, borderColor: themeData.borderColor }}
      className="planner-glass-surface rounded-3xl p-12 text-center space-y-4 border shadow-xl relative overflow-hidden backdrop-blur-2xl"
    >
      {/* Soft Radial Ambient Glow */}
      <div 
        style={{
          background: `radial-gradient(circle, ${themeData.accentPrimary}30 0%, transparent 70%)`
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40 animate-pulse"
      />

      {/* Floating Animated Icon Container */}
      <motion.div
        animate={{ y: [-4, 4, -4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ 
          backgroundColor: `${themeData.accentPrimary}20`,
          borderColor: `${themeData.accentPrimary}40`,
          color: themeData.accentPrimary 
        }}
        className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center border shadow-inner relative z-10"
      >
        {renderIcon()}
      </motion.div>

      <div className="space-y-1.5 relative z-10 max-w-sm mx-auto">
        <h4 className="text-base font-black tracking-tight" style={{ color: themeData.textPrimary }}>
          {title}
        </h4>
        <p className="text-xs leading-relaxed font-medium" style={{ color: themeData.textMuted }}>
          {description}
        </p>
      </div>

      {actionText && onAction && (
        <div className="pt-2 relative z-10">
          <Button variant="primary" size="sm" onClick={onAction} className="text-xs font-bold px-5 py-2.5 shadow-lg">
            {actionText}
          </Button>
        </div>
      )}
    </div>
  );
}
