import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISectionDocument extends Document {
  academicYear: string;
  semester: number;
  name: string;
  strength: number;
  batches: { name: string; strength: number }[];
}

const SectionSchema = new Schema<ISectionDocument>(
  {
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    name: { type: String, required: true },
    strength: { type: Number, required: true, default: 60 },
    batches: [
      {
        name: { type: String, required: true },
        strength: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

SectionSchema.index({ academicYear: 1, semester: 1, name: 1 }, { unique: true });

export const Section: Model<ISectionDocument> =
  mongoose.models.Section || mongoose.model<ISectionDocument>('Section', SectionSchema);
