import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Tag, Clock, X, CheckSquare, StickyNote, Target } from 'lucide-react';

interface PlannerSuperBarProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    type: 'task' | 'note' | 'reminder' | 'goal';
    tags: string[];
    parsedTime?: string;
  }) => Promise<void>;
}

export default function PlannerSuperBar({ isOpen, onClose, onSubmit }: PlannerSuperBarProps) {
  const [inputText, setInputText] = useState('');
  const [selectedType, setSelectedType] = useState<'task' | 'note' | 'reminder' | 'goal'>('task');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens or on Cmd/Ctrl + J
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open triggered parent handler if passed, or focus
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Intelligent Natural Language Parser
  const parsedInfo = React.useMemo(() => {
    const text = inputText;
    // Extract #tags
    const tagMatches = text.match(/#[\w-]+/g) || [];
    const tags = tagMatches.map(t => t.slice(1).toLowerCase());

    // Extract time expressions (e.g., at 4pm, 10:30am, tomorrow, in 2 hours)
    let parsedTime = '';
    const timeMatch = text.match(/\b(at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|tomorrow|today|in\s+\d+\s+(?:hours|hrs|mins))\b/i);
    if (timeMatch) {
      parsedTime = timeMatch[0];
    }

    // Auto-detect type from prefix
    let detectedType = selectedType;
    if (text.toLowerCase().startsWith('note:')) {
      detectedType = 'note';
    } else if (text.toLowerCase().startsWith('goal:')) {
      detectedType = 'goal';
    } else if (text.toLowerCase().startsWith('remind:') || text.toLowerCase().startsWith('reminder:')) {
      detectedType = 'reminder';
    }

    return { tags, parsedTime, detectedType };
  }, [inputText, selectedType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    let cleanTitle = inputText
      .replace(/^note:\s*/i, '')
      .replace(/^goal:\s*/i, '')
      .replace(/^remind(er)?:\s*/i, '')
      .trim();

    try {
      await onSubmit({
        title: cleanTitle,
        type: parsedInfo.detectedType,
        tags: parsedInfo.tags,
        parsedTime: parsedInfo.parsedTime
      });
      setInputText('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2000] flex items-start justify-center pt-20 px-4">
        {/* Dimmed Glass Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Floating Super-Bar Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-2xl bg-[#090D16] border border-white/15 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden backdrop-blur-2xl"
        >
          {/* Header & Mode Tabs */}
          <div className="p-4 bg-[#0F172A]/90 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1 rounded-2xl border border-white/10">
              {[
                { id: 'task', label: 'Task', icon: CheckSquare },
                { id: 'note', label: 'Sticky Note', icon: StickyNote },
                { id: 'reminder', label: 'Reminder', icon: Clock },
                { id: 'goal', label: 'Goal', icon: Target }
              ].map(typeItem => {
                const IconComponent = typeItem.icon;
                const isSelected = parsedInfo.detectedType === typeItem.id;
                return (
                  <button
                    key={typeItem.id}
                    type="button"
                    onClick={() => setSelectedType(typeItem.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="superbar_tab_active"
                        className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-md"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <IconComponent className="w-3.5 h-3.5" />
                      {typeItem.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Input */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="relative flex items-center">
              <Sparkles className="w-5 h-5 text-purple-400 absolute left-4 pointer-events-none animate-pulse" />
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder='Type naturally... e.g. "Call CA tomorrow at 4pm #finance"'
                className="w-full bg-[#0F172A] border border-white/10 rounded-2xl pl-12 pr-14 py-4 text-base font-medium text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 shadow-inner"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSubmitting}
                className="absolute right-3 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg disabled:opacity-40 transition active:scale-95 cursor-pointer"
              >
                {isSubmitting ? '...' : 'Add ↵'}
              </button>
            </div>

            {/* Smart Intelligence Badges */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-mono">
              <div className="flex items-center space-x-2">
                {parsedInfo.parsedTime && (
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {parsedInfo.parsedTime}
                  </span>
                )}
                {parsedInfo.tags.map(t => (
                  <span key={t} className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <Tag className="w-3 h-3" /> #{t}
                  </span>
                ))}
                {!parsedInfo.parsedTime && parsedInfo.tags.length === 0 && (
                  <span className="text-[10px] text-slate-500 font-sans">
                    💡 Auto-parses times ("4pm") and tags ("#personal")
                  </span>
                )}
              </div>

              <div className="text-[10px] text-slate-500 font-sans">
                Press <kbd className="bg-slate-800 border border-white/10 px-1.5 py-0.5 rounded text-slate-300">Esc</kbd> to close
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
