'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Users,
  Grid,
  Calendar,
  Zap,
  Sparkles,
  Download,
  RotateCcw,
  X,
} from 'lucide-react';
import { TimetableState, ISection } from '@/lib/types';

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  state: TimetableState;
  onSelectSection: (section: ISection) => void;
  onSwitchLens: (lens: 'section' | 'faculty' | 'room') => void;
  onResolve: () => void;
  onAutoFill: () => void;
  onExport: () => void;
  onResetSeed: () => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  state,
  onSelectSection,
  onSwitchLens,
  onResolve,
  onAutoFill,
  onExport,
  onResetSeed,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredSections = state.sections.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      `semester ${s.semester}`.includes(query.toLowerCase())
  );

  const filteredFaculties = state.faculties.filter(
    (f) =>
      f.name.toLowerCase().includes(query.toLowerCase()) ||
      f.department.toLowerCase().includes(query.toLowerCase())
  );

  const filteredClassrooms = state.classrooms.filter(
    (c) =>
      c.roomNo.toLowerCase().includes(query.toLowerCase()) ||
      c.type.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-obsidian-900 shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-obsidian-850">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a section, professor, classroom, or action..."
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none font-sans"
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3 text-xs">
          {/* Quick Actions */}
          <div>
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
              Actions
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  onResolve();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-200 text-left transition-colors"
              >
                <Zap className="w-4 h-4 text-cyber-rose" />
                <span className="font-medium">⚡ Run Conflict Resolution</span>
              </button>

              <button
                onClick={() => {
                  onAutoFill();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-200 text-left transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-medium">✨ Auto-Fill Unassigned Quotas</span>
              </button>

              <button
                onClick={() => {
                  onExport();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-200 text-left transition-colors"
              >
                <Download className="w-4 h-4 text-cyber-indigo" />
                <span className="font-medium">📄 Export PDF / CSV</span>
              </button>

              <button
                onClick={() => {
                  onResetSeed();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-400 text-left transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-zinc-400" />
                <span>Reset to Seed Data (Demo Conflict)</span>
              </button>
            </div>
          </div>

          {/* Sections */}
          {filteredSections.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Sections & Batches
              </div>
              <div className="space-y-0.5">
                {filteredSections.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => {
                      onSelectSection(sec);
                      onSwitchLens('section');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-cyber-indigo" />
                      <span className="font-semibold">{sec.name}</span>
                      <span className="text-zinc-500 font-mono">
                        (Semester {sec.semester}, {sec.strength} students)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Open Section Grid</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instructors */}
          {filteredFaculties.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Instructors
              </div>
              <div className="space-y-0.5">
                {filteredFaculties.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      onSwitchLens('faculty');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-cyber-indigo" />
                      <span className="font-medium">{f.name}</span>
                      <span className="text-zinc-500 font-mono">({f.designation})</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Faculty Lens</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Classrooms */}
          {filteredClassrooms.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Rooms & Labs
              </div>
              <div className="space-y-0.5">
                {filteredClassrooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onSwitchLens('room');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-zinc-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Grid className="w-4 h-4 text-cyber-emerald" />
                      <span className="font-semibold">{r.roomNo}</span>
                      <span className="text-zinc-500 font-mono">
                        ({r.type}, Cap: {r.capacity})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">Room Lens</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
