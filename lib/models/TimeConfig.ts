import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITimeConfigDocument extends Document {
  academicYear: string;
  days: string[];
  slots: {
    index: number;
    start: string;
    end: string;
    isBreak: boolean;
    breakLabel?: string;
  }[];
  halfDays: {
    day: string;
    lastSlotIndex: number;
  }[];
}

const TimeConfigSchema = new Schema<ITimeConfigDocument>(
  {
    academicYear: { type: String, required: true, unique: true },
    days: [{ type: String, required: true }],
    slots: [
      {
        index: { type: Number, required: true },
        start: { type: String, required: true },
        end: { type: String, required: true },
        isBreak: { type: Boolean, default: false },
        breakLabel: { type: String },
      },
    ],
    halfDays: [
      {
        day: { type: String, required: true },
        lastSlotIndex: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const TimeConfig: Model<ITimeConfigDocument> =
  mongoose.models.TimeConfig ||
  mongoose.model<ITimeConfigDocument>('TimeConfig', TimeConfigSchema);
