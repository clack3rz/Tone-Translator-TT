// src/components/SoundEngineerDevPanel.tsx
// Secondary Development & QA panel for Sound Engineer Shadow execution observation

import React, { useState } from "react";
import {
  ShadowRunState,
  ShadowFaultMode,
} from "../sound-engineer";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  XCircle,
  Ban,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface SoundEngineerDevPanelProps {
  /** Whether Shadow Mode observation is active */
  shadowModeEnabled: boolean;
  /** Callback to toggle Shadow Mode */
  onToggleShadowMode: (enabled: boolean) => void;
  /** Current UAT fault injection mode */
  faultMode: ShadowFaultMode;
  /** Callback to change fault mode */
  onChangeFaultMode: (mode: ShadowFaultMode) => void;
  /** Active Shadow run state (ephemeral) */
  shadowState: ShadowRunState | null;
  /** Callback to cancel active Shadow run */
  onCancelShadow: () => void;
}

export const SoundEngineerDevPanel: React.FC<SoundEngineerDevPanelProps> = ({
  shadowModeEnabled,
  onToggleShadowMode,
  faultMode,
  onChangeFaultMode,
  shadowState,
  onCancelShadow,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            COMPLETED
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60 animate-pulse">
            <Activity className="w-3 h-3 text-amber-400 animate-spin" />
            RUNNING
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/80 text-rose-400 border border-rose-800/60">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            FAILED
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            <Ban className="w-3 h-3 text-zinc-400" />
            CANCELLED
          </span>
        );
      case "created":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
            <Clock className="w-3 h-3 text-zinc-400" />
            CREATED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono text-zinc-500 bg-zinc-900 border border-zinc-800">
            IDLE
          </span>
        );
    }
  };

  return (
    <div className="w-full mt-6 rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md overflow-hidden text-zinc-300 shadow-xl transition-all">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/60 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <FlaskConical className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-300">
            Sound Engineer Development
          </span>
          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/50">
            Phase 1A.4 QA
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Shadow Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Shadow Mode:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-zinc-900 border border-zinc-800">
              <button
                type="button"
                onClick={() => onToggleShadowMode(false)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  !shadowModeEnabled
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                OFF
              </button>
              <button
                type="button"
                onClick={() => onToggleShadowMode(true)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  shadowModeEnabled
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                ON
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Toggle panel"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 text-xs">
          {/* Authority Notice */}
          <div className="flex items-start justify-between p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60">
            <div>
              <div className="font-semibold text-zinc-200">
                CURRENT
              </div>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Production path remains completely authoritative for tone generation, preset translation, and AT5 export.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
              AUTHORITATIVE
            </span>
          </div>

          {/* Shadow Observation Section */}
          <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-200">SHADOW</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  OBSERVATION ONLY
                </span>
              </div>

              {shadowModeEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500">UAT Fault Mode:</span>
                  <div className="inline-flex rounded-lg p-0.5 bg-zinc-900 border border-zinc-800">
                    {(["normal", "fail", "timeout"] as ShadowFaultMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onChangeFaultMode(mode)}
                        className={`px-2 py-0.5 text-[10px] uppercase font-mono rounded transition-all ${
                          faultMode === mode
                            ? "bg-purple-900/80 text-purple-200 border border-purple-700/80"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {!shadowModeEnabled ? (
              <p className="text-zinc-500 italic text-[11px]">
                Shadow Mode is currently OFF. No shadow execution runs or snapshots are being generated.
              </p>
            ) : shadowState ? (
              <div className="space-y-2 pt-1 border-t border-zinc-800/50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-zinc-500 block">Status</span>
                    <div className="mt-1">{getStatusBadge(shadowState.status)}</div>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Run ID</span>
                    <span className="font-mono text-zinc-300 truncate block mt-1" title={shadowState.runId}>
                      {shadowState.runId}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Snapshot ID</span>
                    <span className="font-mono text-zinc-300 truncate block mt-1" title={shadowState.snapshotId}>
                      {shadowState.snapshotId}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Duration</span>
                    <span className="font-mono text-zinc-300 block mt-1">
                      {shadowState.result?.durationMs !== undefined
                        ? `${shadowState.result.durationMs}ms`
                        : "—"}
                    </span>
                  </div>
                </div>

                {/* Structured Error Display */}
                {shadowState.error && (
                  <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[11px] space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      {shadowState.error.name} ({shadowState.error.code || "SHADOW_ERROR"})
                    </div>
                    <div className="font-mono text-[10px] text-rose-200/90">
                      {shadowState.error.message}
                    </div>
                  </div>
                )}

                {/* Action Controls */}
                {shadowState.status === "running" && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={onCancelShadow}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-zinc-700 text-xs transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-400" />
                      Cancel Shadow Run
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-zinc-500 italic text-[11px]">
                Ready for observation. Trigger a tone generation to dispatch a parallel Shadow run.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
