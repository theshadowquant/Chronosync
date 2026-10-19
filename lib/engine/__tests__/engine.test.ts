import { describe, it, expect } from 'vitest';
import {
  validateBlockPlacement,
  findAllConflicts,
  computeValidTargets,
  slotsToBlocks,
  blockToSlots,
} from '../index';
import {
  TimetableState,
  IScheduledBlock,
  ITimeConfig,
  IFaculty,
  IClassroom,
  ISection,
  ISubject,
} from '../../types';

const mockTimeConfig: ITimeConfig = {
  academicYear: '2026-2027',
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  slots: [
    { index: 1, start: '09:00', end: '10:00', isBreak: false },
    { index: 2, start: '10:00', end: '11:00', isBreak: false },
    { index: 3, start: '11:00', end: '11:15', isBreak: true, breakLabel: 'Tea Break' },
    { index: 4, start: '11:15', end: '12:15', isBreak: false },
    { index: 5, start: '12:15', end: '13:15', isBreak: false },
    { index: 6, start: '13:15', end: '14:00', isBreak: true, breakLabel: 'Lunch Break' },
    { index: 7, start: '14:00', end: '15:00', isBreak: false },
    { index: 8, start: '15:00', end: '16:00', isBreak: false },
  ],
  halfDays: [{ day: 'Saturday', lastSlotIndex: 5 }],
};

const mockFaculties: IFaculty[] = [
  {
    id: 'fac-1',
    name: 'Dr. Sarah Jenkins',
    department: 'CSE',
    designation: 'Professor',
    email: 'sarah.jenkins@institute.edu',
    maxWeeklyHours: 14,
    unavailable: [{ day: 'Tuesday', slotIndex: 1 }],
  },
  {
    id: 'fac-2',
    name: 'Prof. Alan Turing',
    department: 'CSE',
    designation: 'Assoc. Professor',
    email: 'alan.turing@institute.edu',
    maxWeeklyHours: 16,
    unavailable: [],
  },
];

const mockClassrooms: IClassroom[] = [
  { id: 'room-101', roomNo: 'LH-101', building: 'Turing Block', capacity: 70, type: 'LectureHall' },
  { id: 'lab-201', roomNo: 'LAB-201', building: 'Turing Block', capacity: 40, type: 'ComputerLab' },
  { id: 'lab-202', roomNo: 'LAB-202', building: 'Turing Block', capacity: 40, type: 'ComputerLab' },
];

const mockSections: ISection[] = [
  {
    id: 'sec-5a',
    academicYear: '2026-2027',
    semester: 5,
    name: 'CS-5A',
    strength: 60,
    batches: [
      { name: 'A1', strength: 30 },
      { name: 'A2', strength: 30 },
    ],
  },
  {
    id: 'sec-5b',
    academicYear: '2026-2027',
    semester: 5,
    name: 'CS-5B',
    strength: 60,
    batches: [
      { name: 'B1', strength: 30 },
      { name: 'B2', strength: 30 },
    ],
  },
];

const mockSubjects: ISubject[] = [
  { id: 'sub-os', code: 'CS501', name: 'Operating Systems', isLab: false, requiredRoomType: 'LectureHall' },
  { id: 'sub-os-lab', code: 'CS501L', name: 'OS Kernel Lab', isLab: true, requiredRoomType: 'ComputerLab', labBlockLength: 2 },
];

function createBaseState(): TimetableState {
  return {
    academicYear: '2026-2027',
    status: 'draft',
    storageMode: 'memory-development',
    timeConfig: mockTimeConfig,
    faculties: mockFaculties,
    classrooms: mockClassrooms,
    sections: mockSections,
    subjects: mockSubjects,
    assignments: [],
    slots: [],
  };
}

describe('ChronoSync Collision & CSP Engine', () => {
  it('detects faculty double-booking across different sections', () => {
    const state = createBaseState();

    // Dr. Sarah Jenkins teaching CS-5A in Room 101 on Monday slot 1
    const block1: IScheduledBlock = {
      blockId: 'blk-1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-1'],
      classroomId: 'room-101',
      version: 1,
    };
    state.slots = blockToSlots(block1);

    // Proposed: Dr. Sarah Jenkins teaching CS-5B in Room 102 at the SAME time
    const proposedBlock: IScheduledBlock = {
      blockId: 'blk-2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5b',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-1'],
      classroomId: 'room-101',
      version: 1,
    };

    const result = validateBlockPlacement(state, proposedBlock);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'FACULTY_DOUBLE_BOOKING')).toBe(true);
  });

  it('detects classroom double-booking by two different professors', () => {
    const state = createBaseState();

    // CS-5A in Room 101 on Monday slot 1 with Dr. Jenkins
    state.slots = blockToSlots({
      blockId: 'blk-1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-1'],
      classroomId: 'room-101',
      version: 1,
    });

    // Proposed: Prof. Turing trying to use Room 101 for CS-5B at the SAME slot
    const proposed: IScheduledBlock = {
      blockId: 'blk-2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5b',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-2'],
      classroomId: 'room-101',
      version: 1,
    };

    const result = validateBlockPlacement(state, proposed);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'ROOM_OCCUPIED')).toBe(true);
  });

  it('rejects a 2-slot lab where its second slot clashes with existing class or break', () => {
    const state = createBaseState();

    // Suppose slot 8 has an existing lecture for CS-5A
    state.slots = blockToSlots({
      blockId: 'blk-existing',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 8,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-1'],
      classroomId: 'room-101',
      version: 1,
    });

    // Proposed: 2-slot lab starting at slot 7 (spans 7 and 8)
    const proposedLab: IScheduledBlock = {
      blockId: 'blk-lab',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 7,
      blockLength: 2,
      subjectId: 'sub-os-lab',
      facultyIds: ['fac-2'],
      classroomId: 'lab-201',
      version: 1,
    };

    const result = validateBlockPlacement(state, proposedLab);
    expect(result.ok).toBe(false);
    // Section collision in slot 8
    expect(result.violations.some((v) => v.slotIndex === 8 && v.type === 'SECTION_COLLISION')).toBe(true);
  });

  it('rejects placing a multi-slot lab across break periods', () => {
    const state = createBaseState();

    // Slot 3 is Tea Break (11:00 - 11:15)
    // Proposed 2-slot lab starting at slot 2 (would cover slot 2 and slot 3 break)
    const proposedLab: IScheduledBlock = {
      blockId: 'blk-lab-break',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 2,
      blockLength: 2,
      subjectId: 'sub-os-lab',
      facultyIds: ['fac-2'],
      classroomId: 'lab-201',
      version: 1,
    };

    const result = validateBlockPlacement(state, proposedLab);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'BREAK_OVERLAP')).toBe(true);
  });

  it('permits parallel batches A1 and A2 in different labs, but rejects whole-section clash', () => {
    const state = createBaseState();

    // Batch A1 in Lab 201 with Prof Turing at slot 7
    const batchA1: IScheduledBlock = {
      blockId: 'blk-a1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      batch: 'A1',
      day: 'Monday',
      startSlotIndex: 7,
      blockLength: 2,
      subjectId: 'sub-os-lab',
      facultyIds: ['fac-2'],
      classroomId: 'lab-201',
      version: 1,
    };
    state.slots.push(...blockToSlots(batchA1));

    // Batch A2 in Lab 202 with Dr. Jenkins at the SAME slot 7 should be VALID!
    const batchA2: IScheduledBlock = {
      blockId: 'blk-a2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      batch: 'A2',
      day: 'Monday',
      startSlotIndex: 7,
      blockLength: 2,
      subjectId: 'sub-os-lab',
      facultyIds: ['fac-1'],
      classroomId: 'lab-202',
      version: 1,
    };
    const resultA2 = validateBlockPlacement(state, batchA2);
    expect(resultA2.ok).toBe(true);

    // But a Whole-Section lecture at slot 7 must be REJECTED because A1 is in lab!
    const wholeSection: IScheduledBlock = {
      blockId: 'blk-whole',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 7,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-1'],
      classroomId: 'room-101',
      version: 1,
    };
    const resultWhole = validateBlockPlacement(state, wholeSection);
    expect(resultWhole.ok).toBe(false);
    expect(resultWhole.violations.some((v) => v.type === 'SECTION_COLLISION')).toBe(true);
  });

  it('rejects scheduling faculty on unavailable hard blocks', () => {
    const state = createBaseState();

    // Dr. Jenkins is unavailable Tuesday slot 1
    const block: IScheduledBlock = {
      blockId: 'blk-tues',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Tuesday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-1'],
      classroomId: 'room-101',
      version: 1,
    };

    const result = validateBlockPlacement(state, block);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'FACULTY_UNAVAILABLE')).toBe(true);
  });

  it('respects Saturday half-day boundary', () => {
    const state = createBaseState();

    // Saturday lastSlotIndex is 5
    // Trying to schedule at slot 7 on Saturday must be rejected
    const block: IScheduledBlock = {
      blockId: 'blk-sat',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Saturday',
      startSlotIndex: 7,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-2'],
      classroomId: 'room-101',
      version: 1,
    };

    const result = validateBlockPlacement(state, block);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'DAY_BOUNDARY_EXCEEDED')).toBe(true);
  });

  it('permits adjacent non-overlapping sessions in the same classroom without false collisions', () => {
    const state = createBaseState();

    // Slot 1 (09:00 - 10:00) in Room 101
    const block1: IScheduledBlock = {
      blockId: 'blk-adj-1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-1'],
      classroomId: 'room-101',
      version: 1,
    };
    state.slots = blockToSlots(block1);

    // Slot 2 (10:00 - 11:00) in the exact same Room 101 with a different professor
    const block2: IScheduledBlock = {
      blockId: 'blk-adj-2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5b',
      day: 'Monday',
      startSlotIndex: 2,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-2'],
      classroomId: 'room-101',
      version: 1,
    };

    const result = validateBlockPlacement(state, block2);
    // MUST BE TRUE: adjacent periods [09:00, 10:00) and [10:00, 11:00) do NOT collide
    expect(result.ok).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it('rejects placement when classroom type does not match subject requirement', () => {
    const state = createBaseState();

    // CS501L requires 'ComputerLab', but room-101 is 'LectureHall'
    const block: IScheduledBlock = {
      blockId: 'blk-type-mismatch',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 2,
      subjectId: 'sub-os-lab',
      facultyIds: ['fac-1'],
      classroomId: 'room-101',
      version: 1,
    };

    const result = validateBlockPlacement(state, block);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'ROOM_TYPE_MISMATCH')).toBe(true);
  });

  it('rejects placement when section strength exceeds classroom capacity', () => {
    const state = createBaseState();

    // lab-201 capacity is 40, but sec-5a strength is 60 (for whole section)
    const block: IScheduledBlock = {
      blockId: 'blk-cap-exceed',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 2,
      subjectId: 'sub-os-lab',
      facultyIds: ['fac-1'],
      classroomId: 'lab-201',
      version: 1,
    };

    const result = validateBlockPlacement(state, block);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.type === 'CAPACITY_EXCEEDED')).toBe(true);
  });

  it('computes reactive validTargets for drag previews', () => {
    const state = createBaseState();
    const block: IScheduledBlock = {
      blockId: 'blk-sample',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-1'],
      classroomId: 'room-101',
      version: 1,
    };

    const targets = computeValidTargets(state, block);
    expect(targets.size).toBeGreaterThan(0);
    // Tuesday slot 1 is invalid because Dr Jenkins is unavailable
    const tuesday1 = targets.get('Tuesday-1');
    expect(tuesday1?.ok).toBe(false);
    expect(tuesday1?.reasons.length).toBeGreaterThan(0);

    // Monday slot 1 is valid
    const monday1 = targets.get('Monday-1');
    expect(monday1?.ok).toBe(true);
  });
});


