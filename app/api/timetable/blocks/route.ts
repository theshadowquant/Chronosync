import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TimetableRepository } from '@/lib/db/repository';
import { IScheduledBlock } from '@/lib/types';

const CreateBlockSchema = z.object({
  academicYear: z.string(),
  semester: z.number(),
  sectionId: z.string(),
  batch: z.string().optional(),
  day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
  startSlotIndex: z.number().int().min(1),
  blockLength: z.number().int().min(1).max(3),
  subjectId: z.string(),
  facultyIds: z.array(z.string()).min(1),
  classroomId: z.string(),
  locked: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = CreateBlockSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const newBlock: IScheduledBlock = {
      ...parsed.data,
      blockId: `blk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      version: 1,
    };

    const result = await TimetableRepository.saveBlock(newBlock);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          violations: result.violations,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, block: result.block }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create block' },
      { status: 500 }
    );
  }
}
