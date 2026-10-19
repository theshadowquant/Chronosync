import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TimetableRepository } from '@/lib/db/repository';
import { IScheduledBlock } from '@/lib/types';

const UpdateBlockSchema = z.object({
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']).optional(),
  startSlotIndex: z.number().int().min(1).optional(),
  blockLength: z.number().int().min(1).max(3).optional(),
  subjectId: z.string().optional(),
  facultyIds: z.array(z.string()).optional(),
  classroomId: z.string().optional(),
  batch: z.string().optional(),
  locked: z.boolean().optional(),
  version: z.number().int(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { blockId: string } }
) {
  try {
    const { blockId } = params;
    const json = await request.json();
    const parsed = UpdateBlockSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid update payload', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const state = await TimetableRepository.getState();
    const existingSlot = state.slots.find((s) => s.blockId === blockId);
    if (!existingSlot) {
      return NextResponse.json({ success: false, error: 'Block not found' }, { status: 404 });
    }

    const updatedBlock: IScheduledBlock = {
      blockId,
      academicYear: existingSlot.academicYear,
      semester: existingSlot.semester,
      sectionId: existingSlot.sectionId,
      batch: parsed.data.batch !== undefined ? parsed.data.batch : existingSlot.batch,
      day: parsed.data.day || existingSlot.day,
      startSlotIndex: parsed.data.startSlotIndex !== undefined ? parsed.data.startSlotIndex : existingSlot.slotIndex,
      blockLength: parsed.data.blockLength !== undefined ? parsed.data.blockLength : existingSlot.blockLength,
      subjectId: parsed.data.subjectId || existingSlot.subjectId,
      facultyIds: parsed.data.facultyIds || existingSlot.facultyIds,
      classroomId: parsed.data.classroomId || existingSlot.classroomId,
      locked: parsed.data.locked !== undefined ? parsed.data.locked : existingSlot.locked,
      version: parsed.data.version,
    };

    const result = await TimetableRepository.saveBlock(updatedBlock);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          violations: result.violations,
          versionConflict: result.versionConflict,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, block: result.block });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update block' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { blockId: string } }
) {
  try {
    const { blockId } = params;
    const deleted = await TimetableRepository.deleteBlock(blockId);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Block not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Block deleted' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete block' },
      { status: 500 }
    );
  }
}
