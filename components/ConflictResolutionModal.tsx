'use client';

import React from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { ISolverProposal, ISolverResult } from '@/lib/types';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  solverResult: ISolverResult | null;
  isLoading: boolean;
  onApplyProposal: (proposal: ISolverProposal) => void;
  conflictCount: number;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  solverResult,
  isLoading,
  onApplyProposal,
  conflictCount,
}) => {
  if (!isOpen) return null;

  const proposals = solverResult?.proposals || [];
  const status = solverResult?.status || (conflictCount === 0 ? 'SOLVED' : 'PARTIAL');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-obsidian-900 p-6 shadow-cyber-card flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyber-rose/20 border border-cyber-rose/40 text-cyber-rose shadow-glow-rose">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  CSP Conflict-Resolution Engine
                </h2>
                {solverResult && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-bold ${
                      status === 'SOLVED'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : status === 'PARTIAL'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : status === 'LIMIT_REACHED'
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {status}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Min-Conflicts local search heuristic with soft-penalty scoring & atomic diff preview
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-cyber-rose border-t-transparent animate-spin" />
              <p className="text-xs font-mono text-zinc-400">
                Evaluating candidate coordinates across institutional constraints...
              </p>
            </div>
          ) : conflictCount === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-cyber-emerald/20 border border-cyber-emerald/40 flex items-center justify-center text-cyber-emerald shadow-glow-emerald">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">No Active Conflicts</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                All scheduled lectures, practical labs, professors, and classrooms satisfy all 4-way collision invariants.
              </p>
            </div>
          ) : status === 'INFEASIBLE' ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">Infeasible Relocation Under Active Constraints</h3>
              <p className="text-xs text-rose-200/80 max-w-md bg-rose-950/40 p-3 rounded-lg border border-rose-500/30 font-mono text-left">
                <strong>Binding Constraint:</strong> {solverResult?.bindingConstraint || 'No conflict-free coordinates exist.'}
              </p>
              <p className="text-xs text-zinc-400 max-w-sm">
                {solverResult?.diagnostic || 'Unpin locked slots or expand room availability to unlock feasible permutations.'}
              </p>
            </div>
          ) : status === 'LIMIT_REACHED' ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">Search Budget Limit Reached</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                {solverResult?.diagnostic || 'Search timed out before exhaustive verification could complete.'}
              </p>
            </div>
          ) : (
            proposals.map((proposal, idx) => (
              <div
                key={proposal.id}
                className="p-4 rounded-xl border border-white/10 bg-obsidian-850 hover:border-cyber-indigo/50 transition-all flex flex-col gap-3 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyber-indigo/20 text-cyber-indigo border border-cyber-indigo/30 font-bold">
                      Proposal #{idx + 1}
                    </span>
                    <span className="text-xs text-zinc-300 font-medium font-mono">
                      Quality Score: {proposal.score}/100
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-cyber-emerald">
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {proposal.remainingConflicts === 0
                        ? '0 Collisions Remaining'
                        : `${proposal.remainingConflicts} Remaining`}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {proposal.summary}
                </p>

                {/* Move Diffs */}
                <div className="space-y-2 pt-2 border-t border-white/5 font-mono text-xs">
                  {proposal.moves.map((move, mIdx) => (
                    <div
                      key={mIdx}
                      className="p-2.5 rounded-lg bg-obsidian-900 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{move.subjectCode}</span>
                        <span className="text-zinc-500">:</span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {move.fromDay} Slot {move.fromSlot}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {move.toDay} Slot {move.toSlot}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Apply Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => onApplyProposal(proposal)}
                    className="px-4 py-2 rounded-lg bg-cyber-indigo hover:bg-indigo-600 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-glow-indigo"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept & Apply Solution</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500 font-mono">
          <div className="flex items-center gap-3">
            <span>Pinned blocks are strictly preserved</span>
            {solverResult?.searchDurationMs !== undefined && (
              <span className="text-zinc-600">({solverResult.searchDurationMs}ms search)</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
