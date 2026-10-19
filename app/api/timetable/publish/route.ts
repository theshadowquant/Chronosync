import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TimetableRepository } from '@/lib/db/repository';

const PublishSchema = z.object({
  status: z.enum(['draft', 'published']),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = PublishSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid publish status' },
        { status: 400 }
      );
    }

    const result = await TimetableRepository.setPublishStatus(parsed.data.status);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      message: `Timetable marked as ${result.status.toUpperCase()}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update publish status' },
      { status: 500 }
    );
  }
}
