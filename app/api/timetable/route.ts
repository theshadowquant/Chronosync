import { NextResponse } from 'next/server';
import { TimetableRepository } from '@/lib/db/repository';
import { findAllConflicts } from '@/lib/engine';

export async function GET(request: Request) {
  try {
    const state = await TimetableRepository.getState();
    const conflicts = findAllConflicts(state);

    return NextResponse.json({
      success: true,
      data: {
        ...state,
        conflicts,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load timetable state' },
      { status: 500 }
    );
  }
}
