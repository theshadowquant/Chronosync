import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFacultyDocument extends Document {
  name: string;
  department: string;
  designation: string;
  email: string;
  maxWeeklyHours: number;
  unavailable: { day: string; slotIndex: number }[];
  preferredSlots: { day: string; slotIndex: number }[];
}

const FacultySchema = new Schema<IFacultyDocument>(
  {
    name: { type: String, required: true },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    maxWeeklyHours: { type: Number, default: 16 },
    unavailable: [{ day: String, slotIndex: Number }],
    preferredSlots: [{ day: String, slotIndex: Number }],
  },
  { timestamps: true }
);

export const Faculty: Model<IFacultyDocument> =
  mongoose.models.Faculty || mongoose.model<IFacultyDocument>('Faculty', FacultySchema);
