'use client';

import React, { useState } from 'react';
import {
  Lock,
  AlertTriangle,
  FlaskConical,
  User,
  MapPin,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Day,
  IScheduledBlock,
  ISection,
  TargetCellEvaluation,
  TimetableState,
  Violation,
} from '@/lib/types';
import { slotsToBlocks } from '@/lib/engine';

interface TimetableMatrixProps {
  state: TimetableState;
  activeSection: ISection;
  conflicts: Violation[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string | null) => void;
  onMoveBlock: (blockId: string, toDay: Day, toSlot: number) => void;
  onCreateFromBacklog: (subjectId: string, day: Day, slot: number) => void;
  draggingSubjectId: string | null;
  draggingBlockId: string | null;
  onDragStartBlock: (blockId: string) => void;
  onDragEnd: () => void;
  validTargetsMap: Map<string, TargetCellEvaluation> | null;
  isViewer?: boolean;
}

export const TimetableMatrix: React.FC<TimetableMatrixProps> = ({
  state,
  activeSection,
  conflicts,
  selectedBlockId,
  onSelectBlock,
  onMoveBlock,
  onCreateFromBacklog,
  draggingSubjectId,
  draggingBlockId,
  onDragStartBlock,
  onDragEnd,
  validTargetsMap,
  isViewer = false,
}) => {

  const [hoveredCell, setHoveredCell] = useState<{ day: Day; slot: number } | null>(null);

  const { timeConfig, subjects, classrooms, faculties } = state;
  const blocks = slotsToBlocks(state.slots);

  // Filter blocks for current active section
  const sectionBlocks = blocks.filter((b) => b.sectionId === activeSection.id);

  // Conflict block IDs set for instant lookups
  const conflictBlockIds = new Set<string>();
  for (const v of conflicts) {
    if (v.conflictingBlockId) conflictBlockIds.add(v.conflictingBlockId);
    // Add blocks at the conflicting cell
    for (const b of blocks) {
      if (
        b.day === v.day &&
        b.startSlotIndex <= v.slotIndex &&
        b.startSlotIndex + b.blockLength > v.slotIndex
      ) {
        conflictBlockIds.add(b.blockId);
      }
    }
  }

  // Handle Drop onto a cell
  const handleDrop = (day: Day, slotIndex: number) => {
    if (draggingBlockId) {
      onMoveBlock(draggingBlockId, day, slotIndex);
    } else if (draggingSubjectId) {
      onCreateFromBacklog(draggingSubjectId, day, slotIndex);
    }
    setHoveredCell(null);
  };

  const isDraggingAny = !!draggingBlockId || !!draggingSubjectId;

  return (
    <div className="flex-1 overflow-auto p-4 bg-obsidian-950 flex flex-col">
      {/* Sub-header Controls / Section info */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white tracking-wide text-sm">
            {activeSection.name}
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400 font-mono">Semester {activeSection.semester}</span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400 font-mono">{activeSection.strength} Students</span>
          {activeSection.batches.length > 0 && (
            <span className="text-[11px] font-mono text-zinc-500">
              (Batches: {activeSection.batches.map((b) => `${b.name}:${b.strength}`).join(', ')})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-cyber-indigo/30 border border-cyber-indigo" />
            <span>Lecture</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-pink-500/30 border border-pink-500" />
            <span>Lab (2hr)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-cyber-rose/40 border border-cyber-rose animate-pulse" />
            <span>Collision</span>
          </div>
        </div>
      </div>

      {/* Main Grid Table */}
      <div className="w-full border border-white/10 rounded-xl overflow-hidden bg-obsidian-900/60 backdrop-blur-md shadow-2xl">
        {/* Table Header: Period Columns */}
        <div className="grid grid-cols-[100px_repeat(9,minmax(110px,1fr))] border-b border-white/10 bg-obsidian-850 text-xs font-mono">
          <div className="p-3 font-semibold text-zinc-400 uppercase tracking-wider border-r border-white/10 flex items-center justify-center">
            Day
          </div>

          {timeConfig.slots.map((slot) => {
            if (slot.isBreak) {
              return (
                <div
                  key={slot.index}
                  className="p-2 text-center border-r border-white/10 bg-obsidian-900/90 text-zinc-500 flex flex-col justify-center select-none"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80">
                    {slot.breakLabel}
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    {slot.start}-{slot.end}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={slot.index}
                className="p-2 text-center border-r border-white/10 last:border-r-0 flex flex-col justify-center"
              >
                <span className="font-semibold text-zinc-300">Period {slot.index}</span>
                <span className="text-[10px] text-zinc-400">
                  {slot.start} - {slot.end}
                </span>
              </div>
            );
          })}
        </div>

        {/* Table Body: Days on Y Axis */}
        <div className="divide-y divide-white/10">
          {timeConfig.days.map((day) => {
            const isHalfDay = timeConfig.halfDays?.some((h) => h.day === day);
            const halfDayLimit = timeConfig.halfDays?.find((h) => h.day === day)?.lastSlotIndex;

            // Find all blocks placed on this day for this section
            const dayBlocks = sectionBlocks.filter((b) => b.day === day);

            // Compute occupied slot map for this day
            const occupiedSlotMap = new Map<number, IScheduledBlock[]>();
            for (const b of dayBlocks) {
              for (let o = 0; o < b.blockLength; o++) {
                const sIdx = b.startSlotIndex + o;
                const list = occupiedSlotMap.get(sIdx) || [];
                list.push(b);
                occupiedSlotMap.set(sIdx, list);
              }
            }

            return (
              <div
                key={day}
                className="grid grid-cols-[100px_repeat(9,minmax(110px,1fr))] min-h-[92px] group"
              >
                {/* Day Label Column */}
                <div className="p-3 border-r border-white/10 bg-obsidian-850/40 flex flex-col items-center justify-center font-mono">
                  <span className="font-bold text-zinc-200 text-xs uppercase tracking-wider">
                    {day.substring(0, 3)}
                  </span>
                  {isHalfDay && (
                    <span className="text-[9px] text-amber-400 uppercase mt-0.5 px-1 rounded bg-amber-500/10 border border-amber-500/20">
                      Half Day
                    </span>
                  )}
                </div>

                {/* Slot Cells */}
                {timeConfig.slots.map((slot) => {
                  const isBreak = slot.isBreak;
                  const isPastHalfDay = isHalfDay && halfDayLimit && slot.index > halfDayLimit;

                  if (isBreak) {
                    return (
                      <div
                        key={`${day}-${slot.index}`}
                        className="border-r border-white/10 bg-obsidian-950/60 flex items-center justify-center p-1 text-[10px] text-zinc-600 font-mono tracking-widest uppercase writing-mode-vertical"
                      >
                        • • •
                      </div>
                    );
                  }

                  if (isPastHalfDay) {
                    return (
                      <div
                        key={`${day}-${slot.index}`}
                        className="border-r border-white/10 bg-obsidian-950/80 flex items-center justify-center text-[10px] text-zinc-600 font-mono"
                      >
                        Closed
                      </div>
                    );
                  }

                  // Active Cell Drag Evaluation
                  const cellKey = `${day}-${slot.index}`;
                  const cellEval = validTargetsMap?.get(cellKey);
                  const isHovered = hoveredCell?.day === day && hoveredCell?.slot === slot.index;

                  let targetClass = '';
                  if (isDraggingAny && isHovered) {
                    if (cellEval?.ok) {
                      targetClass = 'drag-target-valid';
                    } else {
                      targetClass = 'drag-target-invalid';
                    }
                  }

                  // Find blocks that START at this slot
                  const startingBlocks = dayBlocks.filter((b) => b.startSlotIndex === slot.index);
                  // Check if cell is an extension (offset > 0) of a multi-slot lab
                  const isExtensionOfOther = dayBlocks.some(
                    (b) =>
                      b.startSlotIndex < slot.index &&
                      b.startSlotIndex + b.blockLength > slot.index
                  );

                  // Synthesize human-readable ARIA label
                  const cellContentSummary = startingBlocks
                    .map((b) => {
                      const sub = subjects.find((s) => s.id === b.subjectId)?.code;
                      const rm = classrooms.find((c) => c.id === b.classroomId)?.roomNo;
                      return `${sub || 'Course'} in ${rm || 'Room'}`;
                    })
                    .join(', ');
                  const ariaCellLabel = `${day} Period ${slot.index} (${slot.start} to ${slot.end}): ${
                    cellContentSummary || (isExtensionOfOther ? 'Lab In Progress' : 'Free Period')
                  }`;

                  return (

                    <div
                      key={`${day}-${slot.index}`}
                      role="gridcell"
                      aria-label={ariaCellLabel}
                      tabIndex={0}
                      onDragOver={(e) => {
                        if (isViewer) return;
                        e.preventDefault();
                        if (
                          !hoveredCell ||
                          hoveredCell.day !== day ||
                          hoveredCell.slot !== slot.index
                        ) {
                          setHoveredCell({ day, slot: slot.index });
                        }
                      }}
                      onDragLeave={() => {
                        if (
                          hoveredCell?.day === day &&
                          hoveredCell?.slot === slot.index
                        ) {
                          setHoveredCell(null);
                        }
                      }}
                      onDrop={(e) => {
                        if (isViewer) return;
                        e.preventDefault();
                        handleDrop(day, slot.index);
                      }}
                      className={`relative p-1.5 border-r border-white/10 last:border-r-0 flex flex-col gap-1 transition-colors focus:outline-none focus:ring-1 focus:ring-cyber-indigo/50 ${
                        isExtensionOfOther ? 'bg-obsidian-900/30' : 'bg-obsidian-900/10'
                      } ${targetClass}`}
                    >
                      {/* Floating Conflict Tooltip on Invalid Drag Hover */}
                      {isDraggingAny && isHovered && !cellEval?.ok && cellEval?.reasons && (
                        <div className="absolute -top-10 left-0 z-50 px-2 py-1 bg-rose-950 border border-rose-500 text-rose-200 text-[10px] rounded shadow-2xl pointer-events-none whitespace-nowrap flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400 flex-shrink-0" />
                          <span>{cellEval.reasons[0] || 'Invalid placement'}</span>
                        </div>
                      )}

                      {/* Render Starting Blocks */}
                      {startingBlocks.map((block) => {
                        const subject = subjects.find((s) => s.id === block.subjectId);
                        const classroom = classrooms.find((c) => c.id === block.classroomId);
                        const faculty = faculties.find((f) => block.facultyIds.includes(f.id));
                        const isSelected = selectedBlockId === block.blockId;
                        const hasConflict = conflictBlockIds.has(block.blockId);
                        const isMultiSlot = block.blockLength > 1;

                        return (
                          <div
                            key={block.blockId}
                            role="button"
                            aria-label={`${subject?.code || 'Course'} - ${subject?.name}, Room ${classroom?.roomNo}, Instructor ${faculty?.name || 'TBA'}${hasConflict ? ' (COLLISION ALERT)' : ''}`}
                            tabIndex={0}
                            draggable={!isViewer}
                            onDragStart={() => !isViewer && onDragStartBlock(block.blockId)}
                            onDragEnd={onDragEnd}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBlock(block.blockId);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectBlock(block.blockId);
                              }
                            }}
                            className={`group relative p-2 rounded-lg border text-left transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-cyber-indigo ${
                              isViewer ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              hasConflict
                                ? 'slot-conflict bg-rose-950/40 border-rose-500 text-rose-100'
                                : isSelected
                                ? 'border-cyber-indigo bg-cyber-indigo/20 shadow-glow-indigo text-white ring-1 ring-cyber-indigo'
                                : 'bg-obsidian-800/90 hover:bg-obsidian-750 border-white/10 hover:border-white/25 text-zinc-200'
                            }`}
                            style={{
                              width: isMultiSlot
                                ? `calc(${block.blockLength * 100}% + ${(block.blockLength - 1) * 1}px)`
                                : '100%',
                              zIndex: isMultiSlot ? 15 : 10,
                            }}
                          >
                            {/* Card Top: Code + Pin + Badge */}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5 truncate">

                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor: hasConflict
                                      ? '#ef4444'
                                      : subject?.color || '#6366f1',
                                  }}
                                />
                                <span className="font-mono text-[11px] font-bold tracking-tight">
                                  {subject?.code || 'SUB'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                {block.batch && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    {block.batch}
                                  </span>
                                )}
                                {block.locked && (
                                  <Lock className="w-2.5 h-2.5 text-zinc-400" />
                                )}
                                {hasConflict && (
                                  <AlertTriangle className="w-3 h-3 text-rose-400 animate-pulse" />
                                )}
                              </div>
                            </div>

                            {/* Course Title */}
                            <div className="text-[11px] font-medium text-zinc-200 truncate">
                              {subject?.name}
                            </div>

                            {/* Room & Faculty details */}
                            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                              <span className="flex items-center gap-1 truncate text-zinc-400">
                                <MapPin className="w-2.5 h-2.5 text-zinc-400" />
                                {classroom?.roomNo}
                              </span>

                              {faculty && (
                                <span className="flex items-center gap-1 truncate text-zinc-400 ml-1">
                                  <User className="w-2.5 h-2.5 text-zinc-400" />
                                  {faculty.name.split(' ').pop()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
