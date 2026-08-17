import React, { useMemo, useState } from "react";
import { 
  Sliders,
  Waves, 
  Speaker, 
  Box, 
  SlidersHorizontal, 
  Activity, 
  Zap, 
  Gauge, 
  Link2, 
  Sparkles,
  Download,
  Copy,
  Cpu,
  Compass,
  FileCode
} from "lucide-react";
import { getAt5Catalog } from "../services/at5Catalog";
import { getVerifiedCabs, getVerifiedSpeakers, getVerifiedMics } from "../services/at5VerifiedProtocols";
import { AT5_VERIFIED_GEAR } from "../services/at5VerifiedParameterOverrides";
import { ToneProfileView } from "./ToneProfileView";

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
  rawRequest?: string;
  toneResult?: any;
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


const getGearIcon = (type: string, name: string) => {
  const nameL = (name || "").toLowerCase();
  const typeL = (type || "").toLowerCase();
  
  if (nameL.includes('gate') || nameL.includes('noise')) return Activity;
  if (nameL.includes('over') || nameL.includes('scream') || nameL.includes('dist')) return Zap;
  if (typeL === 'rack' && (nameL.includes('eq') || nameL.includes('graphic'))) return Sliders;
  if (typeL === 'pedal' && nameL.includes('boost')) return Gauge;

  if (typeL === 'pedal') return Waves;
  if (typeL === 'amp') return Speaker;
  if (typeL === 'cab') return Box;
  if (typeL === 'rack') return SlidersHorizontal;

  return Box;
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

const SelectedGearDetailPanel = ({
  item,
  onJumpToCatalogue,
  openSections,
  setOpenSections,
}: {
  item: ExportDebugItem;
  onJumpToCatalogue?: (guid: string) => void;
  openSections: Record<string, boolean>;
  setOpenSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) => {
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

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasVerificationIssue = (item.parameter_mapping_status && item.parameter_mapping_status !== "SUCCESS") || (item.mismatched_parameters && item.mismatched_parameters.length > 0);
  const verificationBadge = hasVerificationIssue ? (
    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
      WARN
    </span>
  ) : (
    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
      PASS
    </span>
  );

  const profileBadge = (item.substitution_used || item.fallback_applied) ? (
    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
      SUBSTITUTED
    </span>
  ) : (
    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/55">
      VERIFIED
    </span>
  );

  const settingsBadge = (item.final_status === "PARTIAL" || item.parameter_mapping_status === "PARTIAL" || item.parameter_mapping_status === "PARTIAL_WITH_FALLBACK") ? (
    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
      PARTIAL
    </span>
  ) : null;

  const intentBadge = (item.dropped_intent && item.dropped_intent.length > 0) ? (
    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
      DROPPED
    </span>
  ) : null;

  return (
    <div
      className="rounded-2xl border p-5 shadow-xl transition-all duration-300 space-y-5"
      style={customCardStyle}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex flex-col">
            <div className="text-xl font-bold tracking-tight text-white">
              {item.substitution_used || item.fallback_applied
                ? item.original_requested_gear_name || item.requested_gear_name || item.original_name
                : item.normalized_name}
            </div>
            <div className="text-sm mt-0.5" style={readableMutedStyle}>
              Original Name: <span className="font-semibold text-slate-300">{item.original_name}</span>
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

            <span
              className="rounded-full bg-slate-800 px-3 py-1 text-[10px] font-mono tracking-wider font-semibold border border-slate-700/55"
              style={{ color: "#cbd5e1" }}
            >
              {item.slot_section}
              {item.slot_index >= 0 ? ` / Slot ${item.slot_index}` : ""}
            </span>

            {onJumpToCatalogue && (
              <button 
                type="button"
                onClick={() => onJumpToCatalogue(item.resolved_guid || item.actual_exported_guid || item.normalized_name || item.original_name)}
                className="px-3 py-1 rounded-full bg-gear-accent/20 text-gear-accent hover:bg-gear-accent hover:text-black text-[10px] font-bold font-mono border border-gear-accent/30 transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm ml-1"
                title="Open directly in Gear Manager to review or edit translation parameters"
              >
                <Sliders className="w-3 h-3" />
                Review in Gear Manager
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm leading-relaxed text-slate-300">
          <div>
            <span className="font-bold text-slate-400 mr-2">Type:</span>
            <span className="font-mono font-semibold">{item.type}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-400 mr-1">GUID:</span>
            <span className="break-all font-mono font-semibold bg-black/40 px-2 py-0.5 rounded border border-white/5 text-[12px]">{item.resolved_guid || "None"}</span>
            {onJumpToCatalogue && (
              <button 
                type="button"
                onClick={() => onJumpToCatalogue(item.resolved_guid || item.actual_exported_guid || item.normalized_name || item.original_name)}
                className="px-2 py-0.5 rounded bg-gear-accent/15 text-gear-accent text-[9px] font-mono border border-gear-accent/30 hover:bg-gear-accent hover:text-black transition-all uppercase tracking-tighter flex items-center gap-1"
              >
                Manage Profile
              </button>
            )}
          </div>
          <div className="md:col-span-2">
            <span className="font-bold text-slate-400 mr-2">Reason:</span>
            <span className="text-slate-200">{item.reason}</span>
          </div>
        </div>

        {item.suggested_action && (
          <div className="text-xs p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-gray-300 font-mono">
            <span className="font-bold text-amber-400">Suggested Action: </span>
            {item.suggested_action}
          </div>
        )}

        {(item.substitution_used || item.fallback_applied) && (
          <div className="flex items-center gap-1.5 text-sm text-slate-300 font-semibold bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10">
            <span className="font-bold text-slate-400">Exported fallback substitute:</span>{" "}
            <span className="font-bold text-rose-400">
              {item.actual_exported_gear_name || item.fallback_exported_gear_name || "None"}
            </span>
          </div>
        )}

        {(item.final_status === "CRITICAL" || item.substitution_used || item.fallback_applied) && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs font-mono space-y-1.5">
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
      </div>

      <div className="space-y-3 pt-2">
        <Accordion
          title="Settings & Parameter Maps"
          isOpen={!!openSections.settings}
          onToggle={() => toggleSection("settings")}
          badge={settingsBadge}
        >
          <div className="grid gap-3 pt-1">
            <SettingsTable title="Original settings" data={item.original_settings} onJumpToCatalogue={onJumpToCatalogue} />
            <SettingsTable
              title="Normalised settings"
              data={item.normalized_settings}
              onJumpToCatalogue={onJumpToCatalogue}
            />
            <SettingsTable title="Exported XML settings" data={exportedAttrs} onJumpToCatalogue={onJumpToCatalogue} />
          </div>
        </Accordion>

        <Accordion
          title="Export Parameter Verification"
          isOpen={!!openSections.verification}
          onToggle={() => toggleSection("verification")}
          badge={verificationBadge}
        >
          {item.parameter_details && item.parameter_details.length > 0 ? (
            <div className="rounded-xl border border-slate-800 p-3 bg-slate-950/30">
              <div className="mb-2 text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
                Export Parameter Verification Details
              </div>
              <div className="space-y-3">
                {item.parameter_details.map((param, pIdx) => {
                  const isMicPlacement = param.parameter === "Mic 1 Placement" || param.parameter === "Mic 2 Placement";
                  if (isMicPlacement) {
                    const isMic1 = param.parameter === "Mic 1 Placement";
                    const isFallback = param.mapping_status === "FALLBACK_USED" || param.mapping_status === "PARTIAL_WITH_FALLBACK" || !param.resolved_profile_found;
                    
                    let sourceLabel = "Cabinet Default Coordinates";
                    if (param.placement_source === "calibrated_profile") sourceLabel = "Calibrated Profile";
                    else if (param.placement_source === "at5p_discovery_profile") sourceLabel = "Imported AT5 Preset Profile";
                    else if (param.placement_source === "fallback_default") sourceLabel = "Fallback Default Coordinates";
                    else if (param.placement_source === "imported_existing_value") sourceLabel = "Imported AT5 Value";
                    else if (param.placement_source === "cab_default") sourceLabel = "Cabinet Default Coordinates";

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
          ) : (
            <p className="text-xs text-emerald-400 font-mono">✓ No parameter verification required or generated for this component.</p>
          )}

          {item.not_exported_detail && item.not_exported_detail.length > 0 && (
            <div className="rounded-xl border border-amber-950/30 p-3 bg-amber-950/10">
              <div className="mb-1 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Cabinet Parameters Unexported In Preset XML
              </div>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
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
        </Accordion>

        <Accordion
          title="Profile Engine & Resolution Diagnostics"
          isOpen={!!openSections.profile}
          onToggle={() => toggleSection("profile")}
          badge={profileBadge}
        >
          <div className="pt-1 text-[11px] font-mono leading-relaxed bg-[#111114]/50 p-3 rounded-xl border border-slate-800/80 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
              {item.intended_gear_name && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Intended Gear</span>
                  <span className="text-gray-200 font-semibold text-xs">{item.intended_gear_name}</span>
                </div>
              )}
              {item.actual_exported_gear_name && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Exported Gear</span>
                  <span className="text-gray-200 font-semibold text-xs">{item.actual_exported_gear_name}</span>
                </div>
              )}
              {item.verified_guid_resolved !== undefined && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Verified GUID Resolved</span>
                  <span className={`text-xs font-semibold ${item.verified_guid_resolved ? "text-emerald-400" : "text-amber-400"}`}>
                    {item.verified_guid_resolved ? "true" : "false"}
                  </span>
                </div>
              )}
              {item.fallback_guid_used !== undefined && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Fallback GUID Used</span>
                  <span className="text-gray-300 text-xs">{item.fallback_guid_used ? "true" : "false"}</span>
                </div>
              )}
              {item.requested_generic_name && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Requested Generic Name</span>
                  <span className="text-cyan-400 font-bold text-xs">"{item.requested_generic_name}"</span>
                </div>
              )}
              {item.resolved_profile_name && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Resolved Profile Name</span>
                  <span className="text-cyan-400 font-bold text-xs">"{item.resolved_profile_name}"</span>
                </div>
              )}
              {item.selection_context && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Selection Context</span>
                  <span className="text-purple-400 font-semibold text-xs">{item.selection_context}</span>
                </div>
              )}
              {item.gear_manager_type && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Gear Manager Type</span>
                  <span className="text-gray-300 font-semibold text-xs">{item.gear_manager_type}</span>
                </div>
              )}
              {item.slot_type_valid !== undefined && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Slot Type Valid</span>
                  <span className={`text-xs font-semibold ${item.slot_type_valid ? "text-emerald-400" : "text-rose-500"}`}>
                    {item.slot_type_valid ? "true" : "false"}
                  </span>
                </div>
              )}
              {item.final_guid_source && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Final GUID Source</span>
                  <span className="text-gray-300 text-xs">{item.final_guid_source}</span>
                </div>
              )}
              {item.parameter_schema_source && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Parameter Schema Source</span>
                  <span className="text-gray-300 text-xs">{item.parameter_schema_source}</span>
                </div>
              )}
              {item.profile_validation_status && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Profile Validation Status</span>
                  <span className="text-gray-300 text-xs">{item.profile_validation_status}</span>
                </div>
              )}
              {item.resolved_parameter_source && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Resolved Parameter Source</span>
                  <span className="text-gray-300 text-xs">{item.resolved_parameter_source}</span>
                </div>
              )}
              {item.hardcoded_substitution_applied !== undefined && (
                <div>
                  <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Hardcoded Substitution Applied</span>
                  <span className="text-gray-300 text-xs">{item.hardcoded_substitution_applied ? "true" : "false"}</span>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-2 mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px]">
              {(item as any).gear_manager_profile_guid && (
                <div className="break-all">
                  <span className="text-slate-500 block">Gear Manager Profile GUID</span>
                  <span className="text-slate-300 font-mono">{(item as any).gear_manager_profile_guid}</span>
                </div>
              )}
              {(item as any).catalog_guid && (
                <div className="break-all">
                  <span className="text-slate-500 block">Catalog GUID</span>
                  <span className="text-slate-300 font-mono">{(item as any).catalog_guid}</span>
                </div>
              )}
              {(item as any).verified_static_guid && (
                <div className="break-all">
                  <span className="text-slate-500 block">Verified Static GUID</span>
                  <span className="text-slate-300 font-mono">{(item as any).verified_static_guid}</span>
                </div>
              )}
              {(item as any).manifest_guid && (
                <div className="break-all">
                  <span className="text-slate-500 block">Manifest GUID</span>
                  <span className="text-slate-300 font-mono">{(item as any).manifest_guid}</span>
                </div>
              )}
            </div>

            {item.fallback_source && (
              <div className="border-t border-white/5 pt-2 mt-2">
                <span className="text-gray-500 block text-[9px] uppercase tracking-wider">Fallback Source</span>
                <span className="text-gray-400 text-xs italic">{item.fallback_source}</span>
              </div>
            )}
            {item.substitution_used && (
              <div className="border-t border-white/5 pt-2">
                <span className="text-rose-400 font-bold uppercase tracking-wider text-[9px] block">Substitution Reason</span>
                <span className="text-gray-300 text-xs italic leading-normal">{item.substitution_reason}</span>
              </div>
            )}
          </div>
        </Accordion>

        <Accordion
          title="Tone Intent & Reasoning"
          isOpen={!!openSections.intent}
          onToggle={() => toggleSection("intent")}
          badge={intentBadge}
        >
          <div className="space-y-3">
            {item.tone_adjustment_intent && Object.keys(item.tone_adjustment_intent).length > 0 && (
              <div className="rounded-xl border border-cyan-500/10 p-3 bg-cyan-950/10">
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
              <div className="rounded-xl border border-emerald-500/10 p-3 bg-emerald-950/10">
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
              <div className="rounded-xl border border-red-500/10 p-3 bg-red-950/10">
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

            {(!item.tone_adjustment_intent || Object.keys(item.tone_adjustment_intent).length === 0) &&
             (!item.mapped_intent || item.mapped_intent.length === 0) &&
             (!item.dropped_intent || item.dropped_intent.length === 0) && (
              <p className="text-xs text-gray-400 font-mono">No direct semantic intents were resolved for this specific slot.</p>
            )}
          </div>
        </Accordion>

        <Accordion
          title="Raw Diagnostic JSON"
          isOpen={!!openSections.raw}
          onToggle={() => toggleSection("raw")}
        >
          <div className="pt-1">
            <pre className="text-[10px] font-mono bg-black/60 p-3 rounded-xl border border-slate-800 overflow-x-auto text-slate-300 max-h-96">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        </Accordion>
      </div>
    </div>
  );
};

interface AccordionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({ title, isOpen, onToggle, badge, children }) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#070a13]/60 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-xs font-semibold font-mono text-slate-300 hover:bg-slate-800/20 transition-all text-left uppercase tracking-wider select-none"
      >
        <div className="flex items-center gap-3">
          <span>{title}</span>
          {badge}
        </div>
        <span className="text-slate-400 font-mono text-xs">
          {isOpen ? "▲ Collapse" : "▼ Expand"}
        </span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-800/40 bg-black/10 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

export const AT5SignalChainView: React.FC<Props> = ({ 
  debugData, 
  onJumpToCatalogue,
  rawRequest,
  toneResult
}) => {
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
  const [selectedIndex, setSelectedIndex] = useState<number | "summary">("summary");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    settings: true,
    verification: false,
    profile: false,
    intent: false,
    raw: false,
  });

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

  const hasIssue = (item: ExportDebugItem) => {
    const isPass = item.final_status === "PASS";
    const isSkipped = item.final_status === "SKIPPED";
    return (!isPass && !isSkipped) || item.substitution_used || item.fallback_applied;
  };

  // Keep track of indices that should be shown / navigated
  const visibleIndices = useMemo(() => {
    return sortedItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        if (!issuesOnly) return true;
        return hasIssue(item);
      })
      .map(({ index }) => index);
  }, [sortedItems, issuesOnly]);

  const currentPosition = typeof selectedIndex === "number" ? visibleIndices.indexOf(selectedIndex) : -1;
  const prevIdx = currentPosition > 0 ? visibleIndices[currentPosition - 1] : null;
  const nextIdx = currentPosition !== -1 && currentPosition < visibleIndices.length - 1 ? visibleIndices[currentPosition + 1] : null;

  // Auto-open sections containing issues when selected gear changes
  React.useEffect(() => {
    if (selectedIndex === "summary") return;
    const item = sortedItems[selectedIndex];
    if (!item) return;

    const hasVerificationIssue = (item.parameter_mapping_status && item.parameter_mapping_status !== "SUCCESS") || (item.mismatched_parameters && item.mismatched_parameters.length > 0);
    const hasProfileIssue = !!(item.substitution_used || item.fallback_applied);
    const hasIntentIssue = !!(item.dropped_intent && item.dropped_intent.length > 0);

    setOpenSections({
      settings: true,
      verification: !!hasVerificationIssue,
      profile: !!hasProfileIssue,
      intent: !!hasIntentIssue,
      raw: false,
    });
  }, [selectedIndex, sortedItems]);

  const substitutions = useMemo(() => {
    return sortedItems.filter(item => item.substitution_used || item.fallback_applied);
  }, [sortedItems]);

  const itemsWithIssues = useMemo(() => {
    return sortedItems.filter(item => hasIssue(item));
  }, [sortedItems]);

  const allMappedIntents = useMemo(() => {
    const list: { gearName: string; intent: string; mapped_to: string; settings?: Record<string, any> }[] = [];
    sortedItems.forEach(item => {
      const displayName = item.substitution_used || item.fallback_applied
        ? item.original_requested_gear_name || item.requested_gear_name || item.original_name
        : item.normalized_name;
      if (item.mapped_intent && item.mapped_intent.length > 0) {
        item.mapped_intent.forEach((mi: any) => {
          list.push({
            gearName: displayName,
            intent: mi.intent,
            mapped_to: mi.mapped_to,
            settings: mi.settings
          });
        });
      }
    });
    return list;
  }, [sortedItems]);

  const allDroppedIntents = useMemo(() => {
    const list: { gearName: string; intent: string; reason: string }[] = [];
    sortedItems.forEach(item => {
      const displayName = item.substitution_used || item.fallback_applied
        ? item.original_requested_gear_name || item.requested_gear_name || item.original_name
        : item.normalized_name;
      if (item.dropped_intent && item.dropped_intent.length > 0) {
        item.dropped_intent.forEach((di: any) => {
          list.push({
            gearName: displayName,
            intent: di.intent,
            reason: di.reason
          });
        });
      }
    });
    return list;
  }, [sortedItems]);

  return (
    <section
      className="rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-6"
      style={readablePanelStyle}
    >
      {/* SECTION 1: HEADER & STATS BADGES */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              AT5 Export Signal Chain
            </h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400 border border-slate-700/55">
                Total: {stats.totalCount}
              </span>

              {stats.checkCount === 0 && stats.skippedCount === 0 && stats.warningCount === 0 && stats.partialCount === 0 && stats.failCount === 0 && stats.criticalCount === 0 && stats.substitutionCount === 0 ? (
                <span 
                  className="rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border"
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
                    className="rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest border"
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
        </div>
        <p className="text-sm" style={readableMutedStyle}>
          Visual view of the actual exported AmpliTube chain.
        </p>
      </div>

      {/* SECTION 2: HORIZONTAL SIGNAL CHAIN SELECTOR */}
      <div className="space-y-3 bg-[#090c15] p-4 rounded-2xl border border-slate-800/80">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-slate-400">
            Signal Chain Navigator
          </span>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={issuesOnly}
              onChange={(e) => {
                setIssuesOnly(e.target.checked);
                if (e.target.checked && typeof selectedIndex === "number") {
                  const currentItem = sortedItems[selectedIndex];
                  if (currentItem && !hasIssue(currentItem)) {
                    setSelectedIndex("summary");
                  }
                }
              }}
              className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/50"
            />
            <span className="text-xs font-mono font-semibold text-slate-300">
              Show Issues Only
            </span>
          </label>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {/* Signal Chain Summary Link */}
          <button
            onClick={() => setSelectedIndex("summary")}
            className={`flex items-center gap-3.5 p-3.5 rounded-xl border text-left min-w-[210px] transition-all shrink-0 select-none cursor-pointer ${
              selectedIndex === "summary"
                ? "bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30"
                : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <div className="p-2 rounded-lg bg-black/40 border border-white/5 shrink-0">
              <Link2 
                className="w-5 h-5 transition-all duration-300"
                style={{
                  color: selectedIndex === "summary" ? "#f59e0b" : "#475569",
                  filter: selectedIndex === "summary" ? "drop-shadow(0 0 6px #f59e0b)" : "none"
                }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-mono uppercase tracking-wider font-bold opacity-60">Overview</span>
              <span className="text-xs font-bold font-sans mt-0.5 text-slate-100">Chain Summary</span>
              <span className="text-[9px] font-mono mt-0.5 opacity-80 text-slate-400">
                {stats.totalCount} items
              </span>
            </div>
          </button>

          {/* Individual Gear Items */}
          {sortedItems.map((item, index) => {
            const isVisible = !issuesOnly || hasIssue(item);
            if (!isVisible) return null;

            const isSel = selectedIndex === index;
            const isGlowing = selectedIndex === "summary" || isSel;
            const statusKey = item.final_status || "PASS";
            const styleCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PASS;
            
            const displayName = item.substitution_used || item.fallback_applied
              ? item.original_requested_gear_name || item.requested_gear_name || item.original_name
              : item.normalized_name;

            const hasGearIssue = hasIssue(item);
            const GearIconComponent = getGearIcon(item.type, displayName || item.normalized_name || item.original_name);

            // Custom border and shadow glows for selected card
            let cardBorderClass = "border-slate-800/80 bg-slate-900/60 text-slate-400 hover:bg-slate-800/50 hover:border-slate-700 hover:text-slate-200";
            let cardStyle: React.CSSProperties = {};
            
            if (isSel) {
              cardBorderClass = "bg-slate-800/80 text-slate-100 ring-1";
              cardStyle = {
                borderColor: styleCfg.solid,
                boxShadow: `0 0 15px ${styleCfg.clearBg}`,
              };
            } else if (hasGearIssue) {
              cardBorderClass = "bg-red-950/10 border-red-900/30 text-rose-300 hover:bg-red-950/20 hover:border-red-900/50";
            }

            return (
              <button
                key={`${item.slot_section}-${item.slot_index}-${index}`}
                onClick={() => setSelectedIndex(index)}
                className={`flex items-center gap-3.5 p-3.5 rounded-xl border text-left min-w-[210px] max-w-[260px] transition-all shrink-0 select-none cursor-pointer ${cardBorderClass}`}
                style={cardStyle}
              >
                {/* Gear Icon with dynamic glowing state */}
                <div className="p-2 rounded-lg bg-black/40 border border-white/5 shrink-0">
                  <GearIconComponent 
                    className="w-5 h-5 transition-all duration-300"
                    style={{
                      color: isGlowing ? styleCfg.solid : "#475569",
                      filter: isGlowing ? `drop-shadow(0 0 6px ${styleCfg.solid})` : "none"
                    }}
                  />
                </div>

                <div className="flex flex-col min-w-0 w-full">
                  <div className="w-full flex items-center justify-between gap-1.5">
                    <span className="text-[8px] font-mono uppercase tracking-wider font-bold opacity-60 truncate">
                      {item.slot_section} {item.slot_index >= 0 ? `#${item.slot_index}` : ""}
                    </span>
                    <span
                      className="text-[7.5px] font-mono font-bold uppercase tracking-tighter px-1 rounded-sm shrink-0 border"
                      style={{
                        color: styleCfg.solid,
                        backgroundColor: styleCfg.clearBg,
                        borderColor: styleCfg.clearBorder,
                      }}
                    >
                      {statusKey}
                    </span>
                  </div>

                  <span className="text-xs font-bold font-sans mt-0.5 truncate text-slate-100 font-medium" title={displayName}>
                    {displayName}
                  </span>

                  <div className="w-full mt-0.5 flex items-center justify-between text-[9px] font-mono opacity-80">
                    <span className="truncate text-slate-400">{item.type}</span>
                    {(item.substitution_used || item.fallback_applied) && (
                      <span className="text-rose-400 font-bold text-[7px] uppercase px-1 bg-rose-500/15 rounded-sm border border-rose-500/20 shrink-0 tracking-tighter">
                        SUB
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: QUICK REVIEW NAVIGATION CONTROLS */}
      {selectedIndex !== "summary" && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/30 p-3 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setSelectedIndex("summary")}
            className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-all bg-slate-800/40 text-slate-300 border-slate-700/50 hover:bg-slate-800 hover:text-white"
          >
            ← Back to Chain Summary
          </button>
          
          <div className="flex items-center gap-2">
            <button
              disabled={prevIdx === null}
              onClick={() => {
                if (prevIdx !== null) setSelectedIndex(prevIdx);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-20 disabled:pointer-events-none transition-all select-none"
            >
              ◀ Previous Gear
            </button>
            <button
              disabled={nextIdx === null}
              onClick={() => {
                if (nextIdx !== null) setSelectedIndex(nextIdx);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-20 disabled:pointer-events-none transition-all select-none"
            >
              Next Gear ▶
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: SELECTED DETAIL CARD OR SIGNAL CHAIN SUMMARY PANEL */}
      {selectedIndex === "summary" ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Summary Actions and XML description info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-800">
            <div className="space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Overall Export Summary</p>
              <div className="text-sm font-semibold">
                {stats.criticalCount > 0 || stats.failCount > 0 ? (
                  <span className="text-red-400 font-bold uppercase tracking-wide">⚠️ Critical Issues Detected</span>
                ) : stats.warningCount > 0 || stats.partialCount > 0 ? (
                  <span className="text-amber-400 font-bold uppercase tracking-wide">⚠ Completed With Warnings</span>
                ) : (
                  <span className="text-emerald-400 font-bold uppercase tracking-wide">✓ Perfect Translation Match</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono uppercase tracking-widest bg-slate-950/40 px-2.5 py-1 rounded border border-white/5 inline-block">
                {debugData.exported_xml_summary}
              </p>
            </div>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap gap-2 items-center justify-start md:justify-end">
              <button
                type="button"
                onClick={copyJson}
                className={`rounded-xl px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border transition-all shadow-lg active:scale-95 ${
                  copied
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                    : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                }`}
              >
                {copied ? "Debug JSON copied." : "Copy Debug JSON"}
              </button>

              <button
                type="button"
                onClick={exportJson}
                className="rounded-xl bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border border-white/10 transition-all shadow-lg active:scale-95 text-white"
              >
                Export Debug JSON
              </button>
            </div>
          </div>

          {/* TT Tone Profile Engine details & Taxonomical Reasoning Log */}
          {toneResult?.tone_profile_result && (
            <ToneProfileView 
              profileResult={toneResult.tone_profile_result} 
              rawRequest={rawRequest || ""} 
            />
          )}

          {/* Rack / Post-Amp EQ Decision Card */}
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

              <p className="text-xs text-gray-300 mb-3 leading-relaxed font-mono">
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

          {/* Mapped & Dropped Intents Summaries */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-[#070a13]/30 space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              Semantic Translation Summary
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Mapped Intents */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block border-b border-emerald-500/15 pb-1.5">
                  Mapped Intents ({allMappedIntents.length})
                </span>
                {allMappedIntents.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {allMappedIntents.map((mi, idx) => (
                      <div key={idx} className="bg-black/30 p-2.5 rounded-xl border border-white/5 text-xs font-mono leading-relaxed">
                        <div className="flex justify-between font-bold text-slate-300">
                          <span>{mi.intent}</span>
                          <span className="text-emerald-400 font-semibold">→ {mi.mapped_to}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Gear: <strong className="text-slate-300">{mi.gearName}</strong>
                        </div>
                        {mi.settings && (
                          <div className="text-[9px] text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-0.5 border-t border-white/5 pt-1">
                            {Object.entries(mi.settings).map(([k, v]) => (
                              <span key={k}>{k}: <strong className="text-white">{String(v)}</strong></span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-mono italic">No mapped semantic intents resolved across this preset chain.</p>
                )}
              </div>

              {/* Dropped Intents */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest block border-b border-rose-500/15 pb-1.5">
                  Dropped Intents ({allDroppedIntents.length})
                </span>
                {allDroppedIntents.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {allDroppedIntents.map((di, idx) => (
                      <div key={idx} className="bg-black/30 p-2.5 rounded-xl border border-rose-500/15 text-xs font-mono leading-relaxed">
                        <div className="flex justify-between font-bold text-rose-300">
                          <span>{di.intent}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Gear: <strong className="text-slate-300">{di.gearName}</strong>
                        </div>
                        <div className="text-[10px] text-red-300/80 italic mt-1 font-sans">
                          {di.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-400 font-mono">✓ Zero dropped intents. All requested acoustic goals were successfully translated.</p>
                )}
              </div>
            </div>
          </div>

          {/* Substitutions & Fallbacks Summary */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-[#070a13]/30 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400">
              Substitutions & Fallback Log ({substitutions.length})
            </h4>
            {substitutions.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {substitutions.map((item, idx) => {
                  const displayName = item.original_requested_gear_name || item.requested_gear_name || item.original_name;
                  const exportedName = item.actual_exported_gear_name || item.fallback_exported_gear_name || "None";
                  return (
                    <div key={idx} className="p-3 rounded-lg bg-red-950/5 border border-red-900/15 text-xs font-mono flex flex-col md:flex-row md:items-center justify-between gap-2 leading-relaxed">
                      <div>
                        <span className="text-slate-500">Requested:</span> <strong className="text-white">"{displayName}"</strong>
                        <span className="text-slate-500 mx-2">→</span>
                        <span className="text-slate-500">Substituted:</span> <strong className="text-rose-400">"{exportedName}"</strong>
                      </div>
                      <span className="text-slate-400 italic text-[11px]">{item.substitution_reason || item.fallback_reason || "Missing verified GUID mapping"}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-emerald-400 font-mono">
                ✓ Zero substitutions or fallback gears were applied. All active hardware models were fully verified in the catalog.
              </p>
            )}
          </div>

          {/* Critical / Warning Summary */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-[#070a13]/30 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Verification & Compliance Issues ({itemsWithIssues.length})
            </h4>
            {itemsWithIssues.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 font-mono">
                {itemsWithIssues.map((item, idx) => {
                  const statusKey = item.final_status || "PASS";
                  const styleCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PASS;
                  return (
                    <div key={idx} className="p-3 rounded-lg bg-amber-950/5 border border-amber-900/15 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <strong className="text-slate-200">"{item.original_name}" ({item.slot_section})</strong>
                        <span
                          className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider"
                          style={{
                            color: styleCfg.solid,
                            backgroundColor: styleCfg.clearBg,
                            borderColor: styleCfg.clearBorder,
                            borderWidth: "1px"
                          }}
                        >
                          {statusKey}
                        </span>
                      </div>
                      <p className="text-gray-400 text-[11px] leading-relaxed">
                        <span className="text-slate-600 font-semibold uppercase text-[9px] mr-1">Reason:</span>{item.reason}
                      </p>
                      {item.suggested_action && (
                        <p className="text-amber-400 text-[10px] bg-amber-500/5 p-1 rounded mt-1 border border-amber-500/10">
                          <span className="font-bold">Suggested:</span> {item.suggested_action}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-emerald-400 font-mono">
                ✓ No verification warnings, parameter mismatches, or critical blocks across the exported signal chain.
              </p>
            )}
          </div>

          {/* Optional Engineering Strategy section if data exists */}
          {(toneResult?.engineering_notes || (debugData as any).engineering_notes) && (
            <div className="rounded-2xl border border-slate-800 p-5 bg-white/[0.01] shadow-md space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                Engineering Strategy
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                {(toneResult?.engineering_notes?.gain_strategy || (debugData as any).engineering_notes?.gain_strategy) && (
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Gain Strategy</p>
                    <p className="text-gray-300 italic">{(toneResult?.engineering_notes?.gain_strategy || (debugData as any).engineering_notes?.gain_strategy)}</p>
                  </div>
                )}
                {(toneResult?.engineering_notes?.noise_control || (debugData as any).engineering_notes?.noise_control) && (
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Noise Control</p>
                    <p className="text-gray-300 italic">{(toneResult?.engineering_notes?.noise_control || (debugData as any).engineering_notes?.noise_control)}</p>
                  </div>
                )}
                {(toneResult?.engineering_notes?.eq_strategy || (debugData as any).engineering_notes?.eq_strategy) && (
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">EQ Strategy</p>
                    <p className="text-gray-300 italic">{(toneResult?.engineering_notes?.eq_strategy || (debugData as any).engineering_notes?.eq_strategy)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
 
          {/* Optional Amplifier Selection & Calibration Engine if data exists */}
          {(toneResult?.engineering_notes?.amplifier_debug || (debugData as any).engineering_notes?.amplifier_debug) && (
            <div className="rounded-2xl border border-cyan-500/10 p-5 bg-[#090d16]/30 shadow-md font-mono text-xs">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-3">
                Amplifier Selection & Calibration Engine (TT-02 Reference)
              </h4>
              <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                {(toneResult?.engineering_notes?.amplifier_debug || (debugData as any).engineering_notes?.amplifier_debug)}
              </p>
            </div>
          )}
 
          {/* Optional Profile Engine / Resolution Summary section if data exists */}
          {(toneResult?.tone_profile_result || (debugData as any).tone_profile_result) && (
            <div className="rounded-2xl border border-slate-800 p-5 bg-[#0a0e17]/40 shadow-md space-y-4">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
                Profile Engine & Resolution Summary
              </h4>
              <div className="font-mono text-xs text-gray-300">
                <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-60 bg-black/30 p-3 rounded-xl border border-white/5">
                  {JSON.stringify((toneResult?.tone_profile_result || (debugData as any).tone_profile_result), null, 2)}
                </pre>
              </div>
            </div>
          )}
 
          {/* Routing Context */}
          <div
            className="rounded-2xl border border-dashed border-slate-800 p-6 text-sm italic"
            style={readableCardStyle}
          >
            <p className="text-gray-500 mb-2 font-mono text-[10px] uppercase tracking-widest">Routing Context</p>
            Input/Output and Room micro-environments are part of the global AT5 preset wrapper. 
            Room and mic details are shown within the CabA card under Exported XML settings.
          </div>

          {/* Advanced Debug Section (Collapsible Raw Data) */}
          {toneResult && (
            <div className="border-t border-slate-800 pt-6">
              <Accordion
                title="Advanced Debug / Raw Gemini Tone Plan"
                isOpen={!!openSections.advancedDebug}
                onToggle={() => setOpenSections(prev => ({ ...prev, advancedDebug: !prev.advancedDebug }))}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.25em] flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      RAW GEMINI TONE PLAN
                    </h5>
                  </div>
                  <pre style={{ color: "#4ade80", fontSize: "11px" }} className="bg-black/80 p-6 rounded-2xl border border-white/5 font-mono overflow-auto max-h-[600px] shadow-2xl">
                    {JSON.stringify(toneResult, null, 2)}
                  </pre>
                </div>
              </Accordion>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <SelectedGearDetailPanel
            item={sortedItems[selectedIndex]}
            onJumpToCatalogue={onJumpToCatalogue}
            openSections={openSections}
            setOpenSections={setOpenSections}
          />
        </div>
      )}
    </section>
  );
};

export default AT5SignalChainView;
