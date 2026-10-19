import { NextResponse } from 'next/server';
import { TimetableRepository } from '@/lib/db/repository';

export async function POST() {
  try {
    const freshState = await TimetableRepository.resetSeed();
    return NextResponse.json({
      success: true,
      message: 'Timetable state reset to initial seed with intentional conflict',
      data: freshState,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset seed' },
      { status: 500 }
    );
  }
}
