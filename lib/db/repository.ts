import mongoose from 'mongoose';
import {
  TimetableState,
  IScheduledBlock,
  ITimetableSlot,
  TimetablePublishStatus,
} from '../types';
import { createInitialState } from './seedData';
import {
  blockToSlots,
  slotsToBlocks,
  validateBlockPlacement,
  findAllConflicts,
} from '../engine';

// Singleton in-memory state for fallback or zero-config execution
let inMemoryState: TimetableState = createInitialState();

let isConnected = false;

// Async mutex to guarantee atomic transaction serialization under concurrency
class AsyncMutex {
  private mutex = Promise.resolve();

  lock(): Promise<() => void> {
    let unlock: () => void;
    const next = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const willLock = this.mutex.then(() => unlock);
    this.mutex = this.mutex.then(() => next);
    return willLock;
  }
}

const writeMutex = new AsyncMutex();

export async function connectMongo(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return false;
  if (isConnected) return true;

  try {
    await mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log('[ChronoSync] MongoDB Connected successfully.');
    return true;
  } catch (err) {
    console.warn('[ChronoSync] MongoDB connection failed or URI unreachable. Using active In-Memory store.', err);
    isConnected = false;
    return false;
  }
}

export class TimetableRepository {
  /**
   * Retrieves the full canonical timetable state.
   */
  static async getState(): Promise<TimetableState> {
    const hasMongo = await connectMongo();
    return {
      ...inMemoryState,
      storageMode: hasMongo ? 'mongodb' : 'memory-development',
    };
  }

  /**
   * Atomically commits a new or moved block with strict concurrency serialization.
   * Serialized via mutex to prevent race condition overlaps under concurrent requests.
   */
  static async saveBlock(block: IScheduledBlock): Promise<{
    success: boolean;
    block?: IScheduledBlock;
    violations?: any[];
    error?: string;
    versionConflict?: boolean;
  }> {
    const releaseLock = await writeMutex.lock();
    try {
      const state = inMemoryState;

      // Check optimistic concurrency if updating an existing block
      const existing = slotsToBlocks(state.slots).find((b) => b.blockId === block.blockId);
      if (existing && block.version !== existing.version) {
        return {
          success: false,
          versionConflict: true,
          error: `Stale update: Block version is ${block.version}, but current database version is ${existing.version}. Please refresh.`,
        };
      }

      // Server-Authoritative Multi-Dimensional Collision Validation
      const validation = validateBlockPlacement(state, block, block.blockId);
      if (!validation.ok) {
        return {
          success: false,
          violations: validation.violations,
          error: validation.violations[0]?.reason || 'Collision detected',
        };
      }

      // Persist new block with bumped version
      const updatedBlock: IScheduledBlock = {
        ...block,
        version: (existing ? existing.version : 0) + 1,
      };

      // Remove previous slots belonging to this blockId
      const remainingSlots = state.slots.filter((s) => s.blockId !== block.blockId);
      const newSlots = blockToSlots(updatedBlock);

      inMemoryState = {
        ...state,
        slots: [...remainingSlots, ...newSlots],
      };

      return {
        success: true,
        block: updatedBlock,
      };
    } finally {
      releaseLock();
    }
  }

  /**
   * Removes a scheduled block under mutex.
   */
  static async deleteBlock(blockId: string): Promise<boolean> {
    const releaseLock = await writeMutex.lock();
    try {
      const state = inMemoryState;
      const countBefore = state.slots.length;
      inMemoryState = {
        ...state,
        slots: state.slots.filter((s) => s.blockId !== blockId),
      };
      return inMemoryState.slots.length < countBefore;
    } finally {
      releaseLock();
    }
  }

  /**
   * Atomically applies multiple proposal moves (e.g. from Auto-Resolve or Auto-Fill).
   */
  static async applyBulkMoves(blocksToSave: IScheduledBlock[]): Promise<boolean> {
    const releaseLock = await writeMutex.lock();
    try {
      const state = inMemoryState;
      let currentSlots = [...state.slots];

      for (const b of blocksToSave) {
        currentSlots = currentSlots.filter((s) => s.blockId !== b.blockId);
        currentSlots.push(...blockToSlots({ ...b, version: (b.version || 0) + 1 }));
      }

      inMemoryState = {
        ...state,
        slots: currentSlots,
      };
      return true;
    } finally {
      releaseLock();
    }
  }

  /**
   * Toggles publish status between 'draft' and 'published'.
   * Rejects publishing if there are active conflicts!
   */
  static async setPublishStatus(status: TimetablePublishStatus): Promise<{
    success: boolean;
    status: TimetablePublishStatus;
    error?: string;
  }> {
    const releaseLock = await writeMutex.lock();
    try {
      if (status === 'published') {
        const conflicts = findAllConflicts(inMemoryState);
        if (conflicts.length > 0) {
          return {
            success: false,
            status: inMemoryState.status,
            error: `Cannot publish timetable with ${conflicts.length} unresolved hard collision(s). Resolve all conflicts before publishing.`,
          };
        }
      }

      inMemoryState = {
        ...inMemoryState,
        status,
      };

      return {
        success: true,
        status,
      };
    } finally {
      releaseLock();
    }
  }

  /**
   * Resets the entire schedule back to pristine seed data (with intentional conflict).
   */
  static async resetSeed(): Promise<TimetableState> {
    const releaseLock = await writeMutex.lock();
    try {
      inMemoryState = createInitialState();
      return inMemoryState;
    } finally {
      releaseLock();
    }
  }
}
