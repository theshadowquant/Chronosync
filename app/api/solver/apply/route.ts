import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TimetableRepository } from '@/lib/db/repository';
import { slotsToBlocks } from '@/lib/engine';
import { IScheduledBlock } from '@/lib/types';

const ApplySchema = z.object({
  moves: z.array(
    z.object({
      blockId: z.string(),
      toDay: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
      toSlot: z.number().int(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = ApplySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid moves payload' }, { status: 400 });
    }

    const state = await TimetableRepository.getState();
    const allBlocks = slotsToBlocks(state.slots);
    const updatedBlocks: IScheduledBlock[] = [];

    for (const move of parsed.data.moves) {
      const target = allBlocks.find((b) => b.blockId === move.blockId);
      if (target) {
        updatedBlocks.push({
          ...target,
          day: move.toDay,
          startSlotIndex: move.toSlot,
        });
      }
    }

    await TimetableRepository.applyBulkMoves(updatedBlocks);
    const newState = await TimetableRepository.getState();

    return NextResponse.json({
      success: true,
      message: `Applied ${parsed.data.moves.length} moves successfully`,
      data: newState,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to apply moves' },
      { status: 500 }
    );
  }
}
