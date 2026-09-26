// src/components/RunTraceInspector.tsx
// Dedicated Run Trace Inspector for Sound Engineer Shadow Observability

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Ban,
  Activity,
  ArrowRight,
  Layers,
  FileText,
  Info,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { RunTrace, TraceCheckpointEntry } from "../sound-engineer/trace/runTrace";
import { CheckpointStatus } from "../sound-engineer/checkpoints/checkpointStatus";

interface RunTraceInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  trace: RunTrace | null;
}

export const RunTraceInspector: React.FC<RunTraceInspectorProps> = ({
  isOpen,
  onClose,
  trace,
}) => {
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"pipeline" | "lineage">("pipeline");

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset selected checkpoint when trace changes
  useEffect(() => {
    if (trace && trace.checkpoints.length > 0) {
      // Default select the failed checkpoint if one exists, otherwise index 0
      const failedEntry = trace.checkpoints.find(
        (c) => c.checkpoint.status === "failed" || c.checkpoint.status === "cancelled"
      );
      setSelectedSequenceIndex(failedEntry ? failedEntry.sequenceIndex : 0);
    }
  }, [trace?.traceId]);

  if (!isOpen || !trace) return null;

  const selectedEntry: TraceCheckpointEntry | undefined = trace.checkpoints.find(
    (c) => c.sequenceIndex === selectedSequenceIndex
  ) || trace.checkpoints[0];

  const getStatusBadge = (status: CheckpointStatus | string) => {
    switch (status) {
      case "COMPLETED":
      case "completed":
        return {
          icon: <CheckCircle className="w-3 h-3 text-emerald-400" />,
          text: "COMPLETED",
          classes: "bg-emerald-950/60 text-emerald-300 border-emerald-800/80",
        };
      case "WARNING":
      case "warning":
        return {
          icon: <AlertTriangle className="w-3 h-3 text-amber-400" />,
          text: "WARNING",
          classes: "bg-amber-950/60 text-amber-300 border-amber-800/80",
        };
      case "FAILED":
      case "failed":
        return {
          icon: <XCircle className="w-3 h-3 text-rose-400" />,
          text: "FAILED",
          classes: "bg-rose-950/60 text-rose-300 border-rose-800/80",
        };
      case "CANCELLED":
      case "cancelled":
        return {
          icon: <Ban className="w-3 h-3 text-zinc-400" />,
          text: "CANCELLED",
          classes: "bg-zinc-800 text-zinc-300 border-zinc-700",
        };
      case "SKIPPED":
      case "skipped":
        return {
          icon: <ArrowRight className="w-3 h-3 text-zinc-500" />,
          text: "SKIPPED",
          classes: "bg-zinc-900/60 text-zinc-400 border-zinc-800",
        };
      case "RUNNING":
      case "running":
        return {
          icon: <Activity className="w-3 h-3 text-amber-400 animate-pulse" />,
          text: "RUNNING",
          classes: "bg-amber-950/70 text-amber-300 border-amber-700 animate-pulse",
        };
      case "PENDING":
      case "pending":
      default:
        return {
          icon: <Clock className="w-3 h-3 text-zinc-500" />,
          text: "PENDING",
          classes: "bg-zinc-900/40 text-zinc-500 border-zinc-800/60",
        };
    }
  };

  const overallBadge = getStatusBadge(trace.status);

  return (
    <div
      data-testid="run-trace-inspector-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-5xl h-[88vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200 font-sans">
        
        {/* ─────────────────────────────────────────────────────────────
            HEADER
           ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/60 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-tight">
                  SHADOW RUN TRACE
                </h2>
                {/* Truthful QA Indicator */}
                <span
                  data-testid="synthetic-qa-trace-badge"
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-950/80 border border-purple-800 text-purple-300"
                >
                  Synthetic QA Trace
                </span>
                {/* Overall Status Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${overallBadge.classes}`}
                >
                  {overallBadge.icon}
                  <span>{overallBadge.text}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-zinc-400">
                <span>
                  Trace ID: <span className="text-zinc-300">{trace.traceId}</span>
                </span>
                <span>•</span>
                <span>
                  Run ID: <span className="text-zinc-300">{trace.runId}</span>
                </span>
                <span>•</span>
                <span>
                  Stream: <span className="text-purple-400 font-bold">{trace.stream}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-trace-inspector-button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            title="Close inspector (Esc)"
            aria-label="Close inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            METRICS & TIMING BAR
           ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/30 text-[11px] font-mono">
          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
              Checkpoints
            </span>
            <div className="text-white font-bold text-sm mt-0.5">
              {trace.checkpointCount} <span className="text-xs text-zinc-400 font-normal">layers recorded</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
              Diagnostics
            </span>
            <div className="flex items-center gap-2 mt-0.5 text-xs font-bold">
              <span className="text-rose-400">{trace.diagnostics.errorCount} Errors</span>
              <span className="text-zinc-600">/</span>
              <span className="text-amber-400">{trace.diagnostics.warningCount} Warn</span>
              <span className="text-zinc-600">/</span>
              <span className="text-cyan-400">{trace.diagnostics.infoCount} Info</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
              Wall-Clock Duration
            </span>
            <div className="text-white font-bold text-sm mt-0.5">
              {trace.timing.wallClockDurationMs !== undefined
                ? `${trace.timing.wallClockDurationMs}ms`
                : "—"}
            </div>
            <span className="text-[9px] text-zinc-500">Total elapsed time</span>
          </div>

          <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">
              Summed Layer Duration
            </span>
            <div className="text-white font-bold text-sm mt-0.5">
              {trace.timing.summedLayerDurationMs}ms
            </div>
            <span className="text-[9px] text-zinc-500">Arithmetic layer sum</span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            VIEW TABS
           ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-800/60 bg-zinc-950">
          <button
            type="button"
            data-testid="tab-pipeline"
            onClick={() => setActiveTab("pipeline")}
            className={`pb-2.5 px-3 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "pipeline"
                ? "border-purple-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pipeline Checkpoints ({trace.checkpoints.length})</span>
          </button>

          <button
            type="button"
            data-testid="tab-lineage"
            onClick={() => setActiveTab("lineage")}
            className={`pb-2.5 px-3 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "lineage"
                ? "border-purple-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Artifact Lineage</span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            BODY / CONTENT
           ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {activeTab === "pipeline" ? (
            <>
              {/* Left Column: Checkpoints List */}
              <div className="w-full md:w-80 border-r border-zinc-800/80 overflow-y-auto bg-zinc-900/20 p-3 space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold px-2 py-1">
                  Execution Sequence
                </div>
                {trace.checkpoints.map((entry) => {
                  const badge = getStatusBadge(entry.checkpoint.status);
                  const isSelected = entry.sequenceIndex === selectedSequenceIndex;
                  return (
                    <button
                      key={entry.checkpoint.checkpointId}
                      type="button"
                      data-testid={`checkpoint-item-${entry.checkpoint.layer.toLowerCase()}`}
                      onClick={() => setSelectedSequenceIndex(entry.sequenceIndex)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 font-mono ${
                        isSelected
                          ? "bg-purple-950/40 border-purple-600 text-white shadow-lg"
                          : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-500 font-bold">
                            [{entry.sequenceIndex}]
                          </span>
                          <span className="text-xs font-bold text-white tracking-tight">
                            {entry.checkpoint.layer}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${badge.classes}`}
                        >
                          {badge.icon}
                          <span>{badge.text}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
                        <span>
                          {entry.checkpoint.durationMs !== undefined
                            ? `${entry.checkpoint.durationMs}ms`
                            : "—"}
                        </span>
                        {entry.checkpoint.diagnostics.length > 0 && (
                          <span className="text-amber-400 font-bold">
                            {entry.checkpoint.diagnostics.length} diag
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Checkpoint Detail Pane */}
              <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 space-y-6">
                {selectedEntry ? (
                  <>
                    {/* Selected Checkpoint Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-500 font-bold">
                            STAGE [{selectedEntry.sequenceIndex}]
                          </span>
                          <h3 className="text-lg font-bold text-white tracking-tight">
                            {selectedEntry.checkpoint.layer}
                          </h3>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                          Checkpoint ID:{" "}
                          <span className="text-zinc-200 select-all">
                            {selectedEntry.checkpoint.checkpointId}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(() => {
                          const b = getStatusBadge(selectedEntry.checkpoint.status);
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider border ${b.classes}`}
                            >
                              {b.icon}
                              <span>{b.text}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Timings Card */}
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2 text-[11px] font-mono">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
                        Stage Timings
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Created:</span>
                          <span className="text-zinc-300">
                            {new Date(selectedEntry.checkpoint.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Started:</span>
                          <span className="text-zinc-300">
                            {selectedEntry.checkpoint.startedAt
                              ? new Date(selectedEntry.checkpoint.startedAt).toLocaleTimeString()
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Completed:</span>
                          <span className="text-zinc-300">
                            {selectedEntry.checkpoint.completedAt
                              ? new Date(selectedEntry.checkpoint.completedAt).toLocaleTimeString()
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Duration:</span>
                          <span className="text-purple-300 font-bold">
                            {selectedEntry.checkpoint.durationMs !== undefined
                              ? `${selectedEntry.checkpoint.durationMs}ms`
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inputs & Output Lineage */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Consumed Inputs */}
                      <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5 font-mono">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
                          Consumed Inputs ({selectedEntry.checkpoint.inputs.length})
                        </span>
                        {selectedEntry.checkpoint.inputs.length === 0 ? (
                          <span className="text-zinc-500 text-xs italic">
                            None (Root Ingestion Stage)
                          </span>
                        ) : (
                          <div className="space-y-2">
                            {selectedEntry.checkpoint.inputs.map((ref) => (
                              <div
                                key={ref.artifactId}
                                className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between text-purple-400 font-bold">
                                  <span>{ref.artifactType}</span>
                                  <span className="text-[10px] text-zinc-500">v{ref.contractVersion}</span>
                                </div>
                                <div className="text-[10px] text-zinc-400 truncate select-all" title={ref.artifactId}>
                                  ID: {ref.artifactId}
                                </div>
                                {ref.producingLayer && (
                                  <div className="text-[9px] text-zinc-500">
                                    From Layer: {ref.producingLayer}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Produced Output */}
                      <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5 font-mono">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
                          Produced Output
                        </span>
                        {selectedEntry.checkpoint.output ? (
                          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] space-y-1">
                            <div className="flex items-center justify-between text-emerald-400 font-bold">
                              <span>{selectedEntry.checkpoint.output.artifactType}</span>
                              <span className="text-[10px] text-zinc-500">
                                v{selectedEntry.checkpoint.output.contractVersion}
                              </span>
                            </div>
                            <div
                              className="text-[10px] text-zinc-400 truncate select-all"
                              title={selectedEntry.checkpoint.output.artifactId}
                            >
                              ID: {selectedEntry.checkpoint.output.artifactId}
                            </div>
                            {selectedEntry.checkpoint.output.producingLayer && (
                              <div className="text-[9px] text-zinc-500">
                                Producing Layer: {selectedEntry.checkpoint.output.producingLayer}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-xs italic">
                            None produced
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Artifact Payload View (if present) */}
                    {selectedEntry.checkpoint.payload !== undefined && (
                      <div
                        data-testid="selected-checkpoint-payload"
                        className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-2.5 font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
                            Artifact Payload Content (Synthetic QA)
                          </span>
                          <span className="text-[9px] text-purple-400 font-sans">
                            Read-Only Contract Representation
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 overflow-x-auto text-[10px] text-zinc-300 font-mono max-h-56 leading-relaxed">
                          <pre>{JSON.stringify(selectedEntry.checkpoint.payload, null, 2)}</pre>
                        </div>
                      </div>
                    )}

                    {/* Diagnostics Section */}
                    <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-3 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
                          Diagnostics ({selectedEntry.checkpoint.diagnostics.length})
                        </span>
                      </div>

                      {selectedEntry.checkpoint.diagnostics.length === 0 ? (
                        <div className="text-xs text-zinc-500 italic py-2">
                          No diagnostics recorded for this checkpoint.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedEntry.checkpoint.diagnostics.map((diag, idx) => {
                            const isError = diag.severity === "ERROR";
                            const isWarn = diag.severity === "WARNING";
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                                  isError
                                    ? "bg-rose-950/40 border-rose-900/80 text-rose-200"
                                    : isWarn
                                    ? "bg-amber-950/40 border-amber-900/80 text-amber-200"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-300"
                                }`}
                              >
                                <div className="flex items-center justify-between font-bold text-[10px]">
                                  <div className="flex items-center gap-1.5">
                                    {isError ? (
                                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                    ) : isWarn ? (
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                    ) : (
                                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                                    )}
                                    <span>{diag.severity}</span>
                                    <span>•</span>
                                    <span>{diag.code}</span>
                                  </div>
                                  <span className="text-zinc-500 font-normal">
                                    {new Date(diag.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>

                                <div className="text-xs leading-relaxed font-sans font-medium text-zinc-200">
                                  {diag.message}
                                </div>

                                <div className="text-[10px] text-zinc-500">
                                  Source: <span className="text-zinc-400">{diag.source}</span>
                                </div>

                                {diag.context && (
                                  <div className="p-2 rounded bg-black/40 text-[10px] text-zinc-400 overflow-x-auto">
                                    Context: {JSON.stringify(diag.context)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-zinc-500 text-center py-12">
                    No checkpoint selected.
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Lineage Flow Tab */
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-950">
              <div className="max-w-2xl mx-auto space-y-4 font-mono">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 pb-2 border-b border-zinc-800">
                  End-to-End Artifact Lineage
                </div>

                <div className="space-y-3">
                  {trace.lineage.map((item, idx) => (
                    <div
                      key={item.checkpointId}
                      className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          [{item.sequenceIndex}] {item.layer}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Checkpoint: {item.checkpointId}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-zinc-500">Consumed:</span>
                        {item.inputs.length === 0 ? (
                          <span className="italic text-zinc-600">None</span>
                        ) : (
                          item.inputs.map((inp) => (
                            <span
                              key={inp.artifactId}
                              className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-purple-400 font-bold"
                            >
                              {inp.artifactType}
                            </span>
                          ))
                        )}

                        <span className="text-zinc-500 ml-2">Produced:</span>
                        {item.output ? (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-emerald-400 font-bold">
                            {item.output.artifactType}
                          </span>
                        ) : (
                          <span className="italic text-zinc-600">None</span>
                        )}
                      </div>

                      {idx < trace.lineage.length - 1 && (
                        <div className="flex justify-center pt-2">
                          <ChevronRight className="w-4 h-4 text-zinc-700 rotate-90" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
