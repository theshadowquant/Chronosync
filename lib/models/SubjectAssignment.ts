import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubjectAssignmentDocument extends Document {
  academicYear: string;
  sectionId: string;
  subjectId: string;
  facultyIds: string[];
  weeklySessionsRequired: number;
}

const SubjectAssignmentSchema = new Schema<ISubjectAssignmentDocument>(
  {
    academicYear: { type: String, required: true, index: true },
    sectionId: { type: String, required: true, index: true },
    subjectId: { type: String, required: true, index: true },
    facultyIds: [{ type: String, required: true }],
    weeklySessionsRequired: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

SubjectAssignmentSchema.index({ academicYear: 1, sectionId: 1, subjectId: 1 }, { unique: true });

export const SubjectAssignment: Model<ISubjectAssignmentDocument> =
  mongoose.models.SubjectAssignment ||
  mongoose.model<ISubjectAssignmentDocument>('SubjectAssignment', SubjectAssignmentSchema);
