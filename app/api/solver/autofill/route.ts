import { NextResponse } from 'next/server';
import { TimetableRepository } from '@/lib/db/repository';
import { autoFillUnassigned } from '@/lib/solver';

export async function POST(request: Request) {
  try {
    const state = await TimetableRepository.getState();
    const result = autoFillUnassigned(state);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Auto-fill failed' },
      { status: 500 }
    );
  }
}
