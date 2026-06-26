import React, { useMemo, useState } from "react";
import { Sliders } from "lucide-react";
import { getAt5Catalog } from "../services/at5Catalog";
import { getVerifiedCabs, getVerifiedSpeakers, getVerifiedMics } from "../services/at5VerifiedProtocols";

import { AT5_VERIFIED_GEAR } from "../services/at5VerifiedParameterOverrides";

type ExportDebugItem = {
  original_name: string;
  normalized_name: string;
  type: string;
  resolved_guid: string;
  slot_section: string;
  slot_index: number;
  original_index: number;
  original_settings: Record<string, unknown>;
  normalized_settings: Record<string, unknown>;
  exported_settings: string;
  exported: boolean;
  reason: string;
  gear_guid_resolved?: boolean;
  gear_included_in_chain?: boolean;
  gear_written_to_xml?: boolean;
  gear_attempted_to_xml?: boolean;
  parameter_mapping_status?: "SUCCESS" | "MISMATCH" | "UNVERIFIED" | "FAILED" | "PARTIAL" | "PARTIAL_WITH_FALLBACK";
  mismatched_parameters?: string[];
  final_status?: "PASS" | "PASS_WITH_WARNING" | "PARTIAL" | "PARTIAL_WITH_FALLBACK" | "CHECK" | "SKIPPED" | "FAIL" | "CRITICAL" | "SUBSTITUTED_FALLBACK" | "BLOCKED_EXPORT";
  parameter_details?: {
    parameter: string;
    normalized_parameter?: string;
    input_value?: any;
    display_value: string;
    exported_internal_value: string;
    mapping_status: string;
    conversion_note?: string;
    intended_semantic_value?: string;
    resolved_profile_found?: boolean;
    resolved_profile_value?: any;
    fallback_value?: any;
    exported_value?: any;
    placement_label?: string;
    placement_profile_source?: string;
    placement_profile_id?: string;
    fallback_used?: boolean;
    fallback_reason?: string;
    resolved_numeric_values?: any;
    exported_numeric_values?: any;
    verification_status?: string;
    placement_was_supplied_by_chain?: boolean;
    placement_source?: string;
    resolved_at5_fields?: any;
  }[];
  not_exported_detail?: string[];
  tone_adjustment_intent?: Record<string, string>;
  mapped_intent?: any[];
  dropped_intent?: any[];
  verified_guid_resolved?: boolean;
  actual_exported_guid?: string;
  intended_gear_name?: string;
  actual_exported_gear_name?: string;
  fallback_guid_used?: boolean;
  fallback_source?: string;
  substitution_used?: boolean;
  substitution_reason?: string;
  suggested_action?: string;
  gear_manager_type?: string;
  slot_compatibility?: string[];
  selected_slot_section?: string;
  slot_type_valid?: boolean;
  gear_profile_source?: string;
  selection_context?: string;
  requested_generic_name?: string;
  resolved_profile_name?: string;
  requested_gear_name?: string;
  original_requested_gear_name?: string;
  normalized_requested_gear_name?: string;
  fallback_exported_gear_name?: string;
  fallback_exported_guid?: string;
  original_requested_settings?: Record<string, unknown>;
  exported_fallback_settings?: string;
  fallback_applied?: boolean;
  fallback_trigger?: string;
  fallback_reason?: string;
  is_real_requested_default_gear?: boolean;
  final_guid_source?: string;
  fallback_block_triggered?: boolean;
  parameter_schema_source?: string;
  profile_validation_status?: string;
  resolved_parameter_source?: string;
  hardcoded_substitution_applied?: boolean;
  fallback_decision_source?: "resolver" | "safe_mode" | "strict_mode" | "none";
};

type ExportDebugData = {
  raw_input_chain: unknown[];
  exported_chain: ExportDebugItem[];
  skipped_gear: ExportDebugItem[];
  exported_xml_summary: string;
  rack_decision?: any;
};

type Props = {
  debugData: ExportDebugData;
  onJumpToCatalogue?: (guid: string) => void;
};

interface StatusStyle {
  solid: string;
  clearBg: string;
  clearBorder: string;
  pulse: boolean;
}

const STATUS_CONFIG: Record<string, StatusStyle> = {
  PASS: {
    solid: "#4ade80",
    clearBg: "rgba(74, 222, 128, 0.15)",
    clearBorder: "rgba(74, 222, 128, 0.40)",
    pulse: false
  },
  PASS_WITH_WARNING: {
    solid: "#eab308",
    clearBg: "rgba(234, 179, 8, 0.15)",
    clearBorder: "rgba(234, 179, 8, 0.40)",
    pulse: true
  },
  WARN: {
    solid: "#eab308",
    clearBg: "rgba(234, 179, 8, 0.15)",
    clearBorder: "rgba(234, 179, 8, 0.40)",
    pulse: true
  },
  PARTIAL: {
    solid: "#f97316",
    clearBg: "rgba(249, 115, 22, 0.15)",
    clearBorder: "rgba(249, 115, 22, 0.40)",
    pulse: true
  },
  PARTIAL_WITH_FALLBACK: {
    solid: "#eab308",
    clearBg: "rgba(234, 179, 8, 0.15)",
    clearBorder: "rgba(234, 179, 8, 0.40)",
    pulse: true
  },
  CHECK: {
    solid: "#ea580c",
    clearBg: "rgba(234, 88, 12, 0.15)",
    clearBorder: "rgba(234, 88, 12, 0.45)",
    pulse: true
  },
  FAIL: {
    solid: "#dc2626",
    clearBg: "rgba(220, 38, 38, 0.15)",
    clearBorder: "rgba(220, 38, 38, 0.45)",
    pulse: true
  },
  SKIPPED: {
    solid: "#ef4444",
    clearBg: "rgba(239, 68, 68, 0.15)",
    clearBorder: "rgba(239, 68, 68, 0.40)",
    pulse: true
  },
  CRITICAL: {
    solid: "#ef4444",
    clearBg: "rgba(239, 68, 68, 0.15)",
    clearBorder: "rgba(239, 68, 68, 0.55)",
    pulse: true
  },
  SUBSTITUTED_FALLBACK: {
    solid: "#f43f5e",
    clearBg: "rgba(244, 63, 94, 0.15)",
    clearBorder: "rgba(244, 63, 94, 0.55)",
    pulse: true
  },
  BLOCKED_EXPORT: {
    solid: "#ef4444",
    clearBg: "rgba(239, 68, 68, 0.15)",
    clearBorder: "rgba(239, 68, 68, 0.55)",
    pulse: true
  }
};


const readablePanelStyle: React.CSSProperties = {
  color: "#f1f5f9",
  backgroundColor: "#05070a",
};

const readableCardStyle: React.CSSProperties = {
  color: "#f1f5f9",
  backgroundColor: "#0f172a",
};

const readableMutedStyle: React.CSSProperties = {
  color: "#94a3b8",
};

const readableValueStyle: React.CSSProperties = {
  color: "#f8fafc",
};

const parseAttrString = (value: string): Record<string, string> => {
  const result: Record<string, string> = {};
  const regex = /([A-Za-z0-9_]+)="([^"]*)"/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(value ?? "")) !== null) {
    result[match[1]] = match[2];
  }

  return result;
};

const formatValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
};

const normalizeGuid = (guid: any) => {
  if (typeof guid !== 'string') return String(guid);
  return guid.toLowerCase().replace(/-/g, '').trim();
};

const isGuid = (val: any) => {
  if (typeof val !== 'string') return false;
  // Standard UUID format: 8-4-4-4-12 hex chars or 32 hex chars
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hex32Regex = /^[0-9a-f]{32}$/i;
  return uuidRegex.test(val.trim()) || hex32Regex.test(val.trim());
};

const resolveGuidName = (guid: any, paramName?: string) => {
  if (!isGuid(guid)) return String(guid);
  const normalizedGuid = normalizeGuid(guid);

  const catalog = getAt5Catalog();
  const known = catalog.find(i => normalizeGuid(i.guid) === normalizedGuid);
  if (known) return known.displayName;
  
  // Also check verified overrides
  const verified = AT5_VERIFIED_GEAR.find(v => v.realId && normalizeGuid(v.realId) === normalizedGuid);
  if (verified) return verified.name;
  
  // Check protocols - match first alias if found
  const mic = getVerifiedMics().find(m => normalizeGuid(m.guid) === normalizedGuid);
  if (mic) return mic.aliases[0] || "Verified Mic";

  const speaker = getVerifiedSpeakers().find(m => normalizeGuid(m.guid) === normalizedGuid);
  if (speaker) return speaker.aliases[0] || "Verified Speaker";

  const cab = getVerifiedCabs().find(m => normalizeGuid(m.guid) === normalizedGuid);
  if (cab) return cab.aliases[0] || "Verified Cabinet";
  
  const cleanGuid = guid.trim();
  const short = cleanGuid.includes("-") ? cleanGuid.split("-")[0] : cleanGuid.substring(0, 8);
  let type = "Gear";
  const pName = paramName?.toLowerCase() || "";
  if (pName.includes("speaker")) type = "Speaker";
  else if (pName.includes("mic")) type = "Mic";
  else if (pName.includes("cab")) type = "Cab/Model";

  return `Unknown ${type} (${short})`;
};

const isUnknown = (name: string) => name.toLowerCase().includes("unknown");

const SettingsTable = ({
  title,
  data,
  onJumpToCatalogue,
}: {
  title: string;
  data: Record<string, unknown>;
  onJumpToCatalogue?: (guid: string) => void;
}) => {
  const entries = Object.entries(data ?? {});

  if (!entries.length) {
    return (
      <div
        className="rounded-xl border border-slate-800 p-3"
        style={readableCardStyle}
      >
        <div className="text-sm font-bold" style={{ color: "#f1f5f9" }}>
          {title}
        </div>
        <div className="mt-1 text-sm" style={readableMutedStyle}>
          No values
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-slate-800 p-3"
      style={readableCardStyle}
    >
      <div className="mb-2 text-sm font-bold" style={{ color: "#f1f5f9" }}>
        {title}
      </div>
      <div className="space-y-1">
        {entries.map(([key, value]) => {
          const valStr = String(value ?? "");
          // Support both 8-4-4-4-12 (36 chars) and hyphenless 32 charshex
          const isGuidDef = valStr.length >= 30 && (valStr.includes("-") || /^[a-fA-F0-9]{32}$/.test(valStr));
          const resolvedName = isGuidDef ? resolveGuidName(valStr, key) : null;

          return (
            <div
              key={key}
              className="grid grid-cols-[170px_1fr] gap-2 border-b border-white/5 pb-1 text-xs leading-tight last:border-0 last:pb-0"
            >
              <div
                className="font-mono font-semibold"
                style={{ color: "#94a3b8" }}
              >
                {key}
              </div>
              <div
                className="break-all font-mono font-semibold flex flex-col"
                style={readableValueStyle}
              >
                {isGuidDef ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className={`font-bold ${resolvedName && isUnknown(resolvedName) ? 'text-amber-400' : 'text-blue-400'}`}>
                        {resolvedName}
                      </span>
                      <span className="text-[10px] opacity-60 text-slate-400">{valStr}</span>
                    </div>
                    {onJumpToCatalogue && (
                      <button
                        onClick={() => onJumpToCatalogue(valStr)}
                        className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 hover:text-purple-300 text-[8px] font-mono border border-purple-500/20 hover:bg-purple-500/20 transition-all uppercase tracking-tighter shrink-0"
                        title={`Manage catalogue entry for ${resolvedName}`}
                      >
                        Manage entry
                      </button>
                    )}
                  </div>
                ) : (
                  <span>{formatValue(value)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GearCard = ({ item, onJumpToCatalogue }: { item: ExportDebugItem; onJumpToCatalogue?: (guid: string) => void }) => {
  const exportedAttrs = parseAttrString(item.exported_settings ?? "");

  const isCheck = 
    item.exported && (
      item.reason.toLowerCase().includes("check") ||
      item.reason.toLowerCase().includes("warning") ||
      item.reason.toLowerCase().includes("caution") ||
      item.reason.toLowerCase().includes("fallback") ||
      item.exported_settings.includes("undefined") ||
      (!item.exported_settings && item.type !== "cab")
    );

  const cardId = `at5-chain-card-${item.slot_section}-${item.slot_index}-${item.normalized_name}`;

  const cardHasUnknown = Object.entries(exportedAttrs).some(([k, v]) => {
    const val = String(v ?? "");
    const isGuid = val.length >= 30 && (val.includes("-") || /^[a-fA-F0-9]{32}$/.test(val));
    if (!isGuid) return false;
    return isUnknown(resolveGuidName(val, k));
  }) || (item.resolved_guid && isGuid(item.resolved_guid) && isUnknown(resolveGuidName(item.resolved_guid)));

  const isCritical = item.final_status === "CRITICAL" || item.final_status === "FAIL" || item.substitution_used;
  const isCheckOrWarn = isCheck || cardHasUnknown || item.final_status === "CHECK" || item.final_status === "PASS_WITH_WARNING";

  const customCardStyle = {
    ...readableCardStyle,
    backgroundColor: isCritical 
      ? "#1a0f12" 
      : (isCheckOrWarn ? "#1c140d" : "#0f172a"),
    borderColor: isCritical 
      ? "rgba(239, 68, 68, 0.4)" 
      : (isCheckOrWarn ? "rgba(234, 179, 8, 0.3)" : "rgba(30, 41, 59, 0.5)"),
  };

  return (
    <div
      id={cardId}
      className={`rounded-2xl border p-4 shadow-xl transition-all duration-500 target:ring-2 target:ring-gear-accent target:ring-offset-4 target:ring-offset-black scroll-mt-24`}
      style={customCardStyle}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <div className="text-lg font-bold" style={readableValueStyle}>
              {item.substitution_used || item.fallback_applied
                ? item.original_requested_gear_name || item.requested_gear_name || item.original_name
                : item.normalized_name}
            </div>
            <div className="text-sm" style={readableMutedStyle}>
              Original: {item.original_name}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(() => {
              const statusKey = item.final_status || "PASS";
              const styleCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PASS;
              const label = {
                PASS: "Pass",
                PASS_WITH_WARNING: "Warning",
                WARN: "Warning",
                PARTIAL: "Partial",
                CHECK: "Check",
                FAIL: "Fail",
                SKIPPED: "Skipped",
                CRITICAL: "Critical",
                SUBSTITUTED_FALLBACK: "Substituted",
                BLOCKED_EXPORT: "Blocked"
              }[statusKey] || statusKey;

              return (
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border ${styleCfg.pulse ? "animate-pulse" : ""}`}
                  style={{
                    color: styleCfg.solid,
                    backgroundColor: styleCfg.clearBg,
                    borderColor: styleCfg.clearBorder
                  }}
                >
                  {label}
                </span>
              );
            })()}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 ml-auto">
          <span
             className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-mono tracking-wider font-semibold"
            style={{ color: "#cbd5e1" }}
          >
            {item.slot_section}
            {item.slot_index >= 0 ? ` / Slot ${item.slot_index}` : ""}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm" style={readableValueStyle}>
        <div>
          <span className="font-bold" style={{ color: "#94a3b8" }}>
            Type:
          </span>{" "}
          <span className="font-mono font-semibold" style={readableValueStyle}>
            {item.type}
          </span>
        </div>

        <div>
          <span className="font-bold" style={{ color: "#94a3b8" }}>
            GUID:
          </span>{" "}
          <span
            className="break-all font-mono font-semibold"
            style={readableValueStyle}
          >
            {item.resolved_guid}
          </span>
          {onJumpToCatalogue && item.resolved_guid && isGuid(item.resolved_guid) && (
            <button 
              onClick={() => onJumpToCatalogue(item.resolved_guid)}
              className="ml-3 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] font-mono border border-purple-500/20 hover:bg-purple-500/20 transition-all uppercase tracking-tighter"
            >
              Manage entry
            </button>
          )}
        </div>

        <div>
          <span className="font-bold" style={{ color: "#94a3b8" }}>
            Reason:
          </span>{" "}
          <span style={readableValueStyle}>{item.reason}</span>
        </div>

        {item.suggested_action && (
          <div className="mt-2 text-xs p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-gray-300 font-mono">
            <span className="font-bold text-amber-400">Suggested Action: </span>
            {item.suggested_action}
          </div>
        )}

        {(item.substitution_used || item.fallback_applied) && (
          <div>
            <span className="font-bold" style={{ color: "#f43f5e" }}>
              Exported fallback:
            </span>{" "}
            <span className="font-semibold text-rose-300">
              {item.actual_exported_gear_name || item.fallback_exported_gear_name || "None"}
            </span>
          </div>
        )}

        {(item.final_status === "CRITICAL" || item.substitution_used || item.fallback_applied) && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-mono space-y-1.5">
            <div className="font-bold text-red-400 uppercase tracking-wider text-[10px]">
              CRITICAL EXPORT SUBSTITUTION DETECTED
            </div>
            <div>
              <span className="text-gray-400">Requested Gear:</span>{" "}
              <span className="font-semibold text-white">
                {item.original_requested_gear_name || item.requested_gear_name || item.original_name}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Actual Exported Gear:</span>{" "}
              <span className="font-semibold text-white">
                {item.fallback_exported_gear_name || item.actual_exported_gear_name || "None"}
              </span>
            </div>
            {item.fallback_exported_guid && (
              <div>
                <span className="text-gray-400">Fallback GUID:</span>{" "}
                <span className="font-semibold text-white">
                  {item.fallback_exported_guid}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-400">Fallback Reason:</span>{" "}
              <span className="font-semibold text-white">
                {item.fallback_reason || item.substitution_reason || "missing_verified_guid"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Fallback Used:</span>{" "}
              <span className="font-semibold text-white">Yes</span>
            </div>
            <div className="pt-1.5 border-t border-red-500/10 mt-1.5 text-gray-300">
              <span className="font-bold text-red-400">Action Required:</span> Import an AT5 .at5p preset containing{" "}
              <span className="underline font-semibold text-white">
                {item.original_requested_gear_name || item.requested_gear_name || item.original_name}
              </span>{" "}
              using Gear Management / Discovery.
            </div>
          </div>
        )}

        {/* Diagnostic Metadata Block */}
        <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10.5px] font-mono leading-relaxed bg-[#111114]/50 p-2.5 rounded-xl border border-white/5">
          {item.intended_gear_name && (
            <div>
              <span className="text-gray-500">Intended Gear:</span>{" "}
              <span className="text-gray-300 font-semibold">{item.intended_gear_name}</span>
            </div>
          )}
          {item.actual_exported_gear_name && (
            <div>
              <span className="text-gray-500">Exported Gear:</span>{" "}
              <span className="text-gray-300 font-semibold">{item.actual_exported_gear_name}</span>
            </div>
          )}
          {item.verified_guid_resolved !== undefined && (
            <div>
              <span className="text-gray-500">Verified GUID Resolved:</span>{" "}
              <span className={item.verified_guid_resolved ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                {item.verified_guid_resolved ? "true" : "false"}
              </span>
            </div>
          )}
          {item.fallback_guid_used !== undefined && (
            <div>
              <span className="text-gray-500">Fallback GUID Used:</span>{" "}
              <span className="text-gray-300">{item.fallback_guid_used ? "true" : "false"}</span>
            </div>
          )}
          {item.fallback_source && (
            <div className="md:col-span-2">
              <span className="text-gray-500">Fallback Source:</span>{" "}
              <span className="text-gray-400">{item.fallback_source}</span>
            </div>
          )}
          {item.substitution_used && (
            <div className="md:col-span-2">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[9px] mr-1">Substitution:</span>{" "}
              <span className="text-gray-300 italic">{item.substitution_reason}</span>
            </div>
          )}
          {item.requested_generic_name && (
            <div>
              <span className="text-gray-500">Requested Generic Name:</span>{" "}
              <span className="text-cyan-400 font-bold">"{item.requested_generic_name}"</span>
            </div>
          )}
          {item.resolved_profile_name && (
            <div>
              <span className="text-gray-500">Resolved Profile Name:</span>{" "}
              <span className="text-cyan-400 font-bold">"{item.resolved_profile_name}"</span>
            </div>
          )}
          {item.selection_context && (
            <div>
              <span className="text-gray-500">Selection Context:</span>{" "}
              <span className="text-purple-400 font-semibold">{item.selection_context}</span>
            </div>
          )}
          {item.gear_manager_type && (
            <div>
              <span className="text-gray-500">Gear Manager Type:</span>{" "}
              <span className="text-gray-300 font-semibold">{item.gear_manager_type}</span>
            </div>
          )}
          {item.slot_type_valid !== undefined && (
            <div>
              <span className="text-gray-500">Slot Type Valid:</span>{" "}
              <span className={item.slot_type_valid ? "text-emerald-400 font-semibold" : "text-rose-500 font-bold"}>
                {item.slot_type_valid ? "true" : "false"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <SettingsTable title="Original settings" data={item.original_settings} onJumpToCatalogue={onJumpToCatalogue} />
        <SettingsTable
          title="Normalised settings"
          data={item.normalized_settings}
          onJumpToCatalogue={onJumpToCatalogue}
        />
        <SettingsTable title="Exported XML settings" data={exportedAttrs} onJumpToCatalogue={onJumpToCatalogue} />
      </div>

      {item.tone_adjustment_intent && Object.keys(item.tone_adjustment_intent).length > 0 && (
        <div className="mt-4 rounded-xl border border-cyan-500/10 p-3 bg-cyan-950/10">
          <div className="mb-2 text-xs font-mono font-bold uppercase text-cyan-400">
            Tone Adjustment Intent
          </div>
          <div className="grid gap-1.5 text-xs font-mono">
            {Object.entries(item.tone_adjustment_intent).map(([key, val]) => (
              <div key={key} className="flex gap-2">
                <span className="text-gray-400 capitalize">{key.replace("_", " ")}:</span>
                <span className="text-cyan-300 font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.mapped_intent && item.mapped_intent.length > 0 && (
        <div className="mt-4 rounded-xl border border-emerald-500/10 p-3 bg-emerald-950/10">
          <div className="mb-2 text-xs font-mono font-bold uppercase text-emerald-400">
            Mapped Intent
          </div>
          <div className="space-y-2 text-xs font-mono">
            {item.mapped_intent.map((mi: any, idx: number) => (
              <div key={idx} className="bg-black/20 p-2 rounded-lg leading-relaxed">
                <div className="flex justify-between font-bold text-gray-200">
                  <span>{mi.intent}</span>
                  <span className="text-emerald-400">→ {mi.mapped_to}</span>
                </div>
                {mi.settings && (
                  <div className="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    {Object.entries(mi.settings).map(([k, v]) => (
                      <span key={k}>{k}: <strong className="text-white">{String(v)}</strong></span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {item.dropped_intent && item.dropped_intent.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-500/10 p-3 bg-red-950/10">
          <div className="mb-2 text-xs font-mono font-bold uppercase text-red-400">
            Dropped Intent
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            {item.dropped_intent.map((di: any, idx: number) => (
              <div key={idx} className="bg-black/30 p-2 rounded-lg flex items-start justify-between">
                <span className="text-red-300">{di.intent}</span>
                <span className="text-[10px] text-gray-300 italic font-sans">{di.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.parameter_details && item.parameter_details.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-800 p-3 bg-slate-950/30">
          <div className="mb-2 text-sm font-bold text-slate-200">
            Export Parameter Verification Details
          </div>
          <div className="space-y-3">
            {item.parameter_details.map((param, pIdx) => {
              const isMicPlacement = param.parameter === "Mic 1 Placement" || param.parameter === "Mic 2 Placement";
              if (isMicPlacement) {
                const isMic1 = param.parameter === "Mic 1 Placement";
                const isFallback = param.mapping_status === "FALLBACK_USED" || param.mapping_status === "PARTIAL_WITH_FALLBACK" || !param.resolved_profile_found;
                
                // Friendly source label
                let sourceLabel = "Cabinet Default Coordinates";
                if (param.placement_source === "calibrated_profile") sourceLabel = "Calibrated Profile";
                else if (param.placement_source === "at5p_discovery_profile") sourceLabel = "Imported AT5 Preset Profile";
                else if (param.placement_source === "fallback_default") sourceLabel = "Fallback Default Coordinates";
                else if (param.placement_source === "imported_existing_value") sourceLabel = "Imported AT5 Value";
                else if (param.placement_source === "cab_default") sourceLabel = "Cabinet Default Coordinates";

                // Styled status badge
                let badgeStyle = "bg-slate-900/60 text-slate-400 border border-slate-800";
                let badgeText = "DEFAULT USED";
                if (param.mapping_status === "RESOLVED_FROM_PROFILE") {
                  badgeStyle = "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20";
                  badgeText = "RESOLVED FROM PROFILE";
                } else if (param.mapping_status === "FALLBACK_USED") {
                  badgeStyle = "bg-amber-950/40 text-amber-400 border border-amber-500/20";
                  badgeText = "FALLBACK USED";
                } else if (param.mapping_status === "NOT_SPECIFIED") {
                  badgeStyle = "bg-blue-950/20 text-blue-400 border border-blue-500/20";
                  badgeText = "DEFAULT USED";
                }

                return (
                  <div key={pIdx} className="border-b border-white/5 pb-4 text-xs leading-normal last:border-0 last:pb-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between font-mono font-semibold text-slate-400 mb-2 gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200">{param.parameter}</span>
                        <span className="text-[10px] text-cyan-400 font-normal">
                          ({isMic1 ? "TT Mic_1 → AT5 Mic0" : "TT Mic_2 → AT5 Mic1"})
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider self-start md:self-auto ${badgeStyle}`}>
                        {badgeText}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300 pl-2">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-mono tracking-wider mb-0.5">Intended Semantic Placement</span>
                        <strong className="text-slate-200">{param.display_value}</strong>
                        {param.display_value !== "Not specified" && (
                          <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                            Provided by signal chain
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-mono tracking-wider mb-0.5">Placement Source</span>
                        <div className="flex flex-col gap-1">
                          <span className={param.resolved_profile_found ? "text-emerald-400 font-semibold" : isFallback ? "text-amber-400 font-semibold" : "text-blue-400 font-semibold"}>
                            {sourceLabel}
                          </span>
                          {param.resolved_profile_found && param.placement_profile_source && (
                            <span className="text-[9px] text-slate-500 font-mono">
                              Profile ID: {param.placement_profile_id ? param.placement_profile_id.substring(0, 8) : "N/A"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase font-mono tracking-wider mb-0.5">
                          {isFallback ? "Fallback Exported (XML)" : "Exported (XML)"}
                        </span>
                        <div className="font-mono text-[10px] text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-white/5 mt-1 space-y-0.5 max-w-xs">
                          {param.exported_internal_value.split(", ").map((coord, cIdx) => (
                            <div key={cIdx} className="flex justify-between">
                              <span className="text-slate-500">{coord.split(":")[0]}:</span>
                              <span className="text-cyan-400 font-semibold">{coord.split(":")[1]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {param.conversion_note && (
                      <div className="text-[10px] text-slate-500 italic mt-2.5 pl-2 border-l-2 border-slate-800">
                        Note: {param.conversion_note}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={pIdx}
                  className="grid grid-cols-[140px_1fr] gap-3 border-b border-white/5 pb-2 text-xs leading-tight last:border-0 last:pb-0"
                >
                  <div className="font-mono font-semibold text-slate-400">
                    {param.parameter}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-300">Intended: <strong className="text-slate-100">{param.display_value}</strong></span>
                      {param.normalized_parameter && (
                        <span className="text-slate-400 font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">
                          ({param.normalized_parameter})
                        </span>
                      )}
                      <span className="text-slate-500 font-mono">→</span>
                      <span className="text-slate-400">Exported Raw: <strong className="font-mono text-slate-100">"{param.exported_internal_value}"</strong></span>
                      
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          param.mapping_status === "SUCCESS"
                            ? "bg-green-950/40 text-green-400"
                            : param.mapping_status === "SUCCESS_NEAREST_BAND" || param.mapping_status === "FALLBACK_USED" || param.mapping_status === "PARTIAL_WITH_FALLBACK"
                            ? "bg-amber-950/40 text-amber-400"
                            : "bg-red-950/40 text-red-100"
                        }`}
                      >
                        {param.mapping_status}
                      </span>
                    </div>
                    {param.conversion_note && (
                      <span className="text-[10px] text-slate-500 italic">
                        Note: {param.conversion_note}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {item.not_exported_detail && item.not_exported_detail.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-950/30 p-3 bg-amber-950/10">
          <div className="mb-1 text-sm font-bold text-amber-400">
            Cabinet Parameters Unexported In Preset XML
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            These parameters are set in the tone engine but are not exported directly to standard AT5 XML. You must verify or configure them inside AmpliTube 5:
          </p>
          <div className="flex flex-wrap gap-2">
            {item.not_exported_detail.map((detail, dIdx) => (
              <span
                key={dIdx}
                className="px-2 py-1 rounded bg-slate-800 text-slate-200 font-mono text-[10px] border border-slate-700 shadow-sm"
              >
                {detail}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


export const AT5SignalChainView: React.FC<Props> = ({ debugData, onJumpToCatalogue }) => {
  const sortedItems = useMemo(() => {
    const all = [
      ...(debugData.exported_chain || []),
      ...(debugData.skipped_gear || [])
    ];
    // Sort by original index to match signal chain path sequence
    return all.sort((a, b) => a.original_index - b.original_index);
  }, [debugData]);

  const stats = useMemo(() => {
    const all = [
      ...(debugData.exported_chain || []),
      ...(debugData.skipped_gear || [])
    ];

    let totalCount = all.length;
    let passCount = 0;
    let warningCount = 0;
    let partialCount = 0;
    let checkCount = 0;
    let skippedCount = 0;
    let failCount = 0;
    let criticalCount = 0;
    let substitutionCount = 0;

    all.forEach(item => {
      const status = item.final_status || "PASS";
      if (status === "PASS") {
        passCount++;
      } else if (status === "PASS_WITH_WARNING") {
        warningCount++;
      } else if (status === "PARTIAL") {
        partialCount++;
      } else if (status === "CHECK") {
        checkCount++;
      } else if (status === "SKIPPED") {
        skippedCount++;
      } else if (status === "FAIL") {
        failCount++;
      } else if (status === "CRITICAL") {
        criticalCount++;
      } else if (status === "SUBSTITUTED_FALLBACK") {
        substitutionCount++;
      }
    });

    return { totalCount, passCount, warningCount, partialCount, checkCount, skippedCount, failCount, criticalCount, substitutionCount };
  }, [debugData]);

  const [copied, setCopied] = useState(false);

  const copyJson = async () => {
    await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(debugData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "tt-at5-export-debug.json";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <section
      className="rounded-2xl border border-slate-800 p-6 shadow-2xl"
      style={readablePanelStyle}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold tracking-tight" style={readableValueStyle}>
              AT5 Export Signal Chain
            </h2>
            
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Total: {stats.totalCount}
              </span>

              {stats.checkCount === 0 && stats.skippedCount === 0 && stats.warningCount === 0 && stats.partialCount === 0 && stats.failCount === 0 && stats.criticalCount === 0 && stats.substitutionCount === 0 ? (
                <span 
                  className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG.PASS.pulse ? "animate-pulse" : ""}`}
                  style={{
                    color: STATUS_CONFIG.PASS.solid,
                    backgroundColor: STATUS_CONFIG.PASS.clearBg,
                    borderColor: STATUS_CONFIG.PASS.clearBorder
                  }}
                >
                  Pass
                </span>
              ) : (
                <>
                  <span 
                    className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG.PASS.pulse ? "animate-pulse" : ""}`}
                    style={{
                      color: STATUS_CONFIG.PASS.solid,
                      backgroundColor: STATUS_CONFIG.PASS.clearBg,
                      borderColor: STATUS_CONFIG.PASS.clearBorder
                    }}
                  >
                    Pass: {stats.passCount}
                  </span>
                  {stats.criticalCount > 0 && (
                    <span 
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG.CRITICAL.pulse ? "animate-pulse" : ""}`}
                      style={{
                        color: STATUS_CONFIG.CRITICAL.solid,
                        backgroundColor: STATUS_CONFIG.CRITICAL.clearBg,
                        borderColor: STATUS_CONFIG.CRITICAL.clearBorder
                      }}
                    >
                      Critical: {stats.criticalCount}
                    </span>
                  )}
                  {stats.substitutionCount > 0 && (
                    <span 
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG.SUBSTITUTED_FALLBACK.pulse ? "animate-pulse" : ""}`}
                      style={{
                        color: STATUS_CONFIG.SUBSTITUTED_FALLBACK.solid,
                        backgroundColor: STATUS_CONFIG.SUBSTITUTED_FALLBACK.clearBg,
                        borderColor: STATUS_CONFIG.SUBSTITUTED_FALLBACK.clearBorder
                      }}
                    >
                      Substituted: {stats.substitutionCount}
                    </span>
                  )}
                  {stats.warningCount > 0 && (
                    <span 
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG.WARN.pulse ? "animate-pulse" : ""}`}
                      style={{
                        color: STATUS_CONFIG.WARN.solid,
                        backgroundColor: STATUS_CONFIG.WARN.clearBg,
                        borderColor: STATUS_CONFIG.WARN.clearBorder
                      }}
                    >
                      Warn: {stats.warningCount}
                    </span>
                  )}
                  {stats.partialCount > 0 && (
                    <span 
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG.PARTIAL.pulse ? "animate-pulse" : ""}`}
                      style={{
                        color: STATUS_CONFIG.PARTIAL.solid,
                        backgroundColor: STATUS_CONFIG.PARTIAL.clearBg,
                        borderColor: STATUS_CONFIG.PARTIAL.clearBorder
                      }}
                    >
                      Partial: {stats.partialCount}
                    </span>
                  )}
                  {stats.checkCount > 0 && (
                    <span 
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG.CHECK.pulse ? "animate-pulse" : ""}`}
                      style={{
                        color: STATUS_CONFIG.CHECK.solid,
                        backgroundColor: STATUS_CONFIG.CHECK.clearBg,
                        borderColor: STATUS_CONFIG.CHECK.clearBorder
                      }}
                    >
                      Check: {stats.checkCount}
                    </span>
                  )}
                  {stats.skippedCount > 0 && (
                    <span 
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG.SKIPPED.pulse ? "animate-pulse" : ""}`}
                      style={{
                        color: STATUS_CONFIG.SKIPPED.solid,
                        backgroundColor: STATUS_CONFIG.SKIPPED.clearBg,
                        borderColor: STATUS_CONFIG.SKIPPED.clearBorder
                      }}
                    >
                      Skipped: {stats.skippedCount}
                    </span>
                  )}
                  {stats.failCount > 0 && (
                    <span 
                      className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border ${STATUS_CONFIG.FAIL.pulse ? "animate-pulse" : ""}`}
                      style={{
                        color: STATUS_CONFIG.FAIL.solid,
                        backgroundColor: STATUS_CONFIG.FAIL.clearBg,
                        borderColor: STATUS_CONFIG.FAIL.clearBorder
                      }}
                    >
                      Fail: {stats.failCount}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <p className="text-sm" style={readableMutedStyle}>
            Visual view of the actual exported AmpliTube chain.
          </p>
          <p className="text-[10px] font-mono uppercase tracking-widest opacity-60" style={readableMutedStyle}>
            {debugData.exported_xml_summary}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyJson}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest border transition-all shadow-lg active:scale-95 ${copied ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
          >
            {copied ? "Debug JSON copied." : "Copy Debug JSON"}
          </button>

          <button
            type="button"
            onClick={exportJson}
            className="rounded-xl bg-white/5 hover:bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-widest border border-white/10 transition-all shadow-lg active:scale-95"
            style={{ color: "#ffffff" }}
          >
            Export Debug JSON
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Rack / Post-Amp EQ Decision Reasoning Card */}
        {debugData.rack_decision && (
          <div className="rounded-2xl border border-amber-500/20 p-5 bg-amber-500/5 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400 animate-pulse" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                  Rack / Post-Amp EQ Decision
                </h4>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[9px] font-mono font-bold uppercase border tracking-widest ${
                debugData.rack_decision.status === 'required' || debugData.rack_decision.status === 'recommended'
                  ? 'bg-amber-500/20 text-yellow-300 border-amber-500/40 animate-pulse'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }`}>
                {debugData.rack_decision.status}
              </span>
            </div>

            <p className="text-xs text-gray-300 mb-3 leading-relaxed">
              <span className="font-semibold text-gray-200">Reasoning:</span> {debugData.rack_decision.reason}
            </p>

            {debugData.rack_decision.selected_gear && (
              <div className="text-xs font-mono text-gray-300 flex items-center gap-1.5 mb-3 bg-black/40 p-2.5 rounded-lg border border-white/5">
                <span className="text-slate-400">Selected Gear:</span>
                <strong className="text-cyan-400 font-bold">{debugData.rack_decision.selected_gear}</strong>
              </div>
            )}

            {debugData.rack_decision.eq_intent && debugData.rack_decision.eq_intent.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block">Intended EQ Curves:</span>
                <div className="flex flex-wrap gap-1.5">
                  {debugData.rack_decision.eq_intent.map((intent: string, idx: number) => (
                    <span key={idx} className="text-[10px] font-mono bg-amber-500/15 text-yellow-300 px-2 py-1 rounded border border-amber-500/30">
                      {intent}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {debugData.rack_decision.status === 'not_needed' && debugData.rack_decision.why_omitted && (
              <div className="mt-3 text-xs text-rose-300 font-mono italic p-2 rounded bg-rose-950/15 border border-rose-500/10">
                <span className="font-bold">Why Omitted:</span> {debugData.rack_decision.why_omitted}
              </div>
            )}
          </div>
        )}

        {sortedItems.map((item, index) => (
          <GearCard
            key={`${item.slot_section}-${item.slot_index}-${item.normalized_name}-${index}`}
            item={item}
            onJumpToCatalogue={onJumpToCatalogue}
          />
        ))}

        {/* Input/Output/Room Info info if not in list */}
        <div className="pt-8 border-t border-white/5 space-y-4">
          <div
            className="rounded-2xl border border-dashed border-slate-800 p-6 text-sm italic"
            style={readableCardStyle}
          >
            <p className="text-gray-500 mb-2 font-mono text-[10px] uppercase tracking-widest">Routing Context</p>
            Input/Output and Room micro-environments are part of the global AT5 preset wrapper. 
            Room and mic details are shown within the CabA card under Exported XML settings.
          </div>
        </div>
      </div>
    </section>
  );
};

export default AT5SignalChainView;
