import {
  Day,
  IScheduledBlock,
  ISolverProposal,
  ISolverProposalMove,
  ISolverResult,
  SolverStatus,
  TimetableState,
  ITimetableSlot,
} from '../types';
import {
  blockToSlots,
  slotsToBlocks,
  validateBlockPlacement,
  findAllConflicts,
} from '../engine';

/**
 * Multi-dimensional CSP Solver: Min-Conflicts local search with soft-constraint optimization.
 */

// Soft constraint penalty weights
const WEIGHTS = {
  PREFER_AFTERNOON_LABS: 15,
  AVOID_FRIDAY_LATE: 10,
  MINIMIZE_FACULTY_GAPS: 25,
  DISTRIBUTE_SUBJECTS: 20,
  MOVE_PENALTY: 5,
};

function calculateSoftPenalty(
  state: TimetableState,
  block: IScheduledBlock
): number {
  let penalty = 0;
  const subject = state.subjects.find((s) => s.id === block.subjectId);

  // Labs prefer afternoon slots (slot 7 or 8)
  if (subject?.isLab && block.startSlotIndex < 7) {
    penalty += WEIGHTS.PREFER_AFTERNOON_LABS;
  }

  // Avoid Friday late slot (slot 8)
  if (block.day === 'Friday' && block.startSlotIndex >= 8) {
    penalty += WEIGHTS.AVOID_FRIDAY_LATE;
  }

  // Check if same subject is scheduled on the same day for this section
  const currentBlocks = slotsToBlocks(state.slots);
  const sameDayOccurrences = currentBlocks.filter(
    (b) =>
      b.blockId !== block.blockId &&
      b.sectionId === block.sectionId &&
      b.subjectId === block.subjectId &&
      b.day === block.day
  );
  if (sameDayOccurrences.length > 0) {
    penalty += WEIGHTS.DISTRIBUTE_SUBJECTS;
  }

  return penalty;
}

export interface SolverOptions {
  timeoutMs?: number;
  maxIterations?: number;
  lockedBlockIds?: Set<string>;
}

/**
 * ⚡ Resolve Conflicts Engine:
 * Identifies colliding blocks, explores candidate conflict-free slots,
 * and proposes minimal-disruption atomic moves.
 *
 * Distinguishes SOLVED, PARTIAL, INFEASIBLE, and LIMIT_REACHED.
 */
export function resolveConflicts(
  state: TimetableState,
  options?: SolverOptions
): ISolverResult {
  const startTime = Date.now();
  const timeoutMs = options?.timeoutMs ?? 2000;
  const maxIterations = options?.maxIterations ?? 1000;
  const lockedBlockIds = options?.lockedBlockIds ?? new Set<string>();

  const currentViolations = findAllConflicts(state);
  if (currentViolations.length === 0) {
    return {
      status: 'SOLVED',
      proposals: [],
      searchDurationMs: Date.now() - startTime,
      totalConflictsBefore: 0,
      diagnostic: 'All timetable assignments are completely collision-free.',
    };
  }

  const allBlocks = slotsToBlocks(state.slots);
  const proposals: ISolverProposal[] = [];

  // Identify all blocks involved in conflicts
  const conflictingBlockIds = new Set<string>();
  for (const v of currentViolations) {
    if (v.conflictingBlockId) {
      conflictingBlockIds.add(v.conflictingBlockId);
    }
    // Also find any block occupying (day, slotIndex)
    for (const b of allBlocks) {
      if (
        b.day === v.day &&
        b.startSlotIndex <= v.slotIndex &&
        b.startSlotIndex + b.blockLength > v.slotIndex
      ) {
        conflictingBlockIds.add(b.blockId);
      }
    }
  }

  // Filter movable blocks: Solver NEVER moves locked blocks
  const movableBlocks = Array.from(conflictingBlockIds)
    .map((id) => allBlocks.find((b) => b.blockId === id))
    .filter((b): b is IScheduledBlock => !!b && !b.locked && !lockedBlockIds.has(b.blockId));

  if (movableBlocks.length === 0) {
    return {
      status: 'INFEASIBLE',
      proposals: [],
      bindingConstraint: 'All conflicting blocks are pinned/locked by user. Cannot relocate without unlocking.',
      searchDurationMs: Date.now() - startTime,
      totalConflictsBefore: currentViolations.length,
      diagnostic: `Found ${currentViolations.length} collision(s), but all involved blocks are pinned and immovable.`,
    };
  }

  let iterations = 0;
  let limitReached = false;

  for (const blockToMove of movableBlocks) {
    if (Date.now() - startTime > timeoutMs || iterations >= maxIterations) {
      limitReached = true;
      break;
    }

    const subject = state.subjects.find((s) => s.id === blockToMove.subjectId);
    const faculty = state.faculties.find((f) => blockToMove.facultyIds.includes(f.id));
    const section = state.sections.find((sec) => sec.id === blockToMove.sectionId);

    // Search for candidate coordinates across the week
    for (const candidateDay of state.timeConfig.days) {
      if (Date.now() - startTime > timeoutMs || iterations >= maxIterations) {
        limitReached = true;
        break;
      }

      for (const slot of state.timeConfig.slots) {
        if (slot.isBreak) continue;
        iterations++;

        // Skip exact same slot
        if (candidateDay === blockToMove.day && slot.index === blockToMove.startSlotIndex) {
          continue;
        }

        const candidateBlock: IScheduledBlock = {
          ...blockToMove,
          day: candidateDay,
          startSlotIndex: slot.index,
        };

        // Validate placement at candidate coordinate (excluding this block itself)
        const validation = validateBlockPlacement(state, candidateBlock, blockToMove.blockId);

        if (validation.ok) {
          // Calculate hypothetical state
          const remainingSlots = state.slots.filter((s) => s.blockId !== blockToMove.blockId);
          const newSlots = blockToSlots(candidateBlock);
          const testState: TimetableState = {
            ...state,
            slots: [...remainingSlots, ...newSlots],
          };

          const remainingConflicts = findAllConflicts(testState);

          // We only accept moves that strictly reduce total conflicts
          if (remainingConflicts.length < currentViolations.length) {
            const softPenalty = calculateSoftPenalty(state, candidateBlock);
            const score = Math.round(100 - softPenalty - remainingConflicts.length * 30);

            const move: ISolverProposalMove = {
              blockId: blockToMove.blockId,
              subjectCode: subject?.code || 'Subject',
              fromDay: blockToMove.day,
              fromSlot: blockToMove.startSlotIndex,
              toDay: candidateDay,
              toSlot: slot.index,
              reason: `Move ${subject?.code} (${section?.name}) to ${candidateDay} Period ${slot.index} (${slot.start}-${slot.end}) where ${faculty?.name || 'Faculty'} and room are free.`,
            };

            proposals.push({
              id: `prop-${blockToMove.blockId}-${candidateDay}-${slot.index}`,
              score,
              moves: [move],
              summary: `Relocate ${subject?.code} for ${section?.name} to ${candidateDay} Slot ${slot.index}. Resolves ${currentViolations.length - remainingConflicts.length} hard collision(s).`,
              remainingConflicts: remainingConflicts.length,
            });
          }
        }
      }
    }
  }

  // Sort proposals by highest score and lowest remaining conflicts
  proposals.sort((a, b) => b.score - a.score || a.remainingConflicts - b.remainingConflicts);
  const bestProposals = proposals.slice(0, 3);
  const searchDurationMs = Date.now() - startTime;

  if (bestProposals.length > 0) {
    const isFullSolution = bestProposals[0].remainingConflicts === 0;
    return {
      status: isFullSolution ? 'SOLVED' : 'PARTIAL',
      proposals: bestProposals,
      searchDurationMs,
      totalConflictsBefore: currentViolations.length,
      diagnostic: isFullSolution
        ? `Found ${bestProposals.length} complete conflict-free resolution(s) in ${searchDurationMs}ms.`
        : `Found ${bestProposals.length} partial resolution(s) reducing conflicts to ${bestProposals[0].remainingConflicts}.`,
    };
  }

  if (limitReached) {
    return {
      status: 'LIMIT_REACHED',
      proposals: [],
      bindingConstraint: 'Search iteration cap or timeout budget reached before finding a valid swap coordinate.',
      searchDurationMs,
      totalConflictsBefore: currentViolations.length,
      diagnostic: `Search terminated after ${iterations} iterations (${searchDurationMs}ms) without finding conflict-free coordinates.`,
    };
  }

  return {
    status: 'INFEASIBLE',
    proposals: [],
    bindingConstraint: 'Grid saturated or faculty/room schedules fully occupied across all alternative periods.',
    searchDurationMs,
    totalConflictsBefore: currentViolations.length,
    diagnostic: `Exhaustive search of all ${iterations} permutations found no conflict-free relocation coordinate.`,
  };
}

/**
 * ✨ Auto-Fill Unassigned Engine:
 * Evaluates syllabus quota requirements against current schedules and fills empty slots
 * without violating any hard constraints or exceeding faculty weekly limits.
 */
export function autoFillUnassigned(state: TimetableState): {
  newBlocks: IScheduledBlock[];
  placedCount: number;
  unassignedReasons: string[];
} {
  const newBlocks: IScheduledBlock[] = [];
  const unassignedReasons: string[] = [];
  let workingState = { ...state, slots: [...state.slots] };

  for (const assignment of state.assignments) {
    const subject = state.subjects.find((s) => s.id === assignment.subjectId);
    const section = state.sections.find((sec) => sec.id === assignment.sectionId);
    if (!subject || !section) continue;

    // Count how many sessions are currently scheduled for this assignment
    const scheduledBlocks = slotsToBlocks(workingState.slots).filter(
      (b) => b.sectionId === assignment.sectionId && b.subjectId === assignment.subjectId
    );

    const needed = Math.max(0, assignment.weeklySessionsRequired - scheduledBlocks.length);
    if (needed === 0) continue;

    // Check faculty weekly workload limits
    const assignedFaculties = assignment.facultyIds
      .map((id) => state.faculties.find((f) => f.id === id))
      .filter(Boolean);

    // Appropriate room search: find rooms of matching type with enough capacity
    const eligibleRooms = state.classrooms.filter(
      (r) => r.type === subject.requiredRoomType && r.capacity >= section.strength
    );
    if (eligibleRooms.length === 0) {
      unassignedReasons.push(
        `No available ${subject.requiredRoomType} with capacity >= ${section.strength} for ${subject.code}`
      );
      continue;
    }

    let placedForThisAssignment = 0;
    const blockLength = subject.isLab ? (subject.labBlockLength || 2) : 1;

    for (let i = 0; i < needed; i++) {
      let placed = false;

      dayLoop: for (const day of state.timeConfig.days) {
        for (const slot of state.timeConfig.slots) {
          if (slot.isBreak) continue;

          // Check if any assigned faculty would exceed maxWeeklyHours
          const wouldExceedFacultyHours = assignedFaculties.some((fac) => {
            if (!fac) return false;
            const currentFacultyHours = workingState.slots.filter((s) =>
              s.facultyIds.includes(fac.id)
            ).length;
            return currentFacultyHours + blockLength > fac.maxWeeklyHours;
          });

          if (wouldExceedFacultyHours) {
            continue;
          }

          for (const room of eligibleRooms) {
            const candidateBlock: IScheduledBlock = {
              blockId: `autofill-${assignment.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              academicYear: state.academicYear,
              semester: section.semester,
              sectionId: section.id,
              day,
              startSlotIndex: slot.index,
              blockLength,
              subjectId: subject.id,
              facultyIds: assignment.facultyIds,
              classroomId: room.id,
              version: 1,
            };

            const validation = validateBlockPlacement(workingState, candidateBlock);
            if (validation.ok) {
              newBlocks.push(candidateBlock);
              workingState.slots.push(...blockToSlots(candidateBlock));
              placedForThisAssignment++;
              placed = true;
              break dayLoop;
            }
          }
        }
      }

      if (!placed) {
        unassignedReasons.push(
          `Could not place session ${i + 1}/${needed} for ${subject.code} (${section.name}): Grid saturated or faculty busy / reached max hours`
        );
      }
    }
  }

  return {
    newBlocks,
    placedCount: newBlocks.length,
    unassignedReasons,
  };
}
