import {
  TimetableState,
  IFaculty,
  IClassroom,
  ISection,
  ISubject,
  ISubjectAssignment,
  ITimeConfig,
  IScheduledBlock,
} from '../types';
import { blockToSlots } from '../engine';

export const initialTimeConfig: ITimeConfig = {
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
    { index: 9, start: '16:00', end: '17:00', isBreak: false },
  ],
  halfDays: [{ day: 'Saturday', lastSlotIndex: 5 }],
};

export const initialFaculties: IFaculty[] = [
  {
    id: 'fac-jenkins',
    name: 'Dr. Sarah Jenkins',
    department: 'CSE',
    designation: 'Professor & Head',
    email: 'sarah.jenkins@chronosync.edu',
    maxWeeklyHours: 14,
    unavailable: [{ day: 'Tuesday', slotIndex: 1 }],
    preferredSlots: [{ day: 'Monday', slotIndex: 1 }, { day: 'Wednesday', slotIndex: 2 }],
  },
  {
    id: 'fac-turing',
    name: 'Prof. Alan Turing',
    department: 'CSE',
    designation: 'Chair Professor',
    email: 'alan.turing@chronosync.edu',
    maxWeeklyHours: 16,
    unavailable: [{ day: 'Friday', slotIndex: 8 }],
  },
  {
    id: 'fac-lovelace',
    name: 'Dr. Ada Lovelace',
    department: 'CSE',
    designation: 'Assoc. Professor',
    email: 'ada.lovelace@chronosync.edu',
    maxWeeklyHours: 14,
    unavailable: [],
  },
  {
    id: 'fac-hopper',
    name: 'Dr. Grace Hopper',
    department: 'CSE',
    designation: 'Professor',
    email: 'grace.hopper@chronosync.edu',
    maxWeeklyHours: 15,
    unavailable: [{ day: 'Thursday', slotIndex: 9 }],
  },
  {
    id: 'fac-neumann',
    name: 'Prof. John von Neumann',
    department: 'CSE',
    designation: 'Distinguished Professor',
    email: 'j.neumann@chronosync.edu',
    maxWeeklyHours: 12,
    unavailable: [{ day: 'Saturday', slotIndex: 4 }],
  },
  {
    id: 'fac-shannon',
    name: 'Dr. Claude Shannon',
    department: 'CSE',
    designation: 'Assoc. Professor',
    email: 'claude.shannon@chronosync.edu',
    maxWeeklyHours: 14,
    unavailable: [],
  },
  {
    id: 'fac-knuth',
    name: 'Dr. Donald Knuth',
    department: 'CSE',
    designation: 'Visiting Chair',
    email: 'd.knuth@chronosync.edu',
    maxWeeklyHours: 10,
    unavailable: [],
  },
  {
    id: 'fac-hamilton',
    name: 'Dr. Margaret Hamilton',
    department: 'CSE',
    designation: 'Professor of Systems',
    email: 'm.hamilton@chronosync.edu',
    maxWeeklyHours: 14,
    unavailable: [],
  },
];

export const initialClassrooms: IClassroom[] = [
  { id: 'room-lh101', roomNo: 'LH-101', building: 'Turing Hall', capacity: 75, type: 'LectureHall' },
  { id: 'room-lh102', roomNo: 'LH-102', building: 'Turing Hall', capacity: 75, type: 'LectureHall' },
  { id: 'room-lh103', roomNo: 'LH-103', building: 'Turing Hall', capacity: 65, type: 'LectureHall' },
  { id: 'room-lh201', roomNo: 'LH-201', building: 'Babbage Wing', capacity: 70, type: 'LectureHall' },
  { id: 'room-lab1', roomNo: 'CS-Lab-01', building: 'Linus Complex', capacity: 40, type: 'ComputerLab' },
  { id: 'room-lab2', roomNo: 'CS-Lab-02', building: 'Linus Complex', capacity: 40, type: 'ComputerLab' },
  { id: 'room-hwlab', roomNo: 'HW-Lab-01', building: 'Franklin Center', capacity: 35, type: 'HardwareLab' },
];

export const initialSections: ISection[] = [
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
  {
    id: 'sec-7a',
    academicYear: '2026-2027',
    semester: 7,
    name: 'CS-7A',
    strength: 55,
    batches: [
      { name: '7A1', strength: 28 },
      { name: '7A2', strength: 27 },
    ],
  },
];

export const initialSubjects: ISubject[] = [
  {
    id: 'sub-os',
    code: 'CS501',
    name: 'Operating Systems',
    isLab: false,
    requiredRoomType: 'LectureHall',
    color: '#6366f1', // Electric Indigo
  },
  {
    id: 'sub-dbms',
    code: 'CS502',
    name: 'Database Systems',
    isLab: false,
    requiredRoomType: 'LectureHall',
    color: '#06b6d4', // Cyan
  },
  {
    id: 'sub-cn',
    code: 'CS503',
    name: 'Computer Networks',
    isLab: false,
    requiredRoomType: 'LectureHall',
    color: '#10b981', // Emerald
  },
  {
    id: 'sub-toc',
    code: 'CS504',
    name: 'Theory of Computation',
    isLab: false,
    requiredRoomType: 'LectureHall',
    color: '#8b5cf6', // Violet
  },
  {
    id: 'sub-ai',
    code: 'CS505',
    name: 'Artificial Intelligence',
    isLab: false,
    requiredRoomType: 'LectureHall',
    color: '#f59e0b', // Amber
  },
  {
    id: 'sub-os-lab',
    code: 'CS501L',
    name: 'OS Kernel Lab',
    isLab: true,
    requiredRoomType: 'ComputerLab',
    labBlockLength: 2,
    color: '#ec4899', // Pink
  },
  {
    id: 'sub-db-lab',
    code: 'CS502L',
    name: 'DBMS Internal Lab',
    isLab: true,
    requiredRoomType: 'ComputerLab',
    labBlockLength: 2,
    color: '#3b82f6', // Blue
  },
];

export const initialAssignments: ISubjectAssignment[] = [
  {
    id: 'asg-os-5a',
    academicYear: '2026-2027',
    sectionId: 'sec-5a',
    subjectId: 'sub-os',
    facultyIds: ['fac-jenkins'],
    weeklySessionsRequired: 4,
  },
  {
    id: 'asg-dbms-5a',
    academicYear: '2026-2027',
    sectionId: 'sec-5a',
    subjectId: 'sub-dbms',
    facultyIds: ['fac-turing'],
    weeklySessionsRequired: 4,
  },
  {
    id: 'asg-cn-5a',
    academicYear: '2026-2027',
    sectionId: 'sec-5a',
    subjectId: 'sub-cn',
    facultyIds: ['fac-lovelace'],
    weeklySessionsRequired: 3,
  },
  {
    id: 'asg-toc-5a',
    academicYear: '2026-2027',
    sectionId: 'sec-5a',
    subjectId: 'sub-toc',
    facultyIds: ['fac-neumann'],
    weeklySessionsRequired: 3,
  },
  {
    id: 'asg-ai-5a',
    academicYear: '2026-2027',
    sectionId: 'sec-5a',
    subjectId: 'sub-ai',
    facultyIds: ['fac-shannon'],
    weeklySessionsRequired: 3,
  },
  {
    id: 'asg-oslab-5a',
    academicYear: '2026-2027',
    sectionId: 'sec-5a',
    subjectId: 'sub-os-lab',
    facultyIds: ['fac-jenkins', 'fac-hopper'],
    weeklySessionsRequired: 1,
  },
];

export function getInitialSeedBlocks(): IScheduledBlock[] {
  return [
    // Monday Schedule for CS-5A
    {
      blockId: 'seed-blk-1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 1, // 09:00 - 10:00
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-jenkins'],
      classroomId: 'room-lh101',
      locked: true,
      version: 1,
    },
    // INTENTIONAL DEMO CONFLICT:
    // Dr. Sarah Jenkins is scheduled for CS-5A at Monday Slot 2 (10:00 - 11:00)...
    {
      blockId: 'seed-blk-conflict-5a',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 2, // 10:00 - 11:00
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-jenkins'],
      classroomId: 'room-lh101',
      locked: false,
      version: 1,
    },
    // ...AND simultaneously scheduled for CS-5B at the EXACT SAME slot!
    {
      blockId: 'seed-blk-conflict-5b',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5b',
      day: 'Monday',
      startSlotIndex: 2, // 10:00 - 11:00
      blockLength: 1,
      subjectId: 'sub-dbms',
      facultyIds: ['fac-jenkins'], // Clash!
      classroomId: 'room-lh102',
      locked: false,
      version: 1,
    },
    // Monday Slot 4: CS502 (DBMS) with Alan Turing
    {
      blockId: 'seed-blk-3',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Monday',
      startSlotIndex: 4, // 11:15 - 12:15
      blockLength: 1,
      subjectId: 'sub-dbms',
      facultyIds: ['fac-turing'],
      classroomId: 'room-lh101',
      version: 1,
    },
    // Monday Afternoon: 2-slot OS Lab (Slots 7 & 8) for Batch A1
    {
      blockId: 'seed-blk-lab-a1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      batch: 'A1',
      day: 'Monday',
      startSlotIndex: 7, // 14:00 - 16:00 (2 slots)
      blockLength: 2,
      subjectId: 'sub-os-lab',
      facultyIds: ['fac-hopper'],
      classroomId: 'room-lab1',
      version: 1,
    },
    // Parallel Monday Afternoon: Batch A2 in Lab 2
    {
      blockId: 'seed-blk-lab-a2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      batch: 'A2',
      day: 'Monday',
      startSlotIndex: 7, // 14:00 - 16:00 (2 slots)
      blockLength: 2,
      subjectId: 'sub-db-lab',
      facultyIds: ['fac-turing'],
      classroomId: 'room-lab2',
      version: 1,
    },
    // Tuesday Slots
    {
      blockId: 'seed-blk-tue-1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Tuesday',
      startSlotIndex: 2, // 10:00 - 11:00
      blockLength: 1,
      subjectId: 'sub-cn',
      facultyIds: ['fac-lovelace'],
      classroomId: 'room-lh101',
      version: 1,
    },
    {
      blockId: 'seed-blk-tue-2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Tuesday',
      startSlotIndex: 4, // 11:15 - 12:15
      blockLength: 1,
      subjectId: 'sub-toc',
      facultyIds: ['fac-neumann'],
      classroomId: 'room-lh101',
      version: 1,
    },
    // Wednesday Slots
    {
      blockId: 'seed-blk-wed-1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Wednesday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-ai',
      facultyIds: ['fac-shannon'],
      classroomId: 'room-lh101',
      version: 1,
    },
    {
      blockId: 'seed-blk-wed-2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Wednesday',
      startSlotIndex: 5,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-jenkins'],
      classroomId: 'room-lh101',
      version: 1,
    },
    // Thursday Slots
    {
      blockId: 'seed-blk-thu-1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Thursday',
      startSlotIndex: 2,
      blockLength: 1,
      subjectId: 'sub-dbms',
      facultyIds: ['fac-turing'],
      classroomId: 'room-lh101',
      version: 1,
    },
    {
      blockId: 'seed-blk-thu-2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Thursday',
      startSlotIndex: 4,
      blockLength: 1,
      subjectId: 'sub-cn',
      facultyIds: ['fac-lovelace'],
      classroomId: 'room-lh101',
      version: 1,
    },
    // Friday Slots
    {
      blockId: 'seed-blk-fri-1',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Friday',
      startSlotIndex: 1,
      blockLength: 1,
      subjectId: 'sub-toc',
      facultyIds: ['fac-neumann'],
      classroomId: 'room-lh101',
      version: 1,
    },
    {
      blockId: 'seed-blk-fri-2',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Friday',
      startSlotIndex: 2,
      blockLength: 1,
      subjectId: 'sub-ai',
      facultyIds: ['fac-shannon'],
      classroomId: 'room-lh101',
      version: 1,
    },
  ];
}

export function createInitialState(): TimetableState {
  const seedBlocks = getInitialSeedBlocks();
  const allSlots = seedBlocks.flatMap((b) => blockToSlots(b));

  return {
    academicYear: '2026-2027',
    status: 'draft',
    storageMode: 'memory-development',
    timeConfig: initialTimeConfig,
    faculties: initialFaculties,
    classrooms: initialClassrooms,
    sections: initialSections,
    subjects: initialSubjects,
    assignments: initialAssignments,
    slots: allSlots,
  };
}

