import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClassroomDocument extends Document {
  roomNo: string;
  building: string;
  capacity: number;
  type: string;
}

const ClassroomSchema = new Schema<IClassroomDocument>(
  {
    roomNo: { type: String, required: true, unique: true },
    building: { type: String, required: true },
    capacity: { type: Number, required: true },
    type: {
      type: String,
      required: true,
      enum: ['LectureHall', 'ComputerLab', 'HardwareLab', 'SeminarHall'],
    },
  },
  { timestamps: true }
);

export const Classroom: Model<IClassroomDocument> =
  mongoose.models.Classroom || mongoose.model<IClassroomDocument>('Classroom', ClassroomSchema);
