import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubjectDocument extends Document {
  code: string;
  name: string;
  isLab: boolean;
  requiredRoomType: string;
  labBlockLength?: number;
  color?: string;
}

const SubjectSchema = new Schema<ISubjectDocument>(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    isLab: { type: Boolean, default: false },
    requiredRoomType: {
      type: String,
      required: true,
      enum: ['LectureHall', 'ComputerLab', 'HardwareLab', 'SeminarHall'],
    },
    labBlockLength: { type: Number, default: 2 },
    color: { type: String },
  },
  { timestamps: true }
);

export const Subject: Model<ISubjectDocument> =
  mongoose.models.Subject || mongoose.model<ISubjectDocument>('Subject', SubjectSchema);
