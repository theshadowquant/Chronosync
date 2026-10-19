import { describe, it, expect } from 'vitest';
import { resolveConflicts, autoFillUnassigned } from '../index';
import { blockToSlots } from '../../engine';
import {
  TimetableState,
  IScheduledBlock,
  ITimeConfig,
  IFaculty,
  IClassroom,
  ISection,
  ISubject,
  ISubjectAssignment,
} from '../../types';

const mockTimeConfig: ITimeConfig = {
  academicYear: '2026-2027',
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  slots: [
    { index: 1, start: '09:00', end: '10:00', isBreak: false },
    { index: 2, start: '10:00', end: '11:00', isBreak: false },
    { index: 3, start: '11:15', end: '12:15', isBreak: false },
    { index: 4, start: '12:15', end: '13:15', isBreak: false },
    { index: 5, start: '14:00', end: '15:00', isBreak: false },
  ],
  halfDays: [],
};

const mockFaculties: IFaculty[] = [
  {
    id: 'fac-1',
    name: 'Dr. Sarah Jenkins',
    department: 'CSE',
    designation: 'Professor',
    email: 'sarah@institute.edu',
    maxWeeklyHours: 14,
    unavailable: [],
  },
  {
    id: 'fac-2',
    name: 'Prof. Alan Turing',
    department: 'CSE',
    designation: 'Assoc Professor',
    email: 'alan@institute.edu',
    maxWeeklyHours: 16,
    unavailable: [],
  },
];

const mockClassrooms: IClassroom[] = [
  { id: 'room-101', roomNo: 'LH-101', building: 'Turing Block', capacity: 70, type: 'LectureHall' },
  { id: 'room-102', roomNo: 'LH-102', building: 'Turing Block', capacity: 70, type: 'LectureHall' },
];

const mockSections: ISection[] = [
  { id: 'sec-5a', academicYear: '2026-2027', semester: 5, name: 'CS-5A', strength: 60, batches: [] },
  { id: 'sec-5b', academicYear: '2026-2027', semester: 5, name: 'CS-5B', strength: 60, batches: [] },
];

const mockSubjects: ISubject[] = [
  { id: 'sub-os', code: 'CS501', name: 'Operating Systems', isLab: false, requiredRoomType: 'LectureHall' },
  { id: 'sub-db', code: 'CS502', name: 'Database Systems', isLab: false, requiredRoomType: 'LectureHall' },
];

const mockAssignments: ISubjectAssignment[] = [
  {
    id: 'asg-1',
    academicYear: '2026-2027',
    sectionId: 'sec-5a',
    subjectId: 'sub-os',
    facultyIds: ['fac-1'],
    weeklySessionsRequired: 2,
  },
];

describe('ChronoSync CSP Solver', () => {
  it('proposes valid conflict-free resolutions for a double-booked faculty and returns SOLVED status', () => {
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

    const block2: IScheduledBlock = {
      blockId: 'blk-2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5b',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-db',
      facultyIds: ['fac-1'], // Double-booked
      classroomId: 'room-102',
      version: 1,
    };

    const state: TimetableState = {
      academicYear: '2026-2027',
      status: 'draft',
      storageMode: 'memory-development',
      timeConfig: mockTimeConfig,
      faculties: mockFaculties,
      classrooms: mockClassrooms,
      sections: mockSections,
      subjects: mockSubjects,
      assignments: mockAssignments,
      slots: [...blockToSlots(block1), ...blockToSlots(block2)],
    };

    const result = resolveConflicts(state);
    expect(result.status).toBe('SOLVED');
    expect(result.proposals.length).toBeGreaterThan(0);
    expect(result.proposals[0].remainingConflicts).toBe(0);
    expect(result.proposals[0].moves[0].reason).toContain('where Dr. Sarah Jenkins and room are free');
  });

  it('reports INFEASIBLE with diagnostic when conflicting blocks are locked/pinned', () => {
    // Both blocks are locked
    const block1: IScheduledBlock = {
      blockId: 'blk-locked-1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-1'],
      classroomId: 'room-101',
      locked: true, // Pinned!
      version: 1,
    };

    const block2: IScheduledBlock = {
      blockId: 'blk-locked-2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5b',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-db',
      facultyIds: ['fac-1'],
      classroomId: 'room-102',
      locked: true, // Pinned!
      version: 1,
    };

    const state: TimetableState = {
      academicYear: '2026-2027',
      status: 'draft',
      storageMode: 'memory-development',
      timeConfig: mockTimeConfig,
      faculties: mockFaculties,
      classrooms: mockClassrooms,
      sections: mockSections,
      subjects: mockSubjects,
      assignments: mockAssignments,
      slots: [...blockToSlots(block1), ...blockToSlots(block2)],
    };

    const result = resolveConflicts(state);
    expect(result.status).toBe('INFEASIBLE');
    expect(result.proposals.length).toBe(0);
    expect(result.bindingConstraint).toContain('All conflicting blocks are pinned/locked');
  });

  it('distinguishes search budget exhaustion as LIMIT_REACHED instead of false infeasibility', () => {
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

    const block2: IScheduledBlock = {
      blockId: 'blk-2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5b',
      day: 'Monday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-db',
      facultyIds: ['fac-1'],
      classroomId: 'room-102',
      version: 1,
    };

    const state: TimetableState = {
      academicYear: '2026-2027',
      status: 'draft',
      storageMode: 'memory-development',
      timeConfig: mockTimeConfig,
      faculties: mockFaculties,
      classrooms: mockClassrooms,
      sections: mockSections,
      subjects: mockSubjects,
      assignments: mockAssignments,
      slots: [...blockToSlots(block1), ...blockToSlots(block2)],
    };

    // Force limit with 0 iterations allowed
    const result = resolveConflicts(state, { maxIterations: 0, timeoutMs: 0 });
    expect(result.status).toBe('LIMIT_REACHED');
    expect(result.bindingConstraint).toContain('Search iteration cap or timeout budget reached');
  });

  it('auto-fills unassigned quota without creating conflicts and respects faculty maxWeeklyHours', () => {
    const state: TimetableState = {
      academicYear: '2026-2027',
      status: 'draft',
      storageMode: 'memory-development',
      timeConfig: mockTimeConfig,
      faculties: [
        {
          id: 'fac-limited',
          name: 'Limited Prof',
          department: 'CSE',
          designation: 'Lecturer',
          email: 'limited@institute.edu',
          maxWeeklyHours: 2, // Only 2 hours allowed
          unavailable: [],
        },
      ],
      classrooms: mockClassrooms,
      sections: mockSections,
      subjects: mockSubjects,
      assignments: [
        {
          id: 'asg-limited',
          academicYear: '2026-2027',
          sectionId: 'sec-5a',
          subjectId: 'sub-os',
          facultyIds: ['fac-limited'],
          weeklySessionsRequired: 4, // Requests 4 hours, but prof limit is 2
        },
      ],
      slots: [],
    };

    const result = autoFillUnassigned(state);
    // Should place exactly 2 sessions, and cap at maxWeeklyHours
    expect(result.placedCount).toBe(2);
    expect(result.unassignedReasons.length).toBeGreaterThan(0);
    expect(result.unassignedReasons[0]).toContain('reached max hours');
  });
});
