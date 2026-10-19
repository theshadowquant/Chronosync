'use client';

import React from 'react';
import {
  Zap,
  Sparkles,
  Command,
  Download,
  RotateCcw,
  AlertTriangle,
  Clock,
  Users,
  Grid,
  Calendar,
  Layers,
  Undo2,
  Redo2,
  ShieldAlert,
  ShieldCheck,
  Database,
  Lock,
} from 'lucide-react';
import { TimetableState, UserRole, Violation } from '@/lib/types';
import { slotsToBlocks } from '@/lib/engine';

interface TopHUDProps {
  state: TimetableState;
  conflicts: Violation[];
  currentView: 'section' | 'faculty' | 'room';
  onViewChange: (view: 'section' | 'faculty' | 'room') => void;
  onOpenCommand: () => void;
  onOpenResolve: () => void;
  onAutoFill: () => void;
  onResetSeed: () => void;
  onOpenExport: () => void;
  isAutoFilling: boolean;
  userRole: UserRole;
  onToggleRole: () => void;
  onTogglePublish: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export const TopHUD: React.FC<TopHUDProps> = ({
  state,
  conflicts,
  currentView,
  onViewChange,
  onOpenCommand,
  onOpenResolve,
  onAutoFill,
  onResetSeed,
  onOpenExport,
  isAutoFilling,
  userRole,
  onToggleRole,
  onTogglePublish,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  const totalHours = state.slots.length; // Each slot cell = 1 hour
  const isViewer = userRole === 'viewer';
  const isPublished = state.status === 'published';

  // Faculty utilization metric
  const totalMaxFacultyHours = state.faculties.reduce((sum, f) => sum + f.maxWeeklyHours, 0);
  const facultyUtilizationPct = Math.min(
    100,
    Math.round((totalHours / (totalMaxFacultyHours || 1)) * 100)
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-obsidian-900/90 backdrop-blur-xl px-4 py-2 flex items-center justify-between gap-3">
      {/* Brand & Workspace Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyber-indigo/20 border border-cyber-indigo/40 text-cyber-indigo shadow-glow-indigo">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-white text-base">ChronoSync</span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border border-cyber-indigo/30 bg-cyber-indigo/10 text-cyber-indigo">
              Studio v2.5
            </span>

            {/* Storage Mode Pill */}
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                state.storageMode === 'mongodb'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
              title={
                state.storageMode === 'mongodb'
                  ? 'Connected to durable MongoDB cluster'
                  : 'Zero-config transactional in-memory repository (dev fallback)'
              }
            >
              <Database className="w-3 h-3" />
              <span>{state.storageMode === 'mongodb' ? 'MongoDB Replica' : 'In-Memory Dev'}</span>
            </span>

            {/* Publish Status Pill */}
            <button
              onClick={userRole === 'admin' ? onTogglePublish : undefined}
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
                isPublished
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold shadow-glow-emerald'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              } ${userRole === 'admin' ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}
              title={userRole === 'admin' ? 'Click to toggle Publish/Draft' : 'Timetable status'}
            >
              {isPublished ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
              <span>{isPublished ? 'PUBLISHED' : 'DRAFT'}</span>
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 font-mono hidden md:block">
            Multi-Dimensional Constraint & Collision-Resolution Engine
          </p>
        </div>
      </div>

      {/* Triple-Perspective Lens Switcher */}
      <div className="flex items-center bg-obsidian-850 p-1 rounded-lg border border-white/10 text-xs">
        <button
          onClick={() => onViewChange('section')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            currentView === 'section'
              ? 'bg-cyber-indigo text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
          title="Section Weekly Grid (Hotkey: 1)"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Section View</span>
          <span className="ml-1 text-[10px] opacity-60 font-mono">[1]</span>
        </button>

        <button
          onClick={() => onViewChange('faculty')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            currentView === 'faculty'
              ? 'bg-cyber-indigo text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
          title="Faculty Workload & Schedule (Hotkey: 2)"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Faculty View</span>
          <span className="ml-1 text-[10px] opacity-60 font-mono">[2]</span>
        </button>

        <button
          onClick={() => onViewChange('room')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
            currentView === 'room'
              ? 'bg-cyber-indigo text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
          title="Classroom / Lab Occupancy (Hotkey: 3)"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Room View</span>
          <span className="ml-1 text-[10px] opacity-60 font-mono">[3]</span>
        </button>
      </div>

      {/* Real-time Telemetry Pills */}
      <div className="hidden xl:flex items-center gap-2 text-xs font-mono">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-obsidian-850 border border-white/5 text-zinc-300">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>{totalHours} hrs</span>
        </div>

        {/* Live Collision Counter */}
        {conflicts.length > 0 ? (
          <button
            onClick={userRole === 'admin' ? onOpenResolve : undefined}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyber-rose/15 border border-cyber-rose/40 text-cyber-rose shadow-glow-rose transition-all animate-pulse-subtle ${
              userRole === 'admin' ? 'hover:bg-cyber-rose/25 cursor-pointer' : 'cursor-default'
            }`}
            title={userRole === 'admin' ? 'Click to resolve collisions' : 'Active collisions'}
          >
            <span className="w-2 h-2 rounded-full bg-cyber-rose animate-ping" />
            <AlertTriangle className="w-3.5 h-3.5 text-cyber-rose" />
            <span className="font-bold">{conflicts.length} Collision{conflicts.length > 1 ? 's' : ''}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyber-emerald/10 border border-cyber-emerald/30 text-cyber-emerald">
            <span className="w-2 h-2 rounded-full bg-cyber-emerald" />
            <span>0 Collisions</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-obsidian-850 border border-white/5 text-zinc-300">
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <span>Load: {facultyUtilizationPct}%</span>
        </div>
      </div>

      {/* Action Strip */}
      <div className="flex items-center gap-2">
        {/* Role Toggle Switcher */}
        <button
          onClick={onToggleRole}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all ${
            userRole === 'admin'
              ? 'bg-cyber-indigo/15 border-cyber-indigo/40 text-cyber-indigo'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
          }`}
          title="Toggle Admin (Editor) vs Viewer (Read-only)"
        >
          {isViewer && <Lock className="w-3 h-3 text-zinc-400" />}
          <span>Role: {userRole.toUpperCase()}</span>
        </button>

        {/* Undo / Redo */}
        {userRole === 'admin' && (
          <div className="flex items-center bg-obsidian-850 rounded-lg border border-white/10 p-0.5">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded ${
                canUndo ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-600 cursor-not-allowed'
              }`}
              title="Undo Move (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded ${
                canRedo ? 'text-zinc-300 hover:bg-white/5' : 'text-zinc-600 cursor-not-allowed'
              }`}
              title="Redo Move (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={onOpenCommand}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 border border-white/10 text-zinc-300 text-xs font-medium transition-all"
          title="Command Palette (Ctrl+K or ⌘K)"
        >
          <Command className="w-3.5 h-3.5" />
          <kbd className="hidden sm:inline text-[10px] font-mono px-1 py-0.5 rounded bg-zinc-800 border border-white/10 text-zinc-400">
            ⌘K
          </kbd>
        </button>

        {/* Auto-Resolve Button */}
        {userRole === 'admin' && (
          <button
            onClick={onOpenResolve}
            disabled={conflicts.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              conflicts.length > 0
                ? 'bg-cyber-rose text-white shadow-glow-rose hover:bg-rose-600'
                : 'bg-obsidian-800 text-zinc-500 border border-white/5 cursor-not-allowed'
            }`}
            title="Run CSP Auto-Resolve Engine"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden md:inline">⚡ Resolve</span>
            {conflicts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-black/30 text-[10px]">
                {conflicts.length}
              </span>
            )}
          </button>
        )}

        {/* Auto-Fill Button */}
        {userRole === 'admin' && (
          <button
            onClick={onAutoFill}
            disabled={isAutoFilling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 border border-white/10 text-zinc-200 text-xs font-medium transition-all"
            title="Auto-fill unassigned course quotas"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${isAutoFilling ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Auto-Fill</span>
          </button>
        )}

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          className="p-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 border border-white/10 text-zinc-300 transition-all"
          title="Export Timetable (PDF / CSV)"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Reset Seed Button */}
        {userRole === 'admin' && (
          <button
            onClick={onResetSeed}
            className="p-1.5 rounded-lg bg-obsidian-800 hover:bg-obsidian-700 border border-white/10 text-zinc-400 hover:text-zinc-200 transition-all"
            title="Reset to Initial Seed with Demo Conflict"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
