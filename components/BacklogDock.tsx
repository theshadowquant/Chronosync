'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FlaskConical,
  User,
  GripVertical,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { TimetableState, ISection } from '@/lib/types';
import { slotsToBlocks } from '@/lib/engine';

interface BacklogDockProps {
  state: TimetableState;
  activeSection: ISection;
  onDragStartSubject: (subjectId: string) => void;
  onDragEnd: () => void;
}

export const BacklogDock: React.FC<BacklogDockProps> = ({
  state,
  activeSection,
  onDragStartSubject,
  onDragEnd,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter assignments for this active section
  const sectionAssignments = state.assignments.filter(
    (asg) => asg.sectionId === activeSection.id
  );

  const blocks = slotsToBlocks(state.slots);

  return (
    <aside
      className={`relative flex flex-col border-r border-white/10 bg-obsidian-900/70 backdrop-blur-md transition-all duration-300 ease-in-out z-20 ${
        isCollapsed ? 'w-12' : 'w-72 lg:w-80'
      }`}
    >
      {/* Dock Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        {!isCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <BookOpen className="w-4 h-4 text-cyber-indigo flex-shrink-0" />
            <div className="truncate">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Course Backlog
              </h2>
              <span className="text-[10px] text-zinc-400 font-mono">
                {activeSection.name} (Sem {activeSection.semester})
              </span>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-md hover:bg-white/5 text-zinc-400 hover:text-white transition-colors ml-auto"
          title={isCollapsed ? 'Expand Backlog' : 'Collapse Backlog'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Dock Content */}
      {!isCollapsed ? (
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <div className="text-[11px] text-zinc-400 mb-1">
            Drag any course into an open slot in the matrix:
          </div>

          {sectionAssignments.map((assignment) => {
            const subject = state.subjects.find((s) => s.id === assignment.subjectId);
            if (!subject) return null;

            const assignedCount = blocks.filter(
              (b) => b.sectionId === activeSection.id && b.subjectId === subject.id
            ).length;
            const required = assignment.weeklySessionsRequired;
            const isCompleted = assignedCount >= required;
            const pct = Math.min(100, Math.round((assignedCount / required) * 100));

            const facultyNames = assignment.facultyIds
              .map((id) => state.faculties.find((f) => f.id === id)?.name)
              .filter(Boolean)
              .join(', ');

            return (
              <div
                key={assignment.id}
                draggable={!isCompleted}
                onDragStart={() => onDragStartSubject(subject.id)}
                onDragEnd={onDragEnd}
                className={`group relative p-3 rounded-xl border transition-all select-none ${
                  isCompleted
                    ? 'bg-obsidian-850/60 border-white/5 opacity-60'
                    : 'bg-obsidian-850 hover:bg-obsidian-800 border-white/10 hover:border-cyber-indigo/50 cursor-grab active:cursor-grabbing hover:shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: subject.color || '#6366f1' }}
                    />
                    <span className="font-mono text-xs font-bold text-white tracking-wide">
                      {subject.code}
                    </span>
                    {subject.isLab && (
                      <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-pink-500/15 border border-pink-500/30 text-pink-400">
                        <FlaskConical className="w-2.5 h-2.5" />
                        {subject.labBlockLength || 2}h Lab
                      </span>
                    )}
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-cyber-emerald" />
                    ) : (
                      <span className="text-zinc-300 font-semibold">
                        {assignedCount}/{required}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-1 text-xs text-zinc-300 font-medium truncate">
                  {subject.name}
                </div>

                {facultyNames && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-400 truncate">
                    <User className="w-3 h-3 text-zinc-400" />
                    <span className="truncate">{facultyNames}</span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-2.5 w-full bg-obsidian-950 rounded-full h-1.5 overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isCompleted ? 'bg-cyber-emerald' : 'bg-cyber-indigo'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center py-4 gap-4">
          <BookOpen className="w-5 h-5 text-zinc-500" />
          <div className="w-6 h-px bg-white/10" />
          <span className="text-[10px] font-mono text-zinc-500 rotate-90 origin-center whitespace-nowrap mt-4">
            QUEUE
          </span>
        </div>
      )}
    </aside>
  );
};
