'use client';

import React, { useState } from 'react';
import { MapPin, AlertTriangle, Users, Box, CheckCircle2 } from 'lucide-react';
import { TimetableState, IClassroom, Violation } from '@/lib/types';

interface RoomLensViewProps {
  state: TimetableState;
  conflicts: Violation[];
}

export const RoomLensView: React.FC<RoomLensViewProps> = ({ state, conflicts }) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    state.classrooms[0]?.id || ''
  );

  const selectedRoom = state.classrooms.find((c) => c.id === selectedRoomId);

  // Slots utilizing this room
  const roomSlots = state.slots.filter((s) => s.classroomId === selectedRoomId);
  const totalOccupiedHours = roomSlots.length;

  // Maximum possible non-break slots in a week
  const nonBreakSlotsPerDay = state.timeConfig.slots.filter((s) => !s.isBreak).length;
  const totalPossibleSlots = nonBreakSlotsPerDay * state.timeConfig.days.length;
  const utilizationPct = Math.min(100, Math.round((totalOccupiedHours / totalPossibleSlots) * 100));

  const roomConflicts = conflicts.filter((c) => c.entityId === selectedRoomId);

  return (
    <div className="flex-1 overflow-auto p-4 bg-obsidian-950 flex flex-col">
      {/* Control Strip & Room Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-obsidian-900/60 backdrop-blur-md mb-4 shadow-lg">
        {/* Selector */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyber-emerald/20 border border-cyber-emerald/40 flex items-center justify-center text-cyber-emerald">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <label className="text-[10px] uppercase font-mono text-zinc-400 block">
              Classroom / Lab Venue Lens
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="bg-obsidian-850 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:border-cyber-emerald"
            >
              {state.classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.roomNo} ({c.type}, Cap: {c.capacity}, {c.building})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Room Metrics */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-zinc-400 block">
              Venue Occupancy Rate
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold text-white">
                {totalOccupiedHours} / {totalPossibleSlots} hrs
              </span>
              <span className="text-xs font-mono text-zinc-400">({utilizationPct}%)</span>
            </div>
            <div className="w-48 bg-obsidian-950 rounded-full h-2 mt-1 border border-white/5 overflow-hidden">
              <div
                className="h-full bg-cyber-emerald transition-all duration-500"
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-obsidian-850 border border-white/10 text-xs font-mono">
            <Users className="w-4 h-4 text-zinc-400" />
            <span>Cap: {selectedRoom?.capacity}</span>
          </div>

          {roomConflicts.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyber-rose/20 border border-cyber-rose/40 text-cyber-rose text-xs font-mono shadow-glow-rose">
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span>{roomConflicts.length} Collision</span>
            </div>
          )}
        </div>
      </div>

      {/* Room Schedule Grid */}
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
            const daySlots = roomSlots.filter((s) => s.day === day);

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

                  const booked = daySlots.filter((s) => s.slotIndex === slot.index);
                  const isConflict = booked.length > 1;

                  return (
                    <div
                      key={`${day}-${slot.index}`}
                      className={`p-2 border-r border-white/10 last:border-r-0 flex flex-col justify-center ${
                        isConflict
                          ? 'bg-rose-950/40 border-rose-500 text-rose-100 animate-pulse'
                          : booked.length > 0
                          ? 'bg-cyber-emerald/15 text-white'
                          : 'bg-obsidian-900/10'
                      }`}
                    >
                      {booked.length > 0 ? (
                        booked.map((bSlot) => {
                          const subject = state.subjects.find((s) => s.id === bSlot.subjectId);
                          const section = state.sections.find((sec) => sec.id === bSlot.sectionId);
                          const faculty = state.faculties.find((f) => bSlot.facultyIds.includes(f.id));

                          return (
                            <div key={bSlot.id} className="text-left font-mono">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span>{subject?.code}</span>
                                <span className="text-[9px] px-1 rounded bg-white/10">
                                  {section?.name}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-400 truncate">
                                {faculty?.name}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-600 text-center">
                          Available
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
