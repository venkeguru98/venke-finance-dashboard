import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, CheckSquare, Trash2, MoreHorizontal } from 'lucide-react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 1. Deterministic Stable Rotation (-1.6° to +1.6°, stays 100% constant)
  const deterministicRotation = Math.sin(note.id * 777) * 1.6;

  // 2. Desktop Pointer 3D Proximity Tilt State (Max 2.2 degrees)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 14 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = (-y / (rect.height / 2)) * 2.2;
    const rotateY = (x / (rect.width / 2)) * 2.2;
    setTilt({ rotateX, rotateY, shadowX: -rotateY * 2, shadowY: 20 + rotateX * 2 });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, shadowX: 0, shadowY: 14 });
  };

  // 3. Physical Paper Color Palette Profiles (Luminous Stationery Paper + Dark Charcoal Text)
  const getPaperStyle = (color: string) => {
    switch (color) {
      case 'amber':
      case 'gold':
      case 'yellow':
        return {
          bg: '#FEF08A', // Warm Canary Yellow Paper
          text: '#0F172A',
          subtext: '#334155',
          border: '#FDE047',
          shadowColor: 'rgba(234, 179, 8, 0.35)',
          pinBg: '#DC2626'
        };
      case 'violet':
      case 'lavender':
      case 'purple':
        return {
          bg: '#E9D5FF', // Soft Pastel Lavender Paper
          text: '#0F172A',
          subtext: '#334155',
          border: '#DDD6FE',
          shadowColor: 'rgba(147, 51, 234, 0.35)',
          pinBg: '#7C3AED'
        };
      case 'cyan':
      case 'sky':
      case 'blue':
        return {
          bg: '#BAE6FD', // Powder Sky Blue Paper
          text: '#0F172A',
          subtext: '#334155',
          border: '#7DD3FC',
          shadowColor: 'rgba(14, 165, 233, 0.35)',
          pinBg: '#0284C7'
        };
      case 'emerald':
      case 'mint':
      case 'green':
        return {
          bg: '#A7F3D0', // Pastel Mint Green Paper
          text: '#0F172A',
          subtext: '#334155',
          border: '#6EE7B7',
          shadowColor: 'rgba(16, 185, 129, 0.35)',
          pinBg: '#059669'
        };
      case 'rose':
      case 'pink':
        return {
          bg: '#FECDD3', // Soft Blush Pink Paper
          text: '#0F172A',
          subtext: '#334155',
          border: '#FDA4AF',
          shadowColor: 'rgba(244, 63, 94, 0.35)',
          pinBg: '#E11D48'
        };
      case 'orange':
      case 'peach':
        return {
          bg: '#FFEDD5', // Soft Peach Paper
          text: '#0F172A',
          subtext: '#334155',
          border: '#FDBA74',
          shadowColor: 'rgba(249, 115, 22, 0.35)',
          pinBg: '#EA580C'
        };
      default:
        return {
          bg: '#FEF08A', // Default Premium Canary Stationery Paper
          text: '#0F172A',
          subtext: '#334155',
          border: '#FDE047',
          shadowColor: 'rgba(234, 179, 8, 0.35)',
          pinBg: '#DC2626'
        };
    }
  };

  const paper = getPaperStyle(note.color);

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, scale: 0.88, y: 20, rotate: deterministicRotation }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0, 
        rotate: deterministicRotation,
        rotateX: tilt.rotateX,
        rotateY: tilt.rotateY
      }}
      exit={{ opacity: 0, scale: 0.8, y: -10 }}
      whileHover={{ y: -4 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      style={{
        backgroundColor: paper.bg,
        borderColor: note.pinned ? paper.pinBg : paper.border,
        boxShadow: note.pinned
          ? `0 20px 40px -8px rgba(0, 0, 0, 0.75), 0 0 20px 0 ${paper.shadowColor}`
          : `${tilt.shadowX}px ${tilt.shadowY}px 32px -8px rgba(0, 0, 0, 0.65)`
      }}
      className="sticky-note-paper p-5 flex flex-col justify-between relative group cursor-pointer"
    >
      {/* ── 1. Physical 3D Pushpin Tack (Top Center when pinned) ────────── */}
      {note.pinned && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
          <div 
            style={{ backgroundColor: paper.pinBg }}
            className="w-5 h-5 rounded-full border-2 border-white/90 shadow-md shadow-black/60 flex items-center justify-center animate-pulse"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-inner" />
          </div>
          <div className="w-0.5 h-2.5 bg-gradient-to-b from-slate-400 to-slate-800 shadow-sm" />
        </div>
      )}

      {/* ── 2. Header: Title & Minimal Icon Controls ─────────────────────── */}
      <div className="flex items-start justify-between gap-2 pt-1 relative z-10">
        <h4 
          className="text-sm font-extrabold tracking-tight line-clamp-2 leading-tight" 
          style={{ color: paper.text }}
        >
          {note.title}
        </h4>

        {/* Minimal Control Icons (Pin & ⋯ Menu) */}
        <div className="flex items-center space-x-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onTogglePin(note)}
            className={`p-1 rounded-lg transition cursor-pointer ${
              note.pinned ? 'bg-black/15 text-slate-900 font-bold' : 'text-slate-700 hover:bg-black/10'
            }`}
            title={note.pinned ? 'Unpin note' : 'Pin note to workspace'}
          >
            <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-slate-900 rotate-45' : ''}`} />
          </button>

          {/* Options Popup Button (⋯) */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(prev => !prev)}
              className="p-1 rounded-lg text-slate-700 hover:bg-black/10 transition cursor-pointer"
              title="Note options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {/* Menu Dropdown Popup */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-7 w-36 rounded-2xl border border-slate-700/20 bg-slate-900 text-white p-1.5 shadow-2xl z-50 space-y-0.5"
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
      </div>

      {/* ── 3. Body Content (Written Directly on Physical Paper) ───────── */}
      <p 
        className="text-xs leading-relaxed font-semibold line-clamp-5 my-2 relative z-10" 
        style={{ color: paper.subtext }}
      >
        {note.content || 'Empty sticky note...'}
      </p>

      {/* ── 4. Bottom Footer: Minimal Marker Label Tag (#note) ──────────── */}
      <div className="pt-2 flex items-center justify-between text-[10px] font-extrabold relative z-10">
        <span 
          className="font-mono text-[10px] tracking-tight opacity-75" 
          style={{ color: paper.subtext }}
        >
          {note.tags || '#note'}
        </span>
      </div>
    </motion.div>
  );
}
