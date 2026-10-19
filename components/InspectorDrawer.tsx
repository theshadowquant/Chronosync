'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Unlock,
  Trash2,
  MapPin,
  User,
  Clock,
  Layers,
  AlertTriangle,
  Check,
  Calendar,
} from 'lucide-react';
import {
  IScheduledBlock,
  TimetableState,
  Violation,
  IClassroom,
  IFaculty,
} from '@/lib/types';
import { slotsToBlocks } from '@/lib/engine';

interface InspectorDrawerProps {
  blockId: string | null;
  state: TimetableState;
  conflicts: Violation[];
  onClose: () => void;
  onUpdateBlock: (updated: Partial<IScheduledBlock> & { version: number }) => void;
  onDeleteBlock: (blockId: string) => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  blockId,
  state,
  conflicts,
  onClose,
  onUpdateBlock,
  onDeleteBlock,
}) => {
  if (!blockId) return null;

  const blocks = slotsToBlocks(state.slots);
  const block = blocks.find((b) => b.blockId === blockId);
  if (!block) return null;

  const subject = state.subjects.find((s) => s.id === block.subjectId);
  const section = state.sections.find((s) => s.id === block.sectionId);
  const classroom = state.classrooms.find((c) => c.id === block.classroomId);
  const faculty = state.faculties.find((f) => block.facultyIds.includes(f.id));

  const [selectedRoomId, setSelectedRoomId] = useState(block.classroomId);
  const [selectedFacultyId, setSelectedFacultyId] = useState(
    block.facultyIds[0] || ''
  );
  const [isLocked, setIsLocked] = useState(!!block.locked);

  useEffect(() => {
    setSelectedRoomId(block.classroomId);
    setSelectedFacultyId(block.facultyIds[0] || '');
    setIsLocked(!!block.locked);
  }, [block]);

  // Check if this block is involved in any active conflicts
  const relatedConflicts = conflicts.filter(
    (c) =>
      c.conflictingBlockId === block.blockId ||
      (c.day === block.day &&
        c.slotIndex >= block.startSlotIndex &&
        c.slotIndex < block.startSlotIndex + block.blockLength)
  );

  const handleSave = () => {
    onUpdateBlock({
      blockId: block.blockId,
      classroomId: selectedRoomId,
      facultyIds: [selectedFacultyId],
      locked: isLocked,
      version: block.version,
    });
  };

  const handleToggleLock = () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    onUpdateBlock({
      blockId: block.blockId,
      locked: nextLocked,
      version: block.version,
    });
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-obsidian-900 border-l border-white/10 shadow-2xl flex flex-col p-4 backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: subject?.color || '#6366f1' }}
          />
          <h3 className="font-mono font-bold text-white text-base">
            {subject?.code} Inspector
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Conflicts Banner */}
      {relatedConflicts.length > 0 && (
        <div className="mt-3 p-3 rounded-lg bg-cyber-rose/20 border border-cyber-rose/50 text-cyber-rose text-xs space-y-1.5 shadow-glow-rose">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 animate-pulse flex-shrink-0" />
            <span>Active Collision Detected:</span>
          </div>
          {relatedConflicts.map((c, i) => (
            <p key={i} className="text-[11px] text-rose-200">
              • {c.reason}
            </p>
          ))}
        </div>
      )}

      {/* Main Details */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs font-mono">
        <div>
          <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
            Course Title
          </label>
          <div className="p-2.5 rounded-lg bg-obsidian-850 border border-white/5 text-zinc-200 font-sans text-sm font-medium">
            {subject?.name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
              Section / Term
            </label>
            <div className="p-2 rounded-lg bg-obsidian-850 border border-white/5 text-zinc-300">
              {section?.name} (Sem {section?.semester})
            </div>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
              Batch
            </label>
            <div className="p-2 rounded-lg bg-obsidian-850 border border-white/5 text-zinc-300">
              {block.batch || 'Whole Section'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
              Day & Slot
            </label>
            <div className="p-2 rounded-lg bg-obsidian-850 border border-white/5 text-zinc-300">
              {block.day}, Period {block.startSlotIndex}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
              Duration
            </label>
            <div className="p-2 rounded-lg bg-obsidian-850 border border-white/5 text-zinc-300">
              {block.blockLength} hr{block.blockLength > 1 ? 's' : ''} {subject?.isLab ? '(Lab)' : ''}
            </div>
          </div>
        </div>

        {/* Change Classroom */}
        <div>
          <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-zinc-400" />
            <span>Assigned Venue / Classroom</span>
          </label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="w-full bg-obsidian-850 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-cyber-indigo"
          >
            {state.classrooms.map((r) => {
              const matchesType = r.type === subject?.requiredRoomType;
              const hasCapacity = r.capacity >= (section?.strength || 60);

              return (
                <option key={r.id} value={r.id}>
                  {r.roomNo} ({r.type}, Cap: {r.capacity}) {!matchesType ? '⚠️ Wrong Type' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Change Faculty */}
        <div>
          <label className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <User className="w-3 h-3 text-zinc-400" />
            <span>Assigned Instructor</span>
          </label>
          <select
            value={selectedFacultyId}
            onChange={(e) => setSelectedFacultyId(e.target.value)}
            className="w-full bg-obsidian-850 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:border-cyber-indigo"
          >
            {state.faculties.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.department})
              </option>
            ))}
          </select>
        </div>

        {/* Solver Pin / Lock */}
        <div className="pt-2 border-t border-white/10">
          <button
            onClick={handleToggleLock}
            className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all ${
              isLocked
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-obsidian-850 border-white/10 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {isLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
              <span className="font-semibold">
                {isLocked ? 'Pinned (Locked from Solver)' : 'Unpinned (Movable by Solver)'}
              </span>
            </div>
            <span className="text-[10px] opacity-75">Click to toggle</span>
          </button>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="pt-3 border-t border-white/10 flex items-center gap-2">
        <button
          onClick={handleSave}
          className="flex-1 py-2 rounded-lg bg-cyber-indigo hover:bg-indigo-600 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-glow-indigo"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>

        <button
          onClick={() => onDeleteBlock(block.blockId)}
          className="p-2 rounded-lg bg-cyber-rose/10 hover:bg-cyber-rose/25 border border-cyber-rose/30 text-cyber-rose text-xs transition-colors"
          title="Delete this block"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
