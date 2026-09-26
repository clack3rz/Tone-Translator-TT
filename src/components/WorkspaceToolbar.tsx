// src/components/WorkspaceToolbar.tsx
// Phase 1A.4a: Persistent Secondary Workspace & Development Toolbar
// Combines compact Sound Engineer Shadow controls (left) and Current workspace actions (right)

import React, { useState, useRef, useEffect } from "react";
import {
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  ChevronDown,
  X,
  RefreshCw,
  RotateCcw,
  Download,
  Info,
} from "lucide-react";
import {
  ShadowRunState,
  ShadowFaultMode,
} from "../sound-engineer";

export interface WorkspaceToolbarProps {
  // --- Shadow Development & QA Props ---
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
  /** Callback to reset terminal Shadow observation state back to READY */
  onResetShadow: () => void;

  // --- Current Workspace Action Props ---
  /** Whether a valid tone result exists */
  hasToneResult: boolean;
  /** Whether there is active session content (prompt, preset, or result) to clear */
  hasActiveContent: boolean;
  /** Whether the database is currently refreshing */
  isDbRefreshing: boolean;
  /** Callback to refresh analysis against updated database */
  onRefreshChain: () => void;
  /** Callback to clear current working session / start new chain */
  onClearSession: () => void;
  /** Callback to export AT5 preset */
  onExportPreset: () => void;
}

export type ShadowDisplayStatus =
  | "OFF"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export function computeShadowDisplayStatus(
  shadowModeEnabled: boolean,
  shadowState: ShadowRunState | null
): ShadowDisplayStatus {
  if (!shadowModeEnabled) {
    return "OFF";
  }
  if (!shadowState) {
    return "READY";
  }
  switch (shadowState.status) {
    case "running":
      return "RUNNING";
    case "completed":
      return "COMPLETED";
    case "failed":
      return "FAILED";
    case "cancelled":
      return "CANCELLED";
    case "created":
      return "READY";
    default:
      return "READY";
  }
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  shadowModeEnabled,
  onToggleShadowMode,
  faultMode,
  onChangeFaultMode,
  shadowState,
  onCancelShadow,
  onResetShadow,
  hasToneResult,
  hasActiveContent,
  isDbRefreshing,
  onRefreshChain,
  onClearSession,
  onExportPreset,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close details popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsDetailsOpen(false);
      }
    }
    if (isDetailsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDetailsOpen]);

  const displayStatus = computeShadowDisplayStatus(shadowModeEnabled, shadowState);
  const isTerminalState =
    displayStatus === "COMPLETED" ||
    displayStatus === "FAILED" ||
    displayStatus === "CANCELLED";
  const canReset = shadowModeEnabled && isTerminalState;

  // Status badge config with explicit text and design tokens
  const getStatusBadgeConfig = () => {
    switch (displayStatus) {
      case "OFF":
        return {
          label: "OFF",
          bullet: "○",
          className: "bg-zinc-900/80 text-zinc-500 border-zinc-800",
          dotColor: "text-zinc-500",
          icon: null,
        };
      case "READY":
        return {
          label: "READY",
          bullet: "●",
          className: "bg-sky-950/70 text-sky-400 border-sky-800/60",
          dotColor: "text-sky-400",
          icon: <Clock className="w-2.5 h-2.5 text-sky-400" />,
        };
      case "RUNNING":
        return {
          label: "RUNNING",
          bullet: "●",
          className: "bg-amber-950/80 text-amber-400 border-amber-800/80 animate-pulse",
          dotColor: "text-amber-400",
          icon: <Activity className="w-2.5 h-2.5 text-amber-400 animate-spin" />,
        };
      case "COMPLETED":
        return {
          label: "COMPLETED",
          bullet: "●",
          className: "bg-emerald-950/80 text-emerald-400 border-emerald-800/60",
          dotColor: "text-emerald-400",
          icon: <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />,
        };
      case "FAILED":
        return {
          label: "FAILED",
          bullet: "●",
          className: "bg-rose-950/80 text-rose-400 border-rose-800/60",
          dotColor: "text-rose-400",
          icon: <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />,
        };
      case "CANCELLED":
        return {
          label: "CANCELLED",
          bullet: "●",
          className: "bg-zinc-800/80 text-zinc-400 border-zinc-700",
          dotColor: "text-zinc-400",
          icon: <Ban className="w-2.5 h-2.5 text-zinc-400" />,
        };
    }
  };

  const statusConfig = getStatusBadgeConfig();
  const canExport = hasToneResult;
  const canRefresh = hasToneResult && !isDbRefreshing;
  const canClear = hasActiveContent;

  return (
    <div
      data-testid="workspace-toolbar"
      className="h-[42px] bg-black/90 border-b border-white/10 px-6 flex items-center justify-between shrink-0 z-30 backdrop-blur-md relative select-none"
    >
      {/* ─────────────────────────────────────────────────────────────────
          LEFT: Sound Engineer Development Status & Controls (Phase 1A.4)
         ───────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Compact Shadow Control Group */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1">
          {/* Flask Icon */}
          <FlaskConical
            className={`w-3.5 h-3.5 transition-colors ${
              shadowModeEnabled ? "text-purple-400" : "text-zinc-600"
            }`}
            aria-hidden="true"
          />

          {/* Label */}
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-300">
            SHADOW
          </span>

          {/* Mode Toggle Switch [ OFF | ON ] */}
          <button
            type="button"
            data-testid="shadow-mode-toggle"
            onClick={() => onToggleShadowMode(!shadowModeEnabled)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight transition-all border ${
              shadowModeEnabled
                ? "bg-purple-950/80 text-purple-300 border-purple-800/60 shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
            }`}
            title={shadowModeEnabled ? "Disable Shadow observation" : "Enable Shadow observation"}
          >
            <span>{shadowModeEnabled ? "ON" : "OFF"}</span>
          </button>

          {/* Textual Lifecycle Status Badge */}
          <button
            type="button"
            data-testid="shadow-status-badge"
            onClick={() => setIsDetailsOpen((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-tight border transition-all ${statusConfig.className} hover:border-white/30`}
            title="Click to view Shadow execution details"
          >
            <span className={statusConfig.dotColor}>{statusConfig.bullet}</span>
            <span>{statusConfig.label}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
          </button>

          {/* Quick Cancel button visible in toolbar while Shadow is RUNNING */}
          {displayStatus === "RUNNING" && (
            <button
              type="button"
              data-testid="shadow-quick-cancel-button"
              onClick={onCancelShadow}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold tracking-tight bg-rose-950/80 text-rose-300 border border-rose-800 hover:bg-rose-900 transition-all shadow-sm"
              title="Cancel running Shadow observation"
            >
              <Ban className="w-2.5 h-2.5 text-rose-400" />
              <span>Cancel</span>
            </button>
          )}

          {/* Quick Reset button visible in toolbar when Shadow is in a terminal state */}
          {canReset && (
            <button
              type="button"
              data-testid="shadow-quick-reset-button"
              onClick={onResetShadow}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold tracking-tight bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-all shadow-sm"
              title="Reset Shadow"
              aria-label="Reset Shadow"
            >
              <RotateCcw className="w-2.5 h-2.5 text-zinc-400" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Fault Mode Selector (Disabled when Shadow is OFF) */}
        <div
          data-testid="shadow-fault-mode-group"
          className={`flex items-center gap-1 bg-white/[0.02] border border-white/5 rounded-lg p-0.5 transition-opacity ${
            shadowModeEnabled ? "opacity-100" : "opacity-35 pointer-events-none"
          }`}
          title={shadowModeEnabled ? "Select UAT Fault Mode" : "Fault Mode disabled when Shadow is OFF"}
        >
          {(["normal", "fail", "timeout", "hold"] as ShadowFaultMode[]).map((mode) => {
            const isSelected = faultMode === mode;
            return (
              <button
                key={mode}
                type="button"
                data-testid={`shadow-fault-mode-${mode}`}
                disabled={!shadowModeEnabled}
                onClick={() => onChangeFaultMode(mode)}
                className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-semibold transition-all border ${
                  isSelected && shadowModeEnabled
                    ? "bg-zinc-800 text-white border-zinc-600 shadow-sm"
                    : "text-zinc-500 border-transparent hover:text-zinc-300"
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>

        {/* Subdued Phase Indicator */}
        <div
          data-testid="shadow-phase-indicator"
          className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded select-none"
        >
          PHASE 1A.4 QA
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          RIGHT: Current Workspace Actions (Authoritative, Icon-Only)
         ───────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* Refresh Analysis */}
        <button
          type="button"
          data-testid="toolbar-refresh-button"
          onClick={onRefreshChain}
          disabled={!canRefresh}
          className={`p-1.5 rounded-md border transition-all text-xs flex items-center justify-center ${
            canRefresh
              ? "border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 active:scale-95"
              : "border-transparent text-zinc-700 cursor-not-allowed opacity-30"
          }`}
          title="Refresh analysis"
          aria-label="Refresh analysis"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isDbRefreshing ? "animate-spin text-gear-accent" : ""}`}
          />
        </button>

        {/* Clear Signal Chain / New Chain */}
        <button
          type="button"
          data-testid="toolbar-clear-button"
          onClick={onClearSession}
          disabled={!canClear}
          className={`p-1.5 rounded-md border transition-all text-xs flex items-center justify-center ${
            canClear
              ? "border-white/10 text-zinc-300 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 active:scale-95"
              : "border-transparent text-zinc-700 cursor-not-allowed opacity-30"
          }`}
          title="Clear signal chain"
          aria-label="Clear signal chain"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-white/10 mx-1" />

        {/* Export AT5 Preset */}
        <button
          type="button"
          data-testid="toolbar-export-button"
          onClick={onExportPreset}
          disabled={!canExport}
          className={`p-1.5 px-2.5 rounded-md border transition-all text-xs flex items-center gap-1.5 font-mono font-bold uppercase tracking-wider ${
            canExport
              ? "border-gear-accent/40 bg-gear-accent/10 text-gear-accent hover:bg-gear-accent hover:text-black shadow-[0_0_10px_rgba(245,158,11,0.2)] active:scale-95"
              : "border-transparent text-zinc-700 cursor-not-allowed opacity-30"
          }`}
          title="Export AT5 preset"
          aria-label="Export AT5 preset"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="text-[9px] font-sans">.AT5P</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          DETAILED SHADOW POPOVER / DROPDOWN
         ───────────────────────────────────────────────────────────────── */}
      {isDetailsOpen && (
        <div
          ref={popoverRef}
          data-testid="shadow-details-popover"
          className="absolute top-[46px] left-6 z-50 w-96 rounded-xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-4 text-zinc-300 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                Sound Engineer Shadow
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsDetailsOpen(false)}
              className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10"
              title="Close details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Details Content */}
          <div className="space-y-2.5 text-[11px] font-mono">
            {/* Stream */}
            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span className="text-zinc-500">Stream:</span>
              <span className="text-purple-400 font-bold">SHADOW (Observation)</span>
            </div>

            {/* Lifecycle Status */}
            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span className="text-zinc-500">Status:</span>
              <span className="flex items-center gap-1 font-bold">
                {statusConfig.icon}
                <span>{displayStatus}</span>
              </span>
            </div>

            {/* Run ID */}
            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span className="text-zinc-500">Run ID:</span>
              <span className="text-zinc-300 text-[10px] truncate max-w-[200px]" title={shadowState?.runId || "None"}>
                {shadowState?.runId || "None"}
              </span>
            </div>

            {/* Snapshot ID */}
            <div className="flex items-center justify-between py-1 border-b border-white/5">
              <span className="text-zinc-500">Snapshot ID:</span>
              <span className="text-zinc-300 text-[10px] truncate max-w-[200px]" title={shadowState?.snapshotId || "None"}>
                {shadowState?.snapshotId || "None"}
              </span>
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-2 py-1 border-b border-white/5 text-[10px]">
              <div>
                <span className="text-zinc-500 block">Started:</span>
                <span className="text-zinc-300">
                  {shadowState?.startedAt ? new Date(shadowState.startedAt).toLocaleTimeString() : "—"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Duration:</span>
                <span className="text-zinc-300">
                  {shadowState?.startedAt && shadowState?.completedAt
                    ? `${Math.max(0, new Date(shadowState.completedAt).getTime() - new Date(shadowState.startedAt).getTime())}ms`
                    : "—"}
                </span>
              </div>
            </div>

            {/* Structured Error (if failed) */}
            {shadowState?.error && (
              <div className="p-2.5 rounded bg-rose-950/50 border border-rose-900/60 text-rose-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[10px]">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>{shadowState.error.code}</span>
                </div>
                <div className="text-[10px] text-rose-200/80 leading-snug">
                  {shadowState.error.message}
                </div>
              </div>
            )}

            {/* Cancel Button (if running) */}
            {shadowState?.status === "running" && (
              <div className="pt-2">
                <button
                  type="button"
                  data-testid="shadow-cancel-button"
                  onClick={() => {
                    onCancelShadow();
                    setIsDetailsOpen(false);
                  }}
                  className="w-full py-1.5 rounded bg-rose-900/80 hover:bg-rose-800 text-white font-mono text-[10px] uppercase font-bold tracking-wider transition-colors flex items-center justify-center gap-1.5 border border-rose-700 shadow-sm"
                >
                  <Ban className="w-3 h-3" />
                  Cancel Shadow Run
                </button>
              </div>
            )}

            {/* Reset Button (if terminal) */}
            {canReset && (
              <div className="pt-2">
                <button
                  type="button"
                  data-testid="shadow-popover-reset-button"
                  onClick={() => {
                    onResetShadow();
                    setIsDetailsOpen(false);
                  }}
                  className="w-full py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-[10px] uppercase font-bold tracking-wider transition-colors flex items-center justify-center gap-1.5 border border-zinc-700 shadow-sm hover:text-white"
                  title="Reset Shadow"
                  aria-label="Reset Shadow"
                >
                  <RotateCcw className="w-3 h-3 text-zinc-400" />
                  Reset Shadow
                </button>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="mt-3 pt-2 border-t border-zinc-800/80 text-[9px] text-zinc-500 flex items-center gap-1.5 font-sans">
            <Info className="w-3 h-3 text-zinc-500 shrink-0" />
            <span>CURRENT production tone generation remains 100% authoritative.</span>
          </div>
        </div>
      )}
    </div>
  );
};
