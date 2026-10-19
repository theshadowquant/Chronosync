export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export type RoomType = 'LectureHall' | 'ComputerLab' | 'HardwareLab' | 'SeminarHall';

export interface IFaculty {
  id: string;
  name: string;
  department: string;
  designation: string;
  email: string;
  maxWeeklyHours: number;
  unavailable: { day: Day; slotIndex: number }[]; // hard blocks
  preferredSlots?: { day: Day; slotIndex: number }[]; // soft preference
}

export interface IClassroom {
  id: string;
  roomNo: string;
  building: string;
  capacity: number;
  type: RoomType;
}

export interface IBatch {
  name: string; // e.g. "A1", "A2"
  strength: number;
}

export interface ISection {
  id: string;
  academicYear: string;
  semester: number;
  name: string; // e.g. "CS-A", "CS-B"
  strength: number;
  batches: IBatch[];
}

export interface ISubject {
  id: string;
  code: string;
  name: string;
  isLab: boolean;
  requiredRoomType: RoomType;
  labBlockLength?: 2 | 3;
  color?: string; // Hex or theme token for cyber visual identity
}

export interface ISubjectAssignment {
  id: string;
  academicYear: string;
  sectionId: string;
  subjectId: string;
  facultyIds: string[];
  weeklySessionsRequired: number; // quota
}

export interface ISlotConfig {
  index: number;
  start: string;
  end: string;
  isBreak: boolean;
  breakLabel?: string;
}

export interface ITimeConfig {
  academicYear: string;
  days: Day[];
  slots: ISlotConfig[];
  halfDays: { day: Day; lastSlotIndex: number }[];
}

// Atomic timetable cell: A 2-slot lab creates 2 records sharing blockId
export interface ITimetableSlot {
  id: string;
  academicYear: string;
  semester: number;
  sectionId: string;
  batch?: string; // undefined or '*' = whole section, 'A1', 'A2' = sub-batch
  day: Day;
  slotIndex: number;
  blockId: string;
  blockOffset: number; // 0, 1, 2
  blockLength: number; // 1 for lecture, 2 or 3 for lab
  subjectId: string;
  facultyIds: string[];
  classroomId: string;
  locked?: boolean; // Pinned by user
  version: number;
}

// High level block representation for drag & drop & inspection
export interface IScheduledBlock {
  blockId: string;
  academicYear: string;
  semester: number;
  sectionId: string;
  batch?: string;
  day: Day;
  startSlotIndex: number;
  blockLength: number;
  subjectId: string;
  facultyIds: string[];
  classroomId: string;
  locked?: boolean;
  version: number;
}

export type ViolationType =
  | 'FACULTY_DOUBLE_BOOKING'
  | 'ROOM_OCCUPIED'
  | 'SECTION_COLLISION'
  | 'BATCH_COLLISION'
  | 'FACULTY_UNAVAILABLE'
  | 'FACULTY_MAX_HOURS_EXCEEDED'
  | 'ROOM_TYPE_MISMATCH'
  | 'CAPACITY_EXCEEDED'
  | 'BREAK_OVERLAP'
  | 'DAY_BOUNDARY_EXCEEDED';

export interface Violation {
  type: ViolationType;
  day: Day;
  slotIndex: number;
  entityId?: string;
  entityName?: string;
  conflictingBlockId?: string;
  reason: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: Violation[];
}

export interface TargetCellEvaluation {
  ok: boolean;
  reasons: string[];
}

export type TimetablePublishStatus = 'draft' | 'published';

export type UserRole = 'admin' | 'viewer';

export type SolverStatus = 'SOLVED' | 'PARTIAL' | 'INFEASIBLE' | 'LIMIT_REACHED';

export interface TimetableState {
  academicYear: string;
  status: TimetablePublishStatus;
  storageMode: 'mongodb' | 'memory-development';
  slots: ITimetableSlot[];
  faculties: IFaculty[];
  classrooms: IClassroom[];
  sections: ISection[];
  subjects: ISubject[];
  assignments: ISubjectAssignment[];
  timeConfig: ITimeConfig;
}

export interface ISolverProposalMove {
  blockId: string;
  subjectCode: string;
  fromDay: Day;
  fromSlot: number;
  toDay: Day;
  toSlot: number;
  reason: string;
}

export interface ISolverProposal {
  id: string;
  score: number;
  moves: ISolverProposalMove[];
  summary: string;
  remainingConflicts: number;
}

export interface ISolverResult {
  status: SolverStatus;
  proposals: ISolverProposal[];
  bindingConstraint?: string;
  searchDurationMs: number;
  totalConflictsBefore: number;
  diagnostic: string;
}
