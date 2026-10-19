import {
  Day,
  IScheduledBlock,
  ITimetableSlot,
  TimetableState,
  ValidationResult,
  Violation,
  TargetCellEvaluation,
  ISubject,
  IClassroom,
  IFaculty,
  ISection,
} from '../types';

/**
 * Pure TypeScript Multi-Dimensional Constraint & Collision Engine.
 * 0 React dependencies, 0 I/O.
 */

export function blockToSlots(block: IScheduledBlock): ITimetableSlot[] {
  const slots: ITimetableSlot[] = [];
  for (let offset = 0; offset < block.blockLength; offset++) {
    slots.push({
      id: `${block.blockId}-slot-${offset}`,
      academicYear: block.academicYear,
      semester: block.semester,
      sectionId: block.sectionId,
      batch: block.batch,
      day: block.day,
      slotIndex: block.startSlotIndex + offset,
      blockId: block.blockId,
      blockOffset: offset,
      blockLength: block.blockLength,
      subjectId: block.subjectId,
      facultyIds: block.facultyIds,
      classroomId: block.classroomId,
      locked: block.locked,
      version: block.version,
    });
  }
  return slots;
}

export function slotsToBlocks(slots: ITimetableSlot[]): IScheduledBlock[] {
  const blockMap = new Map<string, ITimetableSlot[]>();
  for (const slot of slots) {
    const list = blockMap.get(slot.blockId) || [];
    list.push(slot);
    blockMap.set(slot.blockId, list);
  }

  const blocks: IScheduledBlock[] = [];
  for (const [blockId, items] of blockMap.entries()) {
    items.sort((a, b) => a.blockOffset - b.blockOffset);
    const first = items[0];
    blocks.push({
      blockId,
      academicYear: first.academicYear,
      semester: first.semester,
      sectionId: first.sectionId,
      batch: first.batch,
      day: first.day,
      startSlotIndex: first.slotIndex,
      blockLength: first.blockLength,
      subjectId: first.subjectId,
      facultyIds: first.facultyIds,
      classroomId: first.classroomId,
      locked: first.locked,
      version: first.version,
    });
  }
  return blocks;
}

/**
 * Validates whether a proposed block can be placed at its designated coordinates.
 */
export function validateBlockPlacement(
  state: TimetableState,
  proposedBlock: IScheduledBlock,
  excludeBlockId?: string
): ValidationResult {
  const violations: Violation[] = [];
  const { timeConfig, slots, faculties, classrooms, sections, subjects } = state;

  const subject = subjects.find((s) => s.id === proposedBlock.subjectId);
  const classroom = classrooms.find((c) => c.id === proposedBlock.classroomId);
  const section = sections.find((s) => s.id === proposedBlock.sectionId);

  // Check half-day constraints (e.g. Saturday)
  const halfDayConfig = timeConfig.halfDays?.find((h) => h.day === proposedBlock.day);
  const maxSlotForDay = halfDayConfig
    ? halfDayConfig.lastSlotIndex
    : Math.max(...timeConfig.slots.map((s) => s.index));

  // Determine effective student strength for capacity checks
  let effectiveStrength = section?.strength || 60;
  if (proposedBlock.batch && section?.batches) {
    const batchObj = section.batches.find((b) => b.name === proposedBlock.batch);
    if (batchObj) effectiveStrength = batchObj.strength;
  }

  // 1. Room Fit Constraints (Capacity & Type)
  if (classroom && subject) {
    if (classroom.type !== subject.requiredRoomType) {
      violations.push({
        type: 'ROOM_TYPE_MISMATCH',
        day: proposedBlock.day,
        slotIndex: proposedBlock.startSlotIndex,
        entityId: classroom.id,
        entityName: classroom.roomNo,
        reason: `Room ${classroom.roomNo} is ${classroom.type}, but ${subject.code} requires ${subject.requiredRoomType}`,
      });
    }

    if (classroom.capacity < effectiveStrength) {
      violations.push({
        type: 'CAPACITY_EXCEEDED',
        day: proposedBlock.day,
        slotIndex: proposedBlock.startSlotIndex,
        entityId: classroom.id,
        entityName: classroom.roomNo,
        reason: `Room ${classroom.roomNo} capacity (${classroom.capacity}) is less than class strength (${effectiveStrength})`,
      });
    }
  }

  // Evaluate each consecutive slot cell occupied by the block
  for (let offset = 0; offset < proposedBlock.blockLength; offset++) {
    const currentSlotIndex = proposedBlock.startSlotIndex + offset;

    // Check Day Boundary
    if (currentSlotIndex > maxSlotForDay) {
      violations.push({
        type: 'DAY_BOUNDARY_EXCEEDED',
        day: proposedBlock.day,
        slotIndex: currentSlotIndex,
        reason: `${proposedBlock.day} schedule ends at Slot ${maxSlotForDay}`,
      });
      continue;
    }

    // Check Break Overlap (e.g., lunch breaks or non-teaching breaks)
    const slotConfig = timeConfig.slots.find((s) => s.index === currentSlotIndex);
    if (!slotConfig || slotConfig.isBreak) {
      violations.push({
        type: 'BREAK_OVERLAP',
        day: proposedBlock.day,
        slotIndex: currentSlotIndex,
        reason: `Slot ${currentSlotIndex} overlaps a designated break (${slotConfig?.breakLabel || 'Break'})`,
      });
      continue;
    }

    // Check Faculty Availability (Hard Blocks)
    for (const facultyId of proposedBlock.facultyIds) {
      const faculty = faculties.find((f) => f.id === facultyId);
      if (faculty) {
        const isUnavailable = faculty.unavailable?.some(
          (u) => u.day === proposedBlock.day && u.slotIndex === currentSlotIndex
        );
        if (isUnavailable) {
          violations.push({
            type: 'FACULTY_UNAVAILABLE',
            day: proposedBlock.day,
            slotIndex: currentSlotIndex,
            entityId: faculty.id,
            entityName: faculty.name,
            reason: `${faculty.name} is marked unavailable on ${proposedBlock.day} at slot ${currentSlotIndex}`,
          });
        }
      }
    }

    // Check against all existing active slots (excluding self/own block)
    for (const existingSlot of slots) {
      if (existingSlot.blockId === excludeBlockId || existingSlot.blockId === proposedBlock.blockId) {
        continue;
      }
      if (existingSlot.day !== proposedBlock.day || existingSlot.slotIndex !== currentSlotIndex) {
        continue;
      }

      const existingSubject = subjects.find((s) => s.id === existingSlot.subjectId);
      const existingSection = sections.find((s) => s.id === existingSlot.sectionId);

      // A. Classroom Double-Booking Check
      if (existingSlot.classroomId === proposedBlock.classroomId) {
        violations.push({
          type: 'ROOM_OCCUPIED',
          day: proposedBlock.day,
          slotIndex: currentSlotIndex,
          entityId: classroom?.id,
          entityName: classroom?.roomNo,
          conflictingBlockId: existingSlot.blockId,
          reason: `Room ${classroom?.roomNo || 'selected'} is occupied by ${existingSection?.name || 'Section'} (${existingSubject?.code || 'Course'}) at slot ${currentSlotIndex}`,
        });
      }

      // B. Faculty Double-Booking Check
      for (const proposedFacultyId of proposedBlock.facultyIds) {
        if (existingSlot.facultyIds.includes(proposedFacultyId)) {
          const faculty = faculties.find((f) => f.id === proposedFacultyId);
          violations.push({
            type: 'FACULTY_DOUBLE_BOOKING',
            day: proposedBlock.day,
            slotIndex: currentSlotIndex,
            entityId: faculty?.id,
            entityName: faculty?.name,
            conflictingBlockId: existingSlot.blockId,
            reason: `${faculty?.name || 'Faculty'} is already teaching ${existingSubject?.code || 'class'} for ${existingSection?.name || 'another section'} at slot ${currentSlotIndex}`,
          });
        }
      }

      // C. Section and Batch Collision Check
      if (existingSlot.sectionId === proposedBlock.sectionId) {
        const isProposedWhole = !proposedBlock.batch || proposedBlock.batch === '*';
        const isExistingWhole = !existingSlot.batch || existingSlot.batch === '*';

        if (isProposedWhole || isExistingWhole) {
          // Whole section clashes with any class in the same section
          violations.push({
            type: 'SECTION_COLLISION',
            day: proposedBlock.day,
            slotIndex: currentSlotIndex,
            entityId: section?.id,
            entityName: section?.name,
            conflictingBlockId: existingSlot.blockId,
            reason: `Section ${section?.name} already has a scheduled session (${existingSubject?.code}) at slot ${currentSlotIndex}`,
          });
        } else if (proposedBlock.batch === existingSlot.batch) {
          // Same sub-batch clash (e.g. A1 vs A1)
          violations.push({
            type: 'BATCH_COLLISION',
            day: proposedBlock.day,
            slotIndex: currentSlotIndex,
            entityId: section?.id,
            entityName: section?.name,
            conflictingBlockId: existingSlot.blockId,
            reason: `Batch ${proposedBlock.batch} of section ${section?.name} is already engaged in ${existingSubject?.code}`,
          });
        }
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}

/**
 * Scans the entire active timetable state and finds all multi-dimensional conflicts.
 */
export function findAllConflicts(state: TimetableState): Violation[] {
  const violations: Violation[] = [];
  const { slots, faculties, classrooms, sections, subjects, timeConfig } = state;

  // 1. Group slots by (day, slotIndex)
  const cellMap = new Map<string, ITimetableSlot[]>();
  for (const slot of slots) {
    const key = `${slot.day}-${slot.slotIndex}`;
    const list = cellMap.get(key) || [];
    list.push(slot);
    cellMap.set(key, list);
  }

  // 2. Pairwise and resource collision check inside each cell
  for (const [key, cellSlots] of cellMap.entries()) {
    const [dayStr, slotIdxStr] = key.split('-');
    const day = dayStr as Day;
    const slotIndex = parseInt(slotIdxStr, 10);

    // Faculty double booking
    const facultyBookingMap = new Map<string, ITimetableSlot[]>();
    // Classroom double booking
    const roomBookingMap = new Map<string, ITimetableSlot[]>();
    // Section booking
    const sectionBookingMap = new Map<string, ITimetableSlot[]>();

    for (const slot of cellSlots) {
      // Room
      const roomList = roomBookingMap.get(slot.classroomId) || [];
      roomList.push(slot);
      roomBookingMap.set(slot.classroomId, roomList);

      // Faculty
      for (const fId of slot.facultyIds) {
        const facList = facultyBookingMap.get(fId) || [];
        facList.push(slot);
        facultyBookingMap.set(fId, facList);
      }

      // Section
      const secList = sectionBookingMap.get(slot.sectionId) || [];
      secList.push(slot);
      sectionBookingMap.set(slot.sectionId, secList);
    }

    // Report Room Collisions
    for (const [classroomId, occupying] of roomBookingMap.entries()) {
      if (occupying.length > 1) {
        const room = classrooms.find((c) => c.id === classroomId);
        const subNames = occupying
          .map((s) => subjects.find((sub) => sub.id === s.subjectId)?.code)
          .join(' vs ');
        violations.push({
          type: 'ROOM_OCCUPIED',
          day,
          slotIndex,
          entityId: classroomId,
          entityName: room?.roomNo,
          conflictingBlockId: occupying[1].blockId,
          reason: `Room ${room?.roomNo || classroomId} is double-booked (${subNames}) at ${day} slot ${slotIndex}`,
        });
      }
    }

    // Report Faculty Double-Bookings
    for (const [facultyId, occupying] of facultyBookingMap.entries()) {
      if (occupying.length > 1) {
        const faculty = faculties.find((f) => f.id === facultyId);
        const secNames = occupying
          .map((s) => {
            const sec = sections.find((x) => x.id === s.sectionId)?.name;
            const sub = subjects.find((x) => x.id === s.subjectId)?.code;
            return `${sec} (${sub})`;
          })
          .join(' and ');
        violations.push({
          type: 'FACULTY_DOUBLE_BOOKING',
          day,
          slotIndex,
          entityId: facultyId,
          entityName: faculty?.name,
          conflictingBlockId: occupying[1].blockId,
          reason: `${faculty?.name || 'Faculty'} is double-booked teaching ${secNames} simultaneously`,
        });
      }
    }

    // Report Section Collisions
    for (const [sectionId, occupying] of sectionBookingMap.entries()) {
      if (occupying.length > 1) {
        const sec = sections.find((s) => s.id === sectionId);
        // Check if there is whole-section clash or batch clash
        const wholeSectionSlots = occupying.filter((s) => !s.batch || s.batch === '*');
        if (wholeSectionSlots.length > 1 || (wholeSectionSlots.length > 0 && occupying.length > 1)) {
          violations.push({
            type: 'SECTION_COLLISION',
            day,
            slotIndex,
            entityId: sectionId,
            entityName: sec?.name,
            conflictingBlockId: occupying[1].blockId,
            reason: `Section ${sec?.name} has multiple simultaneous classes at ${day} slot ${slotIndex}`,
          });
        } else {
          // Check if same batch is repeated
          const batchCount = new Map<string, number>();
          for (const s of occupying) {
            if (s.batch) {
              batchCount.set(s.batch, (batchCount.get(s.batch) || 0) + 1);
            }
          }
          for (const [bName, count] of batchCount.entries()) {
            if (count > 1) {
              violations.push({
                type: 'BATCH_COLLISION',
                day,
                slotIndex,
                entityId: sectionId,
                entityName: sec?.name,
                conflictingBlockId: occupying[1].blockId,
                reason: `Batch ${bName} of section ${sec?.name} is scheduled multiple times at ${day} slot ${slotIndex}`,
              });
            }
          }
        }
      }
    }
  }

  // Check Faculty Hard Unavailability across all active slots
  for (const slot of slots) {
    for (const fId of slot.facultyIds) {
      const fac = faculties.find((f) => f.id === fId);
      if (fac?.unavailable?.some((u) => u.day === slot.day && u.slotIndex === slot.slotIndex)) {
        violations.push({
          type: 'FACULTY_UNAVAILABLE',
          day: slot.day,
          slotIndex: slot.slotIndex,
          entityId: fac.id,
          entityName: fac.name,
          conflictingBlockId: slot.blockId,
          reason: `${fac.name} is scheduled on an unavailable slot (${slot.day} slot ${slot.slotIndex})`,
        });
      }
    }
  }

  return violations;
}

/**
 * Pre-computes valid/invalid targets for an entire grid to drive real-time reactive drag previews.
 * Returns a Map keyed by `${day}-${slotIndex}` with evaluation and exact reasons.
 */
export function computeValidTargets(
  state: TimetableState,
  block: IScheduledBlock
): Map<string, TargetCellEvaluation> {
  const result = new Map<string, TargetCellEvaluation>();
  const { timeConfig } = state;

  for (const day of timeConfig.days) {
    for (const slot of timeConfig.slots) {
      if (slot.isBreak) continue;

      const testBlock: IScheduledBlock = {
        ...block,
        day,
        startSlotIndex: slot.index,
      };

      const evalResult = validateBlockPlacement(state, testBlock, block.blockId);
      const key = `${day}-${slot.index}`;

      if (evalResult.ok) {
        result.set(key, { ok: true, reasons: [] });
      } else {
        result.set(key, {
          ok: false,
          reasons: evalResult.violations.map((v) => v.reason),
        });
      }
    }
  }

  return result;
}
