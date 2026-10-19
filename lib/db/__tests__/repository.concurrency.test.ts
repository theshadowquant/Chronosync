import { describe, it, expect, beforeEach } from 'vitest';
import { TimetableRepository } from '../repository';
import { IScheduledBlock } from '../../types';

describe('TimetableRepository Concurrency & Integrity Guarantees', () => {
  beforeEach(async () => {
    await TimetableRepository.resetSeed();
  });

  it('serializes concurrent writes for the same room and slot so that exactly one succeeds', async () => {
    // Two competing administrators submit assignments for room-lh101 at Tuesday Slot 5 simultaneously
    const blockA: IScheduledBlock = {
      blockId: 'race-block-a',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5a',
      day: 'Tuesday',
      startSlotIndex: 5,
      blockLength: 1,
      subjectId: 'sub-os',
      facultyIds: ['fac-jenkins'],
      classroomId: 'room-lh101',
      version: 1,
    };

    const blockB: IScheduledBlock = {
      blockId: 'race-block-b',
      academicYear: '2026-2027',
      semester: 5,
      sectionId: 'sec-5b',
      day: 'Tuesday',
      startSlotIndex: 5,
      blockLength: 1,
      subjectId: 'sub-dbms',
      facultyIds: ['fac-turing'],
      classroomId: 'room-lh101', // Exact same room and slot!
      version: 1,
    };

    // Fire both requests concurrently using Promise.all
    const [resultA, resultB] = await Promise.all([
      TimetableRepository.saveBlock(blockA),
      TimetableRepository.saveBlock(blockB),
    ]);

    const successes = [resultA.success, resultB.success].filter(Boolean);
    const failures = [resultA, resultB].filter((r) => !r.success);

    // EXACTLY ONE must succeed; the other must fail with a collision violation
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(failures[0].violations?.some((v) => v.type === 'ROOM_OCCUPIED')).toBe(true);
  });

  it('rejects stale version updates (optimistic concurrency control)', async () => {
    const state = await TimetableRepository.getState();
    const targetBlock = state.slots[0];
    expect(targetBlock).toBeDefined();

    const staleVersion = targetBlock.version;

    // First administrator successfully updates block
    const update1 = await TimetableRepository.saveBlock({
      blockId: targetBlock.blockId,
      academicYear: targetBlock.academicYear,
      semester: targetBlock.semester,
      sectionId: targetBlock.sectionId,
      day: targetBlock.day,
      startSlotIndex: targetBlock.slotIndex,
      blockLength: 1,
      subjectId: targetBlock.subjectId,
      facultyIds: targetBlock.facultyIds,
      classroomId: targetBlock.classroomId,
      version: staleVersion,
    });
    expect(update1.success).toBe(true);

    // Second administrator attempts to update with the now-stale version
    const update2 = await TimetableRepository.saveBlock({
      blockId: targetBlock.blockId,
      academicYear: targetBlock.academicYear,
      semester: targetBlock.semester,
      sectionId: targetBlock.sectionId,
      day: targetBlock.day,
      startSlotIndex: targetBlock.slotIndex,
      blockLength: 1,
      subjectId: targetBlock.subjectId,
      facultyIds: targetBlock.facultyIds,
      classroomId: targetBlock.classroomId,
      version: staleVersion, // Stale!
    });

    expect(update2.success).toBe(false);
    expect(update2.versionConflict).toBe(true);
    expect(update2.error).toContain('Stale update');
  });

  it('prevents publishing a timetable when active conflicts exist', async () => {
    // Seed has 1 intentional demo collision
    const pubResult = await TimetableRepository.setPublishStatus('published');
    expect(pubResult.success).toBe(false);
    expect(pubResult.error).toContain('unresolved hard collision');

    // Retains draft status
    const state = await TimetableRepository.getState();
    expect(state.status).toBe('draft');
  });
});
