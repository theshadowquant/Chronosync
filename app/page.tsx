'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Day,
  IScheduledBlock,
  ISection,
  ISolverProposal,
  ISolverResult,
  ITimetableSlot,
  TargetCellEvaluation,
  TimetableState,
  UserRole,
  Violation,
} from '@/lib/types';
import { createInitialState } from '@/lib/db/seedData';
import {
  computeValidTargets,
  findAllConflicts,
  slotsToBlocks,
} from '@/lib/engine';
import { TopHUD } from '@/components/TopHUD';
import { BacklogDock } from '@/components/BacklogDock';
import { TimetableMatrix } from '@/components/TimetableMatrix';
import { FacultyLensView } from '@/components/FacultyLensView';
import { RoomLensView } from '@/components/RoomLensView';
import { InspectorDrawer } from '@/components/InspectorDrawer';
import { ConflictResolutionModal } from '@/components/ConflictResolutionModal';
import { CommandMenu } from '@/components/CommandMenu';
import { ExportModal } from '@/components/ExportModal';

export default function ChronoSyncStudio() {
  const [state, setState] = useState<TimetableState>(() => createInitialState());
  const [currentLens, setCurrentLens] = useState<'section' | 'faculty' | 'room'>('section');
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-5a');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Role: Admin (Full editing & solver) vs Viewer (Read-only)
  const [userRole, setUserRole] = useState<UserRole>('admin');

  // Undo / Redo Command History
  const [undoStack, setUndoStack] = useState<ITimetableSlot[][]>([]);
  const [redoStack, setRedoStack] = useState<ITimetableSlot[][]>([]);

  // Drag & drop reactive state
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [draggingSubjectId, setDraggingSubjectId] = useState<string | null>(null);
  const [validTargetsMap, setValidTargetsMap] = useState<Map<string, TargetCellEvaluation> | null>(null);

  // Modals & Panels
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [solverResult, setSolverResult] = useState<ISolverResult | null>(null);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Fetch latest state from API
  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/timetable');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setState(json.data);
        }
      }
    } catch {
      // Fallback already in memory
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  // Active section entity
  const activeSection: ISection =
    state.sections.find((s) => s.id === activeSectionId) || state.sections[0];

  // Active conflicts across entire matrix
  const conflicts: Violation[] = findAllConflicts(state);

  // Push to Undo history
  const pushUndoSnapshot = (currentSlots: ITimetableSlot[]) => {
    setUndoStack((prev) => [...prev.slice(-20), currentSlots]);
    setRedoStack([]); // Clear redo on new action
  };

  const handleUndo = async () => {
    if (undoStack.length === 0 || userRole !== 'admin') return;
    const previous = undoStack[undoStack.length - 1];
    const newUndo = undoStack.slice(0, -1);
    setRedoStack((prev) => [...prev, state.slots]);
    setUndoStack(newUndo);

    // Apply previous slots state
    const blocksToRestore = slotsToBlocks(previous);
    await fetch('/api/solver/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moves: blocksToRestore.map((b) => ({
          blockId: b.blockId,
          toDay: b.day,
          toSlot: b.startSlotIndex,
        })),
      }),
    });
    toast.info('Undo Applied');
    refreshState();
  };

  const handleRedo = async () => {
    if (redoStack.length === 0 || userRole !== 'admin') return;
    const nextSlots = redoStack[redoStack.length - 1];
    const newRedo = redoStack.slice(0, -1);
    setUndoStack((prev) => [...prev, state.slots]);
    setRedoStack(newRedo);

    const blocksToRestore = slotsToBlocks(nextSlots);
    await fetch('/api/solver/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moves: blocksToRestore.map((b) => ({
          blockId: b.blockId,
          toDay: b.day,
          toSlot: b.startSlotIndex,
        })),
      }),
    });
    toast.info('Redo Applied');
    refreshState();
  };

  // Keyboard Shortcuts (1: Section, 2: Faculty, 3: Room, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === '1') setCurrentLens('section');
      if (e.key === '2') setCurrentLens('faculty');
      if (e.key === '3') setCurrentLens('room');

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoStack, redoStack, state.slots, userRole]);

  // When drag starts on an existing block: compute validTargets map once
  const handleDragStartBlock = (blockId: string) => {
    if (userRole !== 'admin') return;
    setDraggingBlockId(blockId);
    setDraggingSubjectId(null);
    const block = slotsToBlocks(state.slots).find((b) => b.blockId === blockId);
    if (block) {
      const targets = computeValidTargets(state, block);
      setValidTargetsMap(targets);
    }
  };

  // When drag starts on a subject from Backlog: synthesize a temporary test block
  const handleDragStartSubject = (subjectId: string) => {
    if (userRole !== 'admin') return;
    setDraggingSubjectId(subjectId);
    setDraggingBlockId(null);
    const subject = state.subjects.find((s) => s.id === subjectId);
    const assignment = state.assignments.find(
      (a) => a.sectionId === activeSection.id && a.subjectId === subjectId
    );
    const eligibleRoom = state.classrooms.find(
      (r) => r.type === (subject?.requiredRoomType || 'LectureHall')
    );

    const testBlock: IScheduledBlock = {
      blockId: 'temp-preview',
      academicYear: state.academicYear,
      semester: activeSection.semester,
      sectionId: activeSection.id,
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: subject?.isLab ? (subject.labBlockLength || 2) : 1,
      subjectId,
      facultyIds: assignment?.facultyIds || [state.faculties[0]?.id || ''],
      classroomId: eligibleRoom?.id || state.classrooms[0]?.id || '',
      version: 1,
    };

    const targets = computeValidTargets(state, testBlock);
    setValidTargetsMap(targets);
  };

  const handleDragEnd = () => {
    setDraggingBlockId(null);
    setDraggingSubjectId(null);
    setValidTargetsMap(null);
  };

  // Move existing block
  const handleMoveBlock = async (blockId: string, toDay: Day, toSlot: number) => {
    if (userRole !== 'admin') {
      toast.error('Viewer Mode', { description: 'Read-only users cannot modify assignments.' });
      return;
    }
    handleDragEnd();
    const blocks = slotsToBlocks(state.slots);
    const target = blocks.find((b) => b.blockId === blockId);
    if (!target) return;

    // Snapshot for undo
    pushUndoSnapshot(state.slots);

    try {
      const res = await fetch(`/api/timetable/blocks/${blockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day: toDay,
          startSlotIndex: toSlot,
          version: target.version,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Move Rejected by Constraint Engine', {
          description: json.error || 'A collision would be produced.',
        });
        return;
      }

      toast.success('Block Reassigned', {
        description: `Moved to ${toDay} Period ${toSlot}`,
      });
      refreshState();
    } catch {
      toast.error('Network error during block move');
    }
  };

  // Create new block from Backlog Dock drop
  const handleCreateFromBacklog = async (subjectId: string, day: Day, slot: number) => {
    if (userRole !== 'admin') return;
    handleDragEnd();
    const subject = state.subjects.find((s) => s.id === subjectId);
    const assignment = state.assignments.find(
      (a) => a.sectionId === activeSection.id && a.subjectId === subjectId
    );
    const eligibleRoom = state.classrooms.find(
      (r) => r.type === (subject?.requiredRoomType || 'LectureHall')
    );

    if (!eligibleRoom) {
      toast.error(`No suitable ${subject?.requiredRoomType} found.`);
      return;
    }

    pushUndoSnapshot(state.slots);

    try {
      const res = await fetch('/api/timetable/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear: state.academicYear,
          semester: activeSection.semester,
          sectionId: activeSection.id,
          day,
          startSlotIndex: slot,
          blockLength: subject?.isLab ? (subject.labBlockLength || 2) : 1,
          subjectId,
          facultyIds: assignment?.facultyIds || [state.faculties[0]?.id || ''],
          classroomId: eligibleRoom.id,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Placement Invalid', {
          description: json.error || 'Placement violates collision invariants.',
        });
        return;
      }

      toast.success('Course Placed Successfully', {
        description: `${subject?.code} scheduled for ${day} Period ${slot}`,
      });
      refreshState();
    } catch {
      toast.error('Failed to create block');
    }
  };

  // Update Block from Inspector Drawer
  const handleUpdateBlock = async (
    updated: Partial<IScheduledBlock> & { blockId?: string; version: number }
  ) => {
    if (!selectedBlockId || userRole !== 'admin') return;
    pushUndoSnapshot(state.slots);
    try {
      const res = await fetch(`/api/timetable/blocks/${selectedBlockId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Update Failed', {
          description: json.error || 'Modification violates constraints.',
        });
        return;
      }

      toast.success('Block Updated');
      refreshState();
    } catch {
      toast.error('Failed to update block');
    }
  };

  // Delete Block
  const handleDeleteBlock = async (blockId: string) => {
    if (userRole !== 'admin') return;
    pushUndoSnapshot(state.slots);
    try {
      const res = await fetch(`/api/timetable/blocks/${blockId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Block Removed');
        setSelectedBlockId(null);
        refreshState();
      }
    } catch {
      toast.error('Failed to delete block');
    }
  };

  // Trigger "⚡ Resolve Conflicts"
  const handleOpenResolve = async () => {
    setIsResolveModalOpen(true);
    setIsLoadingProposals(true);
    try {
      const res = await fetch('/api/solver/resolve', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data) {
        setSolverResult(json.data);
      }
    } catch {
      toast.error('Failed to compute resolutions');
    } finally {
      setIsLoadingProposals(false);
    }
  };

  // Apply Solver Proposal
  const handleApplyProposal = async (proposal: ISolverProposal) => {
    if (userRole !== 'admin') return;
    pushUndoSnapshot(state.slots);
    try {
      const res = await fetch('/api/solver/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: proposal.moves }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success('Proposal Applied Atomically!', {
          description: 'Timetable updated with 0 remaining conflicts.',
        });
        setIsResolveModalOpen(false);
        refreshState();
      } else {
        toast.error('Could not apply proposal', { description: json.error });
      }
    } catch {
      toast.error('Failed to apply solver proposal');
    }
  };

  // Trigger "✨ Auto-Fill Unassigned"
  const handleAutoFill = async () => {
    if (userRole !== 'admin') return;
    setIsAutoFilling(true);
    try {
      const res = await fetch('/api/solver/autofill', { method: 'POST' });
      const json = await res.json();

      if (json.success && json.data) {
        const { placedCount, newBlocks, unassignedReasons } = json.data;
        if (placedCount > 0) {
          pushUndoSnapshot(state.slots);
          await fetch('/api/solver/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              moves: newBlocks.map((b: IScheduledBlock) => ({
                blockId: b.blockId,
                toDay: b.day,
                toSlot: b.startSlotIndex,
              })),
            }),
          });

          toast.success(`Auto-Fill Complete: Placed ${placedCount} session(s)!`);
          refreshState();
        } else {
          toast.info('All required syllabus quotas are already filled!');
        }

        if (unassignedReasons && unassignedReasons.length > 0) {
          console.warn('Unassigned quotas:', unassignedReasons);
        }
      }
    } catch {
      toast.error('Auto-fill process encountered an error');
    } finally {
      setIsAutoFilling(false);
    }
  };

  // Toggle Publish Status
  const handleTogglePublish = async () => {
    if (userRole !== 'admin') return;
    const targetStatus = state.status === 'published' ? 'draft' : 'published';

    try {
      const res = await fetch('/api/timetable/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Publish Action Blocked', {
          description: json.error || 'Cannot publish timetable with active collisions.',
        });
        return;
      }

      toast.success(
        targetStatus === 'published'
          ? 'Timetable Successfully Published!'
          : 'Timetable Reverted to Draft'
      );
      refreshState();
    } catch {
      toast.error('Failed to update publish state');
    }
  };

  // Reset Seed Data
  const handleResetSeed = async () => {
    if (userRole !== 'admin') return;
    try {
      const res = await fetch('/api/timetable/reset', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setUndoStack([]);
        setRedoStack([]);
        toast.info('Seed Data Reset', {
          description: 'Restored initial schedule with intentional demo conflict.',
        });
        refreshState();
      }
    } catch {
      toast.error('Failed to reset seed');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-obsidian-950 text-zinc-100">
      {/* Top HUD Bar */}
      <TopHUD
        state={state}
        conflicts={conflicts}
        currentView={currentLens}
        onViewChange={setCurrentLens}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenResolve={handleOpenResolve}
        onAutoFill={handleAutoFill}
        onResetSeed={handleResetSeed}
        onOpenExport={() => setIsExportModalOpen(true)}
        isAutoFilling={isAutoFilling}
        userRole={userRole}
        onToggleRole={() =>
          setUserRole((prev) => (prev === 'admin' ? 'viewer' : 'admin'))
        }
        onTogglePublish={handleTogglePublish}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 flex overflow-hidden relative">
        {currentLens === 'section' && (
          <>
            {/* Left Collapsible Course Backlog Dock */}
            <BacklogDock
              state={state}
              activeSection={activeSection}
              onDragStartSubject={handleDragStartSubject}
              onDragEnd={handleDragEnd}
            />

            {/* Central Master Matrix */}
            <TimetableMatrix
              state={state}
              activeSection={activeSection}
              conflicts={conflicts}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              onMoveBlock={handleMoveBlock}
              onCreateFromBacklog={handleCreateFromBacklog}
              draggingSubjectId={draggingSubjectId}
              draggingBlockId={draggingBlockId}
              onDragStartBlock={handleDragStartBlock}
              onDragEnd={handleDragEnd}
              validTargetsMap={validTargetsMap}
              isViewer={userRole === 'viewer'}
            />
          </>
        )}

        {currentLens === 'faculty' && (
          <FacultyLensView state={state} conflicts={conflicts} />
        )}

        {currentLens === 'room' && (
          <RoomLensView state={state} conflicts={conflicts} />
        )}

        {/* Right Inspector Drawer (Disabled in Viewer mode) */}
        {userRole === 'admin' && (
          <InspectorDrawer
            blockId={selectedBlockId}
            state={state}
            conflicts={conflicts}
            onClose={() => setSelectedBlockId(null)}
            onUpdateBlock={handleUpdateBlock}
            onDeleteBlock={handleDeleteBlock}
          />
        )}
      </main>

      {/* Global Modals */}
      <ConflictResolutionModal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        solverResult={solverResult}
        isLoading={isLoadingProposals}
        onApplyProposal={handleApplyProposal}
        conflictCount={conflicts.length}
      />

      <CommandMenu
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        state={state}
        onSelectSection={(sec) => setActiveSectionId(sec.id)}
        onSwitchLens={setCurrentLens}
        onResolve={handleOpenResolve}
        onAutoFill={handleAutoFill}
        onExport={() => setIsExportModalOpen(true)}
        onResetSeed={handleResetSeed}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        state={state}
        activeSection={activeSection}
      />
    </div>
  );
}
