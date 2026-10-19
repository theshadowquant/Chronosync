import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITimetableSlotDocument extends Document {
  academicYear: string;
  semester: number;
  sectionId: string;
  batch?: string;
  batchKey: string;
  day: string;
  slotIndex: number;
  blockId: string;
  blockOffset: number;
  blockLength: number;
  subjectId: string;
  facultyIds: string[];
  facultyKeys: string[];
  classroomId: string;
  locked: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const TimetableSlotSchema = new Schema<ITimetableSlotDocument>(
  {
    academicYear: { type: String, required: true, index: true },
    semester: { type: Number, required: true },
    sectionId: { type: String, required: true, index: true },
    batch: { type: String },
    batchKey: { type: String, default: '*', index: true }, // '*' for whole-section, or batch name 'A1'
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      index: true,
    },
    slotIndex: { type: Number, required: true, index: true },
    blockId: { type: String, required: true, index: true },
    blockOffset: { type: Number, required: true, default: 0 },
    blockLength: { type: Number, required: true, default: 1 },
    subjectId: { type: String, required: true },
    facultyIds: [{ type: String, required: true }],
    facultyKeys: [{ type: String, required: true }],
    classroomId: { type: String, required: true },
    locked: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Compound Unique Indexes for Atomic Concurrency Enforcement
TimetableSlotSchema.index({ academicYear: 1, day: 1, slotIndex: 1, classroomId: 1 }, { unique: true });
TimetableSlotSchema.index({ academicYear: 1, day: 1, slotIndex: 1, facultyKeys: 1 });
TimetableSlotSchema.index({ academicYear: 1, sectionId: 1, day: 1, slotIndex: 1, batchKey: 1 });

export const TimetableSlot: Model<ITimetableSlotDocument> =
  mongoose.models.TimetableSlot || mongoose.model<ITimetableSlotDocument>('TimetableSlot', TimetableSlotSchema);
