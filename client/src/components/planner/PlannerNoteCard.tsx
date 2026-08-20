import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, CheckSquare, Trash2, MoreHorizontal, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import type { PlannerNote } from '../../pages/Planner';

interface PlannerNoteCardProps {
  note: PlannerNote;
  onTogglePin: (note: PlannerNote) => void;
  onConvertToTask: (note: PlannerNote) => void;
  onDelete: (id: number) => void;
}

export default function PlannerNoteCard({
  note,
  onTogglePin,
  onConvertToTask,
  onDelete
}: PlannerNoteCardProps) {
  const { themeData } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 1. Stable Deterministic Rotation (never changes randomly across re-renders)
  const deterministicRotation = Math.sin(note.id * 888) * 1.8;

  // 2. Desktop Pointer 3D Tilt Proximity State (Max 2.5 degrees)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 12 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = (-y / (rect.height / 2)) * 2.5; // max 2.5deg
    const rotateY = (x / (rect.width / 2)) * 2.5;
    setTilt({ rotateX, rotateY, shadowX: -rotateY * 2, shadowY: 18 + rotateX * 2 });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 12 });
  };

  // 3. Sophisticated Modern Paper Color Profiles
  const getPaperProfile = (color: string) => {
    switch (color) {
      case 'amber':
      case 'gold':
        return {
          bg: 'linear-gradient(145deg, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: 'rgba(245, 158, 11, 0.45)',
          glow: 'rgba(245, 158, 11, 0.35)',
          badge: '#F59E0B'
        };
      case 'violet':
      case 'lavender':
        return {
          bg: 'linear-gradient(145deg, rgba(139, 92, 246, 0.22) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: 'rgba(139, 92, 246, 0.45)',
          glow: 'rgba(139, 92, 246, 0.35)',
          badge: '#8B5CF6'
        };
      case 'cyan':
      case 'sky':
        return {
          bg: 'linear-gradient(145deg, rgba(6, 182, 212, 0.22) 0%, rgba(6, 182, 212, 0.08) 100%)',
          border: 'rgba(6, 182, 212, 0.45)',
          glow: 'rgba(6, 182, 212, 0.35)',
          badge: '#06B6D4'
        };
      case 'emerald':
      case 'mint':
        return {
          bg: 'linear-gradient(145deg, rgba(16, 185, 129, 0.22) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: 'rgba(16, 185, 129, 0.45)',
          glow: 'rgba(16, 185, 129, 0.35)',
          badge: '#10B981'
        };
      case 'rose':
      case 'pink':
        return {
          bg: 'linear-gradient(145deg, rgba(244, 63, 94, 0.22) 0%, rgba(244, 63, 94, 0.08) 100%)',
          border: 'rgba(244, 63, 94, 0.45)',
          glow: 'rgba(244, 63, 94, 0.35)',
          badge: '#F43F5E'
        };
      default:
        return {
          bg: `linear-gradient(145deg, ${themeData.bgCard}D5 0%, ${themeData.bgSecondary}C0 100%)`,
          border: note.pinned ? themeData.accentPrimary : themeData.borderColor,
          glow: themeData.accentGlow,
          badge: themeData.accentPrimary
        };
    }
  };

  const paper = getPaperProfile(note.color);

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, scale: 0.9, y: 15, rotate: deterministicRotation }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        rotate: deterministicRotation,
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY
      }}
      exit={{ opacity: 0, scale: 0.85, y: -10 }}
      whileHover={{ y: -4 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: paper.bg,
        borderColor: note.pinned ? themeData.accentPrimary : paper.border,
        boxShadow: note.pinned 
          ? `0 16px 36px -6px ${paper.glow}, ${tilt.shadowX}px ${tilt.shadowY}px 24px -4px rgba(0, 0, 0, 0.5)` 
          : `${tilt.shadowX}px ${tilt.shadowY}px 28px -6px rgba(0, 0, 0, 0.45)`
      }}
      className="sticky-note-paper p-5.5 space-y-3.5 relative group cursor-pointer"
    >
      {/* ── Pin Tack Detail (Top Left) ─────────────────────────────────── */}
      {note.pinned ? (
        <div className="absolute -top-1.5 left-5 z-20 flex items-center justify-center">
          <span className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-purple-500 shadow-md shadow-purple-500/50 flex items-center justify-center border border-white/60 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white shadow-inner" />
          </span>
        </div>
      ) : null}

      {/* ── Header: Category Dot, Title & Options Menu Button ──────────── */}
      <div className="flex items-center justify-between pt-0.5 relative z-10">
        <div className="flex items-center space-x-2 min-w-0 pr-2">
          <span 
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
            style={{ backgroundColor: paper.badge }} 
          />
          <span className="text-sm font-black truncate tracking-tight" style={{ color: themeData.textPrimary }}>
            {note.title}
          </span>
        </div>

        <div className="flex items-center space-x-1 shrink-0 relative">
          <button
            onClick={() => onTogglePin(note)}
            className={`p-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
              note.pinned
                ? 'bg-purple-500/25 text-purple-300 border border-purple-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={note.pinned ? 'Unpin note' : 'Pin note to workspace'}
          >
            <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-purple-400 rotate-45' : ''}`} />
          </button>

          {/* Options Popup Button (⋯) */}
          <button
            onClick={() => setIsMenuOpen(prev => !prev)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Note Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Dropdown Menu Popup */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                transition={{ duration: 0.15 }}
                style={{ backgroundColor: `${themeData.bgElevated}F5`, borderColor: themeData.borderColor }}
                className="absolute right-0 top-8 w-36 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-xl z-50 space-y-0.5"
              >
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onConvertToTask(note);
                  }}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Convert to Task</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete(note.id);
                  }}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Note</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Note Content (Readable Modern Digital Paper Typography) ────── */}
      <p 
        className="text-xs leading-relaxed font-medium whitespace-pre-wrap line-clamp-4 relative z-10" 
        style={{ color: themeData.textSecondary }}
      >
        {note.content || 'Empty digital sticky note...'}
      </p>

      {/* ── Bottom Footer: Tags & Convert Quick Action ────────────────── */}
      <div 
        style={{ borderColor: `${themeData.borderColor}70`, color: themeData.textMuted }}
        className="pt-3 border-t flex items-center justify-between text-[10px] font-bold relative z-10"
      >
        <span className="px-2.5 py-0.5 rounded-lg bg-black/25 font-mono text-[9px] border" style={{ borderColor: `${themeData.borderColor}60` }}>
          {note.tags || '#note'}
        </span>

        <button
          onClick={() => onConvertToTask(note)}
          className="flex items-center gap-1 font-bold text-[10px] text-emerald-400 hover:text-emerald-300 transition p-1 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
          title="Convert sticky note to task"
        >
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Convert</span>
        </button>
      </div>
    </motion.div>
  );
}
