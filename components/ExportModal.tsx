'use client';

import React from 'react';
import { X, Printer, FileSpreadsheet, Download, Check } from 'lucide-react';
import { TimetableState, ISection } from '@/lib/types';
import { slotsToBlocks } from '@/lib/engine';
import { toast } from 'sonner';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: TimetableState;
  activeSection: ISection;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  state,
  activeSection,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const blocks = slotsToBlocks(state.slots).filter((b) => b.sectionId === activeSection.id);
    const headers = [
      'Day',
      'StartPeriod',
      'DurationSlots',
      'CourseCode',
      'CourseName',
      'Section',
      'Batch',
      'RoomNo',
      'Faculty',
    ];

    const rows = blocks.map((b) => {
      const subject = state.subjects.find((s) => s.id === b.subjectId);
      const room = state.classrooms.find((c) => c.id === b.classroomId);
      const faculty = state.faculties.find((f) => b.facultyIds.includes(f.id));

      return [
        b.day,
        b.startSlotIndex,
        b.blockLength,
        subject?.code || '',
        `"${subject?.name || ''}"`,
        activeSection.name,
        b.batch || 'All',
        room?.roomNo || '',
        `"${faculty?.name || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ChronoSync_${activeSection.name}_Timetable.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${activeSection.name} schedule to CSV`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-obsidian-900 p-6 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-cyber-indigo" />
            <h3 className="font-bold text-white text-base">Export Schedule</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Export high-resolution institutional timetable for{' '}
          <span className="text-white font-semibold font-mono">{activeSection.name}</span>.
        </p>

        {/* Options */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handlePrint}
            className="w-full p-3.5 rounded-xl border border-white/10 bg-obsidian-850 hover:bg-obsidian-800 hover:border-cyber-indigo/50 transition-all flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyber-indigo/20 border border-cyber-indigo/30 flex items-center justify-center text-cyber-indigo">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">Print / Save as PDF</div>
                <div className="text-[11px] text-zinc-400">
                  Clean vector layout formatted for institutional printers
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full p-3.5 rounded-xl border border-white/10 bg-obsidian-850 hover:bg-obsidian-800 hover:border-cyber-emerald/50 transition-all flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyber-emerald/20 border border-cyber-emerald/30 flex items-center justify-center text-cyber-emerald">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white text-xs">Export to CSV / Excel</div>
                <div className="text-[11px] text-zinc-400">
                  Tabular data with period intervals and resource tags
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-obsidian-800 hover:bg-obsidian-750 text-zinc-300 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
