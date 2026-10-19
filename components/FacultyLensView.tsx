'use client';

import React, { useState } from 'react';
import { User, AlertTriangle, Clock, CheckCircle2, Award } from 'lucide-react';
import { TimetableState, IFaculty, Violation } from '@/lib/types';
import { slotsToBlocks } from '@/lib/engine';

interface FacultyLensViewProps {
  state: TimetableState;
  conflicts: Violation[];
}

export const FacultyLensView: React.FC<FacultyLensViewProps> = ({ state, conflicts }) => {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(
    state.faculties[0]?.id || ''
  );

  const selectedFaculty = state.faculties.find((f) => f.id === selectedFacultyId);
  const blocks = slotsToBlocks(state.slots);

  // Filter slots where this faculty is assigned
  const facultySlots = state.slots.filter((s) => s.facultyIds.includes(selectedFacultyId));
  const facultyBlocks = blocks.filter((b) => b.facultyIds.includes(selectedFacultyId));

  const totalAssignedHours = facultySlots.length;
  const maxHours = selectedFaculty?.maxWeeklyHours || 16;
  const loadPct = Math.min(100, Math.round((totalAssignedHours / maxHours) * 100));

  // Faculty conflicts
  const facultyConflicts = conflicts.filter((c) => c.entityId === selectedFacultyId);

  return (
    <div className="flex-1 overflow-auto p-4 bg-obsidian-950 flex flex-col">
      {/* Control Strip & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-obsidian-900/60 backdrop-blur-md mb-4 shadow-lg">
        {/* Selector */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyber-indigo/20 border border-cyber-indigo/40 flex items-center justify-center text-cyber-indigo">
            <User className="w-5 h-5" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-zinc-400 block">
              Active Instructor Lens
            </label>
            <select
              value={selectedFacultyId}
              onChange={(e) => setSelectedFacultyId(e.target.value)}
              className="bg-obsidian-850 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-cyber-indigo"
            >
              {state.faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.designation}, {f.department})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Load Meter */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-zinc-400 block">
              Weekly Teaching Load
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-white">
                {totalAssignedHours} / {maxHours} hrs
              </span>
              <span className="text-xs font-mono text-zinc-400">({loadPct}%)</span>
            </div>
            <div className="w-48 bg-obsidian-950 rounded-full h-2 mt-1 border border-white/5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  loadPct > 90 ? 'bg-amber-400' : 'bg-cyber-emerald'
                }`}
                style={{ width: `${loadPct}%` }}
              />
            </div>
          </div>

          {facultyConflicts.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyber-rose/20 border border-cyber-rose/40 text-cyber-rose text-xs font-mono shadow-glow-rose">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span>{facultyConflicts.length} Collision Alert</span>
            </div>
          )}
        </div>
      </div>

      {/* Faculty Schedule Grid */}
      <div className="w-full border border-white/10 rounded-xl overflow-hidden bg-obsidian-900/60 backdrop-blur-md shadow-2xl">
        <div className="grid grid-cols-[100px_repeat(9,minmax(110px,1fr))] border-b border-white/10 bg-obsidian-850 text-xs font-mono">
          <div className="p-3 font-semibold text-zinc-400 uppercase tracking-wider border-r border-white/10 text-center">
            Day
          </div>
          {state.timeConfig.slots.map((slot) => (
            <div
              key={slot.index}
              className="p-2 text-center border-r border-white/10 last:border-r-0 flex flex-col justify-center"
            >
              <span className="font-semibold text-zinc-300">
                {slot.isBreak ? slot.breakLabel : `Period ${slot.index}`}
              </span>
              <span className="text-[10px] text-zinc-400">
                {slot.start} - {slot.end}
              </span>
            </div>
          ))}
        </div>

        <div className="divide-y divide-white/10">
          {state.timeConfig.days.map((day) => {
            const daySlots = facultySlots.filter((s) => s.day === day);

            return (
              <div
                key={day}
                className="grid grid-cols-[100px_repeat(9,minmax(110px,1fr))] min-h-[75px]"
              >
                <div className="p-3 border-r border-white/10 bg-obsidian-850/40 flex items-center justify-center font-mono font-bold text-zinc-300 text-xs uppercase">
                  {day.substring(0, 3)}
                </div>

                {state.timeConfig.slots.map((slot) => {
                  if (slot.isBreak) {
                    return (
                      <div
                        key={`${day}-${slot.index}`}
                        className="border-r border-white/10 bg-obsidian-950/60 flex items-center justify-center text-[10px] text-zinc-600 font-mono"
                      >
                        •
                      </div>
                    );
                  }

                  // Check if faculty has class at this slot
                  const bookedSlots = daySlots.filter((s) => s.slotIndex === slot.index);
                  const isDoubleBooked = bookedSlots.length > 1;

                  // Check if faculty marked this as unavailable
                  const isUnavailable = selectedFaculty?.unavailable?.some(
                    (u) => u.day === day && u.slotIndex === slot.index
                  );

                  return (
                    <div
                      key={`${day}-${slot.index}`}
                      className={`p-2 border-r border-white/10 last:border-r-0 flex flex-col justify-center ${
                        isDoubleBooked
                          ? 'bg-rose-950/40 border-rose-500 text-rose-100 animate-pulse'
                          : bookedSlots.length > 0
                          ? 'bg-cyber-indigo/15 text-white'
                          : isUnavailable
                          ? 'bg-obsidian-950/80 text-zinc-600'
                          : 'bg-obsidian-900/10'
                      }`}
                    >
                      {bookedSlots.length > 0 ? (
                        bookedSlots.map((bSlot) => {
                          const subject = state.subjects.find((s) => s.id === bSlot.subjectId);
                          const section = state.sections.find((sec) => sec.id === bSlot.sectionId);
                          const room = state.classrooms.find((c) => c.id === bSlot.classroomId);

                          return (
                            <div key={bSlot.id} className="text-left font-mono">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span>{subject?.code}</span>
                                <span className="text-[9px] px-1 rounded bg-white/10">
                                  {section?.name}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate">
                                {room?.roomNo}
                              </div>
                              {isDoubleBooked && (
                                <div className="text-[9px] text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>Clash!</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : isUnavailable ? (
                        <span className="text-[10px] font-mono text-zinc-600 text-center">
                          Blocked
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-600 text-center">
                          Free
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
