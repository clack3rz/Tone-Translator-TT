import React, { useState, useEffect, useMemo } from 'react';
import { 
  MicPlacementMapping, 
  GearProfile,
  SemanticOrientation,
  VALID_SEMANTIC_ORIENTATIONS
} from '../types';
import { 
  VIR_CALIBRATION_COORDINATES, 
  VIR_REFERENCE_CABINETS, 
  VIR_REFERENCE_MICS, 
  resolveCompositeMicPlacement,
  isVIRReferenceCabinet,
  isVIRReferenceMic,
  parseSemanticPlacement,
  composeVIRCoordinates,
  SemanticPosition,
  SemanticDistance,
  SemanticAngle,
  PlacementResolutionResult,
  VIRCoordinates,
  getVIRCalibrationCoordinates,
  getVIRCalibrationOverrides,
  setVIRCalibrationOverrides,
  resetVIRCalibrationOverrides,
  VIRReferenceOverrides,
  getEffectiveMappingOrientation,
  VIR_REFERENCE_GRID_KEYS,
  CARDINAL_ORIENTATION_CLOCK,
  CARDINAL_ORIENTATION_LABELS,
  formatSemanticOrientation
} from '../services/at5MicPlacementService';
import { at5DatabaseService } from '../services/at5DatabaseService';
import { setDbMicPlacementMappings, ensureMicPlacementDataLoaded } from '../services/at5ParameterManifest';
import { 
  Sliders, 
  CheckCircle2, 
  Check,
  Mic,
  AlertTriangle, 
  Info, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  RefreshCw, 
  Sparkles,
  HelpCircle,
  Layers,
  Crosshair,
  Compass,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  Lock,
  Loader2,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Filter
} from 'lucide-react';

export const CANONICAL_POSITION_ORDER: SemanticPosition[] = ['Cap', 'Cap Edge', 'Cone', 'Cone Edge'];
export const CANONICAL_ORIENTATION_ORDER: SemanticOrientation[] = ['N', 'E', 'S', 'W'];
export const CANONICAL_DISTANCE_ORDER: SemanticDistance[] = ['Close', 'Medium', 'Far'];
export const CANONICAL_ANGLE_ORDER: SemanticAngle[] = ['On Axis', '45° Off Axis'];

export interface CanonicalNumericCoordinates {
  orientation: string;
  xAxis: number;
  yAxis: number;
  distance: number;
  angle: number;
  speaker: number;
}

export function getCanonicalNumericValues(m: MicPlacementMapping): CanonicalNumericCoordinates {
  const xml = m.maps_to || m.xml_values || {};
  const slotKey = (m.friendly_setting || m.target || 'Mic_0_Placement').toLowerCase();
  const isSlot1 = slotKey.includes('mic1') || slotKey.includes('mic2') || m.micIndex === 1 || m.micSlot === 'Mic_1' || m.micSlot === 'Mic_2';
  const prefix = isSlot1 ? 'Mic1' : 'Mic0';

  const effectiveOrient = getEffectiveMappingOrientation(m);
  const orientStr = effectiveOrient ? formatSemanticOrientation(effectiveOrient) : '—';

  const rawX = xml[`${prefix}XAxis`] ?? xml.XAxis ?? 0;
  const rawY = xml[`${prefix}YAxis`] ?? xml.YAxis ?? 0;
  const rawDist = xml[`${prefix}Distance`] ?? xml.Distance ?? 0;
  const rawAng = xml[`${prefix}Angle`] ?? xml.Angle ?? 0;
  const rawSpk = xml[`${prefix}Speaker`] ?? xml.Speaker ?? (isSlot1 ? 1 : 0);

  return {
    orientation: orientStr,
    xAxis: Number(rawX) || 0,
    yAxis: Number(rawY) || 0,
    distance: Number(rawDist) || 0,
    angle: Number(rawAng) || 0,
    speaker: Number(rawSpk) || 0
  };
}

export function extractPlacementSemanticAttributes(m: MicPlacementMapping): {
  position: SemanticPosition;
  orientation?: SemanticOrientation;
  distance: SemanticDistance;
  angle: SemanticAngle;
} {
  const parsed = parseSemanticPlacement(m.friendly_value || m.friendly_name || m.canonicalPlacementName || '');
  const position = (m.friendlyPlacement || m.friendly_placement || parsed.position || 'Cap Edge') as SemanticPosition;
  const orientation = (position === 'Cap') 
    ? undefined 
    : (getEffectiveMappingOrientation(m) || m.friendlyOrientation || m.friendly_orientation || parsed.orientation || 'W') as SemanticOrientation;
  const distance = (m.friendlyDistance || m.friendly_distance || parsed.distance || 'Close') as SemanticDistance;
  const angle = (m.friendlyAngle || m.friendly_angle || parsed.angle || 'On Axis') as SemanticAngle;

  return { position, orientation, distance, angle };
}

export interface MicPlacementFilterState {
  position: 'All' | SemanticPosition;
  orientation: 'All' | SemanticOrientation;
  distance: 'All' | SemanticDistance;
  angle: 'All' | SemanticAngle;
  status: 'All' | 'verified' | 'needs_review';
  search: string;
}

export function filterAndSortMicPlacements(
  mappings: MicPlacementMapping[],
  filter: MicPlacementFilterState
): MicPlacementMapping[] {
  const filtered = mappings.filter(m => {
    const attrs = extractPlacementSemanticAttributes(m);

    // Position filter
    if (filter.position !== 'All' && attrs.position !== filter.position) {
      return false;
    }

    // Orientation filter (Cap is orientationless center)
    if (filter.orientation !== 'All') {
      if (attrs.position === 'Cap') {
        return false;
      }
      if (attrs.orientation !== filter.orientation) {
        return false;
      }
    }

    // Distance filter
    if (filter.distance !== 'All' && attrs.distance !== filter.distance) {
      return false;
    }

    // Angle filter
    if (filter.angle !== 'All' && attrs.angle !== filter.angle) {
      return false;
    }

    // Status filter
    if (filter.status !== 'All') {
      const isVerified = (m.status as string) === 'validated' || (m.status as string) === 'at5p_validated' || m.validationStatus === 'validated' || m.validationStatus === 'at5p_validated';
      if (filter.status === 'verified' && !isVerified) return false;
      if (filter.status === 'needs_review' && isVerified) return false;
    }

    // Search filter
    if (filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      const label = (m.friendly_value || m.friendly_name || m.canonicalPlacementName || '').toLowerCase();
      const notes = (m.notes || '').toLowerCase();
      const micModel = (m.micModelName || '').toLowerCase();
      const speakerModel = (m.speakerModelName || '').toLowerCase();
      const slot = (m.friendly_setting || m.target || '').toLowerCase();
      if (!label.includes(q) && !notes.includes(q) && !micModel.includes(q) && !speakerModel.includes(q) && !slot.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Sort within position groups
  return filtered.sort((a, b) => {
    const aAttr = extractPlacementSemanticAttributes(a);
    const bAttr = extractPlacementSemanticAttributes(b);

    // Primary: Position order (Cap -> Cap Edge -> Cone -> Cone Edge)
    const posAIdx = CANONICAL_POSITION_ORDER.indexOf(aAttr.position);
    const posBIdx = CANONICAL_POSITION_ORDER.indexOf(bAttr.position);
    if (posAIdx !== posBIdx) {
      return (posAIdx === -1 ? 99 : posAIdx) - (posBIdx === -1 ? 99 : posBIdx);
    }

    // Within position:
    // If not Cap, sort by Orientation: N -> E -> S -> W
    if (aAttr.position !== 'Cap' && bAttr.position !== 'Cap') {
      const orientAIdx = aAttr.orientation ? CANONICAL_ORIENTATION_ORDER.indexOf(aAttr.orientation) : 99;
      const orientBIdx = bAttr.orientation ? CANONICAL_ORIENTATION_ORDER.indexOf(bAttr.orientation) : 99;
      if (orientAIdx !== orientBIdx) {
        return orientAIdx - orientBIdx;
      }
    }

    // Next: Distance (Close -> Medium -> Far)
    const distAIdx = CANONICAL_DISTANCE_ORDER.indexOf(aAttr.distance);
    const distBIdx = CANONICAL_DISTANCE_ORDER.indexOf(bAttr.distance);
    if (distAIdx !== distBIdx) {
      return (distAIdx === -1 ? 99 : distAIdx) - (distBIdx === -1 ? 99 : distBIdx);
    }

    // Next: Angle (On Axis -> 45° Off Axis)
    const angAIdx = CANONICAL_ANGLE_ORDER.indexOf(aAttr.angle);
    const angBIdx = CANONICAL_ANGLE_ORDER.indexOf(bAttr.angle);
    if (angAIdx !== angBIdx) {
      return (angAIdx === -1 ? 99 : angAIdx) - (angBIdx === -1 ? 99 : angBIdx);
    }

    return 0;
  });
}

export function groupPlacementsByPosition(
  mappings: MicPlacementMapping[]
): Record<SemanticPosition, MicPlacementMapping[]> {
  const groups: Record<SemanticPosition, MicPlacementMapping[]> = {
    'Cap': [],
    'Cap Edge': [],
    'Cone': [],
    'Cone Edge': []
  };

  for (const m of mappings) {
    const attrs = extractPlacementSemanticAttributes(m);
    if (groups[attrs.position]) {
      groups[attrs.position].push(m);
    } else {
      groups['Cap Edge'].push(m);
    }
  }

  return groups;
}

// Subcomponent: Compact Precedence & Architecture Header
const CompactArchitectureHeader: React.FC<{
  cabName: string;
  cabGuid: string;
  isReferenceCab: boolean;
  cabProfile?: GearProfile | null;
  cabProfiles?: GearProfile[];
  onSelectCabProfile?: (cab: GearProfile) => void;
  isLoadingMappings: boolean;
  onRefresh: () => void;
}> = ({
  cabName,
  cabGuid,
  isReferenceCab,
  cabProfile,
  cabProfiles,
  onSelectCabProfile,
  isLoadingMappings,
  onRefresh
}) => {
  const [showTierDetails, setShowTierDetails] = useState(false);

  return (
    <div className="bg-[#111116] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Active Cabinet context */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Crosshair className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-sm sm:text-base font-bold font-display text-white tracking-tight uppercase">
              AT5 VIR Cabinet Mic Placement
            </h3>
            <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
              · Semantic 3D Coordinate Calibration & Precedence Resolver
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap text-xs font-mono pt-0.5">
            <span className="text-gray-500 uppercase font-bold text-[10px]">Active Cabinet:</span>
            {cabProfiles && cabProfiles.length > 0 && onSelectCabProfile ? (
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={cabProfile?.id || cabProfile?.guid || ''}
                  onChange={(e) => {
                    const selected = cabProfiles.find(c => (c.id === e.target.value) || (c.guid === e.target.value));
                    if (selected) {
                      onSelectCabProfile(selected);
                    }
                  }}
                  className="bg-[#181820] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-bold rounded-lg px-2.5 py-1 outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
                >
                  {cabProfiles.map(cab => (
                    <option key={cab.id || cab.guid} value={cab.id || cab.guid} className="bg-[#18181f] text-white">
                      {cab.displayName}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500 truncate max-w-[200px]" title={cabGuid}>
                  ({cabGuid})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{cabName}</span>
                <span className="text-[10px] text-gray-500 truncate max-w-[200px]" title={cabGuid}>
                  ({cabGuid})
                </span>
              </div>
            )}

            {/* Reference / Scope Badge */}
            <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 shrink-0 ${
              isReferenceCab 
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
            }`}>
              {isReferenceCab ? (
                <>
                  <ShieldCheck className="w-3 h-3" />
                  <span>Reference Cabinet · Built-in VIR calibration active</span>
                </>
              ) : (
                <>
                  <Info className="w-3 h-3" />
                  <span>Non-Reference Model · Custom Scope Enforced</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Compact Refresh & Info toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowTierDetails(!showTierDetails)}
            className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-[10px] font-mono uppercase rounded-lg transition-all flex items-center gap-1.5"
            title="Toggle Precedence Tier Descriptions"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showTierDetails ? 'Hide Tiers' : 'Tier Details'}</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={isLoadingMappings}
            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg transition-all"
            title="Refresh database mappings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMappings ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Horizontal Precedence Strip */}
      <div className="pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] font-mono">
          <span className="text-gray-500 uppercase font-bold text-[9px] mr-1">Resolver Flow:</span>
          
          <div 
            className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1"
            title="Tier 1: Exact verified Firestore mapping for cabinet + mic slot."
          >
            <span>Tier 1: FIRESTORE</span>
            <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400">Exact</span>
          </div>

          <span className="text-gray-600 font-bold">→</span>

          <div 
            className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold flex items-center gap-1"
            title="Tier 2: Verified on 4x12 Brit 8000 + Dynamic 57. Mic 1 is a calibration gap."
          >
            <span>Tier 2: VIR REFERENCE</span>
            <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-400">Calibrated</span>
          </div>

          <span className="text-gray-600 font-bold">→</span>

          <div 
            className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold flex items-center gap-1"
            title="Tier 3: Estimated/discovered mapping in Firestore requiring review."
          >
            <span>Tier 3: ESTIMATED</span>
            <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400">Needs Review</span>
          </div>

          <span className="text-gray-600 font-bold">→</span>

          <div 
            className="px-2 py-0.5 rounded bg-gray-800/60 border border-white/10 text-gray-300 font-bold flex items-center gap-1"
            title="Tier 4: Safe coordinates (0) with warning. Never silent contamination."
          >
            <span>Tier 4: SAFE DEFAULT</span>
            <span className="text-[8px] px-1 py-0.2 rounded bg-gray-700/60 text-gray-400">Fallback</span>
          </div>
        </div>

        {/* Expandable Tier Explanations */}
        {showTierDetails && (
          <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono animate-in fade-in duration-150">
            <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase block">Tier 1: Firestore Exact</span>
              <p className="text-[11px] text-gray-300">Exact verified Firestore mapping for cabinet + mic slot.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1">
              <span className="text-[10px] font-bold text-cyan-400 uppercase block">Tier 2: VIR Reference Calibrated</span>
              <p className="text-[11px] text-gray-300">Verified on 4x12 Brit 8000 + Dynamic 57. Mic 1 is a calibration gap.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase block">Tier 3: Estimated Profile</span>
              <p className="text-[11px] text-gray-300">Estimated/discovered mapping in Firestore requiring review.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-800/40 border border-white/10 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Tier 4: Safe Default</span>
              <p className="text-[11px] text-gray-400">Safe coordinates (0) with warning. Never silent contamination.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Subcomponent: Compact Position Table with Canonical Column Order
// Canonical Sequence: Orientation | Range | Angle | XAxis | YAxis | AT5 Distance | Speaker | Status | Actions
const CompactPositionTable: React.FC<{
  items: MicPlacementMapping[];
  onEdit: (m: MicPlacementMapping) => void;
  onDelete: (m: MicPlacementMapping) => void;
}> = ({ items, onEdit, onDelete }) => {
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="py-3.5 px-4 text-center text-xs font-mono text-gray-500">
        No profiles match current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left font-mono text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#23293a] bg-[#161a25]/60 text-[10px] uppercase tracking-wider text-gray-400 select-none">
            <th className="py-2 px-3 font-semibold">Orientation</th>
            <th className="py-2 px-2.5 font-semibold">Range</th>
            <th className="py-2 px-2.5 font-semibold">Angle</th>
            <th className="py-2 px-2.5 font-semibold">XAxis</th>
            <th className="py-2 px-2.5 font-semibold">YAxis</th>
            <th className="py-2 px-2.5 font-semibold">AT5 Distance</th>
            <th className="py-2 px-2.5 font-semibold text-center">Speaker</th>
            <th className="py-2 px-3 font-semibold text-center">Status</th>
            <th className="py-2 px-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e2330]/50">
          {items.map(m => {
            const id = m.id || m.firestoreDocumentId || `${m.friendly_value}_${m.friendly_setting}`;
            const canonical = getCanonicalNumericValues(m);
            const attrs = extractPlacementSemanticAttributes(m);
            const status = m.status || m.validationStatus || 'needs_review';
            const isVerified = (status as string) === 'validated' || (status as string) === 'at5p_validated';
            const isNotesOpen = expandedNotesId === id;

            return (
              <React.Fragment key={id}>
                <tr className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-2 px-3 font-bold text-gray-200 whitespace-nowrap">
                    {attrs.position === 'Cap' ? (
                      <span className="text-gray-400 font-normal">Center (—)</span>
                    ) : (
                      <span>{canonical.orientation}</span>
                    )}
                  </td>
                  <td className="py-2 px-2.5 text-gray-300 whitespace-nowrap">{attrs.distance}</td>
                  <td className="py-2 px-2.5 text-gray-300 whitespace-nowrap">{attrs.angle}</td>
                  <td className="py-2 px-2.5 text-white font-medium whitespace-nowrap">{canonical.xAxis}</td>
                  <td className="py-2 px-2.5 text-white font-medium whitespace-nowrap">{canonical.yAxis}</td>
                  <td className="py-2 px-2.5 text-gray-300 whitespace-nowrap">{canonical.distance}</td>
                  <td className="py-2 px-2.5 text-center text-gray-300 whitespace-nowrap">{canonical.speaker}</td>
                  <td className="py-2 px-3 text-center whitespace-nowrap">
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        <Check className="w-3 h-3 text-emerald-400" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        Needs Review
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {m.notes && (
                        <button
                          type="button"
                          onClick={() => setExpandedNotesId(isNotesOpen ? null : id)}
                          title={isNotesOpen ? "Hide notes" : "Show notes"}
                          className={`p-1 rounded transition-colors ${isNotesOpen ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEdit(m)}
                        title="Edit placement profile"
                        className="p-1 text-gray-400 hover:text-cyan-400 hover:bg-white/5 rounded transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(m)}
                        title="Delete placement profile"
                        className="p-1 text-gray-400 hover:text-rose-400 hover:bg-white/5 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {isNotesOpen && m.notes && (
                  <tr className="bg-[#12151e]/80 border-b border-[#1e2330]">
                    <td colSpan={9} className="py-2 px-4 text-[11px] text-gray-300 font-mono">
                      <span className="text-gray-500 uppercase font-bold text-[9px] mr-2">Notes:</span>
                      {m.notes}
                      <span className="text-gray-600 ml-3 text-[10px]">· Doc ID: {m.firestoreDocumentId || m.id || 'N/A'}</span>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Subcomponent: Mic Progress Donut Chart (lightweight SVG, zero external chart dependency)
const MicProgressDonut: React.FC<{
  total: number;
  verified: number;
  needsReview: number;
  accentColor: 'cyan' | 'purple';
}> = ({ total, verified, needsReview }) => {
  const size = 80;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Fractions calculated strictly from actual data
  const verifiedFraction = total > 0 ? verified / total : 0;
  const needsReviewFraction = total > 0 ? needsReview / total : 0;

  const verifiedStroke = verifiedFraction * circumference;
  const needsReviewStroke = needsReviewFraction * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1a1f2c"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Verified arc (Green) */}
        {verified > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#10b981"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${verifiedStroke} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
          />
        )}
        {/* Needs Review arc (Amber) */}
        {needsReview > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${needsReviewStroke} ${circumference}`}
            strokeDashoffset={-verifiedStroke}
            strokeLinecap="round"
          />
        )}
      </svg>
      {/* Center count */}
      <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
        <span className="text-base font-bold text-white leading-none">{total}</span>
        <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">Profiles</span>
      </div>
    </div>
  );
};

// Subcomponent: Placement Matrix Overview & Progress Summaries
const PlacementMatrixOverview: React.FC<{
  cabSpecificMappings: MicPlacementMapping[];
  mic0All: MicPlacementMapping[];
  mic0VerifiedCount: number;
  mic0NeedsReviewCount: number;
  mic1All: MicPlacementMapping[];
  mic1VerifiedCount: number;
  mic1NeedsReviewCount: number;
}> = ({
  cabSpecificMappings,
  mic0All,
  mic0VerifiedCount,
  mic0NeedsReviewCount,
  mic1All,
  mic1VerifiedCount,
  mic1NeedsReviewCount
}) => {
  // Matrix data calculation:
  // Cap is orientationless center point (strict semantic rule)
  // Cap Edge, Cone, Cone Edge span N (00:00), E (03:00), S (06:00), W (09:00)
  const matrixData = useMemo(() => {
    const orientations: SemanticOrientation[] = ['N', 'E', 'S', 'W'];

    const parsedMappings = cabSpecificMappings.map(m => {
      const attrs = extractPlacementSemanticAttributes(m);
      const isVerified = (m.status as string) === 'validated' || (m.status as string) === 'at5p_validated' || m.validationStatus === 'validated' || m.validationStatus === 'at5p_validated';
      return {
        mapping: m,
        position: attrs.position,
        orientation: attrs.orientation,
        isVerified
      };
    });

    const capMappings = parsedMappings.filter(p => p.position === 'Cap');
    const capVerified = capMappings.filter(p => p.isVerified).length;
    const capNeedsReview = capMappings.length - capVerified;

    const rowData: Record<SemanticPosition, {
      byOrient: Record<SemanticOrientation, { count: number; verified: number; needsReview: number }>;
      total: number;
    }> = {
      'Cap': {
        byOrient: {
          N: { count: 0, verified: 0, needsReview: 0 },
          E: { count: 0, verified: 0, needsReview: 0 },
          S: { count: 0, verified: 0, needsReview: 0 },
          W: { count: 0, verified: 0, needsReview: 0 }
        },
        total: capMappings.length
      },
      'Cap Edge': {
        byOrient: {
          N: { count: 0, verified: 0, needsReview: 0 },
          E: { count: 0, verified: 0, needsReview: 0 },
          S: { count: 0, verified: 0, needsReview: 0 },
          W: { count: 0, verified: 0, needsReview: 0 }
        },
        total: 0
      },
      'Cone': {
        byOrient: {
          N: { count: 0, verified: 0, needsReview: 0 },
          E: { count: 0, verified: 0, needsReview: 0 },
          S: { count: 0, verified: 0, needsReview: 0 },
          W: { count: 0, verified: 0, needsReview: 0 }
        },
        total: 0
      },
      'Cone Edge': {
        byOrient: {
          N: { count: 0, verified: 0, needsReview: 0 },
          E: { count: 0, verified: 0, needsReview: 0 },
          S: { count: 0, verified: 0, needsReview: 0 },
          W: { count: 0, verified: 0, needsReview: 0 }
        },
        total: 0
      }
    };

    for (const pos of ['Cap Edge', 'Cone', 'Cone Edge'] as SemanticPosition[]) {
      const posItems = parsedMappings.filter(p => p.position === pos);
      rowData[pos].total = posItems.length;
      for (const orient of orientations) {
        const matching = posItems.filter(p => p.orientation === orient);
        const verified = matching.filter(p => p.isVerified).length;
        rowData[pos].byOrient[orient] = {
          count: matching.length,
          verified,
          needsReview: matching.length - verified
        };
      }
    }

    // Column totals for N, E, S, W
    const colTotals: Record<SemanticOrientation, number> = {
      N: rowData['Cap Edge'].byOrient.N.count + rowData['Cone'].byOrient.N.count + rowData['Cone Edge'].byOrient.N.count,
      E: rowData['Cap Edge'].byOrient.E.count + rowData['Cone'].byOrient.E.count + rowData['Cone Edge'].byOrient.E.count,
      S: rowData['Cap Edge'].byOrient.S.count + rowData['Cone'].byOrient.S.count + rowData['Cone Edge'].byOrient.S.count,
      W: rowData['Cap Edge'].byOrient.W.count + rowData['Cone'].byOrient.W.count + rowData['Cone Edge'].byOrient.W.count
    };

    return {
      capMappings,
      capVerified,
      capNeedsReview,
      rowData,
      colTotals,
      grandTotal: parsedMappings.length
    };
  }, [cabSpecificMappings]);

  return (
    <div className="bg-[#13161f] border border-[#1e2330] rounded-xl p-5 space-y-4">
      {/* Header and Legend */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#1e2330]">
        <div>
          <h5 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            Placement Matrix Overview
          </h5>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Registered placement coverage across speaker positions and orientations for this cabinet.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-gray-300">Verified</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-gray-300">Needs Review</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
            <span className="text-gray-400">Unregistered</span>
          </div>
        </div>
      </div>

      {/* Grid: Left Matrix Table, Right Progress Rings */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
        {/* Matrix Table */}
        <div className="xl:col-span-7 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#23293a] bg-[#161a25]/60 text-[10px] uppercase tracking-wider text-gray-400">
                <th className="py-2 px-3 font-semibold">Position</th>
                <th className="py-2 px-2.5 font-semibold text-center">N (00:00)</th>
                <th className="py-2 px-2.5 font-semibold text-center">E (03:00)</th>
                <th className="py-2 px-2.5 font-semibold text-center">S (06:00)</th>
                <th className="py-2 px-2.5 font-semibold text-center">W (09:00)</th>
                <th className="py-2 px-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2330]/60">
              {/* Cap Row - Center / Orientationless rule */}
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="py-2 px-3 font-bold text-gray-200 whitespace-nowrap">Cap (Centre)</td>
                <td colSpan={4} className="py-2 px-3 text-center bg-white/[0.01]">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-gray-400 text-xs">Center Point (Orientationless):</span>
                    {matrixData.capMappings.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-white/5 border border-white/10 text-white">
                        <span className={`w-1.5 h-1.5 rounded-full ${matrixData.capNeedsReview > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                        {matrixData.capMappings.length} Registered
                      </span>
                    ) : (
                      <span className="text-gray-500 italic text-[11px]">0 Registered</span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-3 text-right font-bold text-white whitespace-nowrap">
                  {matrixData.capMappings.length}
                </td>
              </tr>

              {/* Cap Edge, Cone, Cone Edge Rows */}
              {(['Cap Edge', 'Cone', 'Cone Edge'] as const).map(pos => {
                const row = matrixData.rowData[pos];
                return (
                  <tr key={pos} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2 px-3 font-bold text-gray-200 whitespace-nowrap">{pos}</td>
                    {(['N', 'E', 'S', 'W'] as const).map(orient => {
                      const cell = row.byOrient[orient];
                      return (
                        <td key={orient} className="py-2 px-2.5 text-center whitespace-nowrap">
                          {cell.count > 0 ? (
                            <span className="inline-flex items-center gap-1 font-bold text-white">
                              <span className={`w-1.5 h-1.5 rounded-full ${cell.needsReview > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                              {cell.count}
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right font-bold text-white whitespace-nowrap">
                      {row.total}
                    </td>
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="bg-[#161a25]/40 font-bold border-t border-[#23293a]">
                <td className="py-2 px-3 text-gray-300 uppercase text-[11px]">Total</td>
                {(['N', 'E', 'S', 'W'] as const).map(orient => (
                  <td key={orient} className="py-2 px-2.5 text-center text-gray-300">
                    {matrixData.colTotals[orient]}
                  </td>
                ))}
                <td className="py-2 px-3 text-right text-cyan-400">
                  {matrixData.grandTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mic Progress Visualizations */}
        <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* MIC 0 PROGRESS */}
          <div className="bg-[#161a25]/80 border border-[#23293a] rounded-xl p-3.5 space-y-2.5">
            <h6 className="text-[11px] font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" />
              <span>Mic 0 Progress</span>
            </h6>
            <div className="flex items-center gap-3.5">
              <MicProgressDonut
                total={mic0All.length}
                verified={mic0VerifiedCount}
                needsReview={mic0NeedsReviewCount}
                accentColor="cyan"
              />
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                  <span className="font-bold text-white">{mic0VerifiedCount}</span>
                  <span className="text-gray-400 text-[11px]">Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                  <span className="font-bold text-white">{mic0NeedsReviewCount}</span>
                  <span className="text-gray-400 text-[11px]">Needs Review</span>
                </div>
                <div className="flex items-center gap-1.5 pt-0.5 border-t border-white/5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                  <span className="font-bold text-white">{mic0All.length}</span>
                  <span className="text-gray-400 text-[11px]">Registered</span>
                </div>
              </div>
            </div>
          </div>

          {/* MIC 1 PROGRESS */}
          <div className="bg-[#161a25]/80 border border-[#23293a] rounded-xl p-3.5 space-y-2.5">
            <h6 className="text-[11px] font-bold font-mono text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5" />
              <span>Mic 1 Progress</span>
            </h6>
            <div className="flex items-center gap-3.5">
              <MicProgressDonut
                total={mic1All.length}
                verified={mic1VerifiedCount}
                needsReview={mic1NeedsReviewCount}
                accentColor="purple"
              />
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                  <span className="font-bold text-white">{mic1VerifiedCount}</span>
                  <span className="text-gray-400 text-[11px]">Verified</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                  <span className="font-bold text-white">{mic1NeedsReviewCount}</span>
                  <span className="text-gray-400 text-[11px]">Needs Review</span>
                </div>
                <div className="flex items-center gap-1.5 pt-0.5 border-t border-white/5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0"></span>
                  <span className="font-bold text-white">{mic1All.length}</span>
                  <span className="text-gray-400 text-[11px]">Registered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Mic Column with Position Accordions
const MicPlacementColumn: React.FC<{
  slot: 'Mic_0' | 'Mic_1';
  title: string;
  boundMic?: string;
  allProfilesCount: number;
  verifiedCount: number;
  needsReviewCount: number;
  filteredProfiles: MicPlacementMapping[];
  onAddPlacement: () => void;
  onEditMapping: (m: MicPlacementMapping) => void;
  onDeleteMapping: (m: MicPlacementMapping) => void;
}> = ({
  slot,
  boundMic,
  allProfilesCount,
  verifiedCount,
  needsReviewCount,
  filteredProfiles,
  onAddPlacement,
  onEditMapping,
  onDeleteMapping
}) => {
  const isMic0 = slot === 'Mic_0';
  const accentText = isMic0 ? 'text-cyan-400' : 'text-purple-400';
  const accentBg = isMic0 ? 'bg-cyan-500/10' : 'bg-purple-500/10';
  const accentBorder = isMic0 ? 'border-cyan-500/30' : 'border-purple-500/30';
  const accentButton = isMic0
    ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
    : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30';

  // Accordion state for Position groups (folded / rolled up by default)
  const [openPositions, setOpenPositions] = useState<Record<SemanticPosition, boolean>>({
    'Cap': false,
    'Cap Edge': false,
    'Cone': false,
    'Cone Edge': false
  });

  const togglePosition = (pos: SemanticPosition) => {
    setOpenPositions(prev => ({ ...prev, [pos]: !prev[pos] }));
  };

  const grouped = useMemo(() => groupPlacementsByPosition(filteredProfiles), [filteredProfiles]);

  return (
    <div className="bg-[#13161f] border border-[#1e2330] rounded-xl p-4 sm:p-5 space-y-4 flex flex-col h-full shadow-lg">
      {/* Column Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#1e2330]">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${accentBg} ${accentText} shrink-0`}>
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold font-mono text-white tracking-wide">
                {isMic0 ? 'MIC 0' : 'MIC 1'}
              </h4>
              {boundMic && (
                <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-medium ${accentBg} ${accentText} border ${accentBorder}`}>
                  {boundMic}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 font-mono mt-0.5">
              {allProfilesCount} registered profiles ({verifiedCount} verified · {needsReviewCount} needs review)
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onAddPlacement}
          className={`px-3 py-1.5 ${accentButton} text-xs font-mono font-medium rounded-lg transition-colors flex items-center gap-1.5 shrink-0`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Placement</span>
        </button>
      </div>

      {/* Sub-header strip */}
      <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-gray-400 px-3 py-1 bg-[#161a25]/50 rounded-lg border border-[#23293a]/50">
        <span>Position / Orientation</span>
        <div className="flex items-center gap-8">
          <span>Profiles</span>
          <span>Status</span>
        </div>
      </div>

      {/* Position Accordion Groups */}
      <div className="space-y-2 flex-1">
        {CANONICAL_POSITION_ORDER.map(pos => {
          const items = grouped[pos] || [];
          const isOpen = openPositions[pos];
          const posVerifiedCount = items.filter(m => {
            const s = m.status || m.validationStatus || 'needs_review';
            return (s as string) === 'validated' || (s as string) === 'at5p_validated';
          }).length;
          const posNeedsReviewCount = items.length - posVerifiedCount;

          return (
            <div key={pos} className="border border-[#23293a] rounded-lg overflow-hidden bg-[#161a25]/40 transition-colors">
              <button
                type="button"
                onClick={() => togglePosition(pos)}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-mono hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className={`w-3.5 h-3.5 ${accentText}`} /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
                  <span className="font-bold text-gray-200">
                    {pos === 'Cap' ? 'Cap (Centre)' : pos}
                  </span>
                </div>
                <div className="flex items-center gap-8">
                  <span className="text-[11px] text-gray-300 font-bold min-w-[32px] text-right">
                    {items.length > 0 ? `${posVerifiedCount} / ${items.length}` : '0'}
                  </span>
                  <span className="min-w-[80px] text-right">
                    {items.length === 0 ? (
                      <span className="text-[10px] text-gray-500 font-normal">No Profiles</span>
                    ) : posNeedsReviewCount === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">
                        <Check className="w-3 h-3 text-emerald-400" />
                        Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded">
                        Needs Review
                      </span>
                    )}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[#23293a] bg-black/20">
                  <CompactPositionTable
                    items={items}
                    onEdit={onEditMapping}
                    onDelete={onDeleteMapping}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Subcomponent: Firestore Registered Mic Placements Primary Workspace
const FirestoreRegisteredWorkspace: React.FC<{
  cabName: string;
  cabProfile?: GearProfile | null;
  cabSpecificMappings: MicPlacementMapping[];
  onAddPlacementForSlot: (slot: 'Mic_0' | 'Mic_1') => void;
  onEditMapping: (m: MicPlacementMapping) => void;
  onDeleteMapping: (m: MicPlacementMapping) => void;
  onRefresh?: () => void;
}> = ({
  cabName,
  cabProfile,
  cabSpecificMappings,
  onAddPlacementForSlot,
  onEditMapping,
  onDeleteMapping,
  onRefresh
}) => {
  const [filterState, setFilterState] = useState<MicPlacementFilterState>({
    position: 'All',
    orientation: 'All',
    distance: 'All',
    angle: 'All',
    status: 'All',
    search: '',
  });

  const resetFilters = () => {
    setFilterState({
      position: 'All',
      orientation: 'All',
      distance: 'All',
      angle: 'All',
      status: 'All',
      search: '',
    });
  };

  const isFiltered = filterState.position !== 'All' ||
    filterState.orientation !== 'All' ||
    filterState.distance !== 'All' ||
    filterState.angle !== 'All' ||
    filterState.status !== 'All' ||
    filterState.search.trim().length > 0;

  // Split mappings between Mic 0 and Mic 1
  const isSlot1Mapping = (m: MicPlacementMapping) => {
    const slotKey = (m.friendly_setting || m.target || 'Mic_0_Placement').toLowerCase();
    return slotKey.includes('mic1') || slotKey.includes('mic2') || m.micIndex === 1 || m.micSlot === 'Mic_1' || m.micSlot === 'Mic_2';
  };

  const mic0All = useMemo(() => cabSpecificMappings.filter(m => !isSlot1Mapping(m)), [cabSpecificMappings]);
  const mic1All = useMemo(() => cabSpecificMappings.filter(m => isSlot1Mapping(m)), [cabSpecificMappings]);

  const mic0Filtered = useMemo(() => filterAndSortMicPlacements(mic0All, filterState), [mic0All, filterState]);
  const mic1Filtered = useMemo(() => filterAndSortMicPlacements(mic1All, filterState), [mic1All, filterState]);

  // Derived counts for Mic 0
  const mic0VerifiedCount = useMemo(() => {
    return mic0All.filter(m => (m.status as string) === 'validated' || (m.status as string) === 'at5p_validated' || m.validationStatus === 'validated' || m.validationStatus === 'at5p_validated').length;
  }, [mic0All]);
  const mic0NeedsReviewCount = useMemo(() => {
    return mic0All.filter(m => m.status === 'needs_review' || m.status === 'estimated' || m.validationStatus === 'needs_review').length;
  }, [mic0All]);

  // Derived counts for Mic 1
  const mic1VerifiedCount = useMemo(() => {
    return mic1All.filter(m => (m.status as string) === 'validated' || (m.status as string) === 'at5p_validated' || m.validationStatus === 'validated' || m.validationStatus === 'at5p_validated').length;
  }, [mic1All]);
  const mic1NeedsReviewCount = useMemo(() => {
    return mic1All.filter(m => m.status === 'needs_review' || m.status === 'estimated' || m.validationStatus === 'needs_review').length;
  }, [mic1All]);

  // Total summary counts
  const totalVerifiedCount = mic0VerifiedCount + mic1VerifiedCount;
  const totalNeedsReviewCount = mic0NeedsReviewCount + mic1NeedsReviewCount;

  // Bound mic labels if available
  const mic0Bound = ((cabProfile as any)?.settings?.['Mic_0'] as string) || (mic0All.find(m => m.micModelName)?.micModelName) || 'Dynamic 57';
  const mic1Bound = ((cabProfile as any)?.settings?.['Mic_1'] as string) || (mic1All.find(m => m.micModelName)?.micModelName) || 'Ribbon 121';

  return (
    <div className="bg-[#0d0f14] border border-[#1e2330] rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl">
      {/* Workspace Header & Summary Cards */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold font-mono text-white tracking-wide uppercase">
              Firestore Registered Mic Placements
            </h3>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            Custom calibrated profiles stored persistently in Firestore. These take top precedence (Tier 1).
          </p>
        </div>

        {/* Top-Right Summary Cards */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-[#161a25] border border-[#23293a] rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-400">Cabinet:</span>
            <span className="font-bold text-white">{cabName}</span>
          </div>

          <div className="bg-[#161a25] border border-[#23293a] rounded-xl px-3.5 py-2 flex items-center gap-2.5 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white leading-tight">
                Total Profiles: {cabSpecificMappings.length}
              </div>
              <div className="text-[10px] text-gray-400">
                {totalVerifiedCount} verified · {totalNeedsReviewCount} needs review
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Single-Row Compact Filter Bar */}
      <div className="bg-[#13161f] border border-[#1e2330] rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            {/* Position */}
            <div className="flex flex-col">
              <label className="text-[9px] text-gray-400 uppercase font-semibold font-mono mb-1">Position</label>
              <select
                value={filterState.position}
                onChange={(e) => setFilterState({ ...filterState, position: e.target.value as any })}
                className="bg-[#1a1f2c] border border-[#2a3142] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="All">All</option>
                <option value="Cap">Cap (Centre)</option>
                <option value="Cap Edge">Cap Edge</option>
                <option value="Cone">Cone</option>
                <option value="Cone Edge">Cone Edge</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="flex flex-col">
              <label className="text-[9px] text-gray-400 uppercase font-semibold font-mono mb-1">Orientation</label>
              <select
                value={filterState.orientation}
                onChange={(e) => setFilterState({ ...filterState, orientation: e.target.value as any })}
                className="bg-[#1a1f2c] border border-[#2a3142] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="All">All</option>
                <option value="N">N (00:00)</option>
                <option value="E">E (03:00)</option>
                <option value="S">S (06:00)</option>
                <option value="W">W (09:00)</option>
              </select>
            </div>

            {/* Distance / Range */}
            <div className="flex flex-col">
              <label className="text-[9px] text-gray-400 uppercase font-semibold font-mono mb-1">Distance</label>
              <select
                value={filterState.distance}
                onChange={(e) => setFilterState({ ...filterState, distance: e.target.value as any })}
                className="bg-[#1a1f2c] border border-[#2a3142] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="All">All</option>
                <option value="Close">Close</option>
                <option value="Medium">Medium</option>
                <option value="Far">Far</option>
              </select>
            </div>

            {/* Angle */}
            <div className="flex flex-col">
              <label className="text-[9px] text-gray-400 uppercase font-semibold font-mono mb-1">Angle</label>
              <select
                value={filterState.angle}
                onChange={(e) => setFilterState({ ...filterState, angle: e.target.value as any })}
                className="bg-[#1a1f2c] border border-[#2a3142] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="All">All</option>
                <option value="On Axis">On Axis</option>
                <option value="45° Off Axis">45° Off Axis</option>
              </select>
            </div>

            {/* Status */}
            <div className="flex flex-col">
              <label className="text-[9px] text-gray-400 uppercase font-semibold font-mono mb-1">Status</label>
              <select
                value={filterState.status}
                onChange={(e) => setFilterState({ ...filterState, status: e.target.value as any })}
                className="bg-[#1a1f2c] border border-[#2a3142] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="All">All</option>
                <option value="verified">Verified</option>
                <option value="needs_review">Needs Review</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="flex flex-col flex-1 min-w-[160px]">
              <label className="text-[9px] text-transparent uppercase font-semibold font-mono mb-1 select-none">Search</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={filterState.search}
                  placeholder="Search placements..."
                  onChange={(e) => setFilterState({ ...filterState, search: e.target.value })}
                  className="w-full bg-[#1a1f2c] border border-[#2a3142] rounded-lg pl-8 pr-7 py-1.5 text-xs text-white font-mono placeholder:text-gray-500 focus:outline-none focus:border-cyan-500"
                />
                {filterState.search && (
                  <button
                    type="button"
                    onClick={() => setFilterState({ ...filterState, search: '' })}
                    className="absolute right-2 top-2 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex flex-col">
              <label className="text-[9px] text-transparent uppercase font-semibold font-mono mb-1 select-none">Reset</label>
              <button
                type="button"
                onClick={resetFilters}
                disabled={!isFiltered}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                  isFiltered 
                    ? 'border-[#2a3142] bg-[#1a1f2c] hover:bg-[#23293a] text-cyan-400 hover:text-cyan-300' 
                    : 'border-[#1e2330] bg-transparent text-gray-600 cursor-not-allowed'
                }`}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: MIC 0 and MIC 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <MicPlacementColumn
          slot="Mic_0"
          title="MIC 0 (Primary / Slot 0)"
          boundMic={mic0Bound}
          allProfilesCount={mic0All.length}
          verifiedCount={mic0VerifiedCount}
          needsReviewCount={mic0NeedsReviewCount}
          filteredProfiles={mic0Filtered}
          onAddPlacement={() => onAddPlacementForSlot('Mic_0')}
          onEditMapping={onEditMapping}
          onDeleteMapping={onDeleteMapping}
        />

        <MicPlacementColumn
          slot="Mic_1"
          title="MIC 1 (Secondary / Slot 1)"
          boundMic={mic1Bound}
          allProfilesCount={mic1All.length}
          verifiedCount={mic1VerifiedCount}
          needsReviewCount={mic1NeedsReviewCount}
          filteredProfiles={mic1Filtered}
          onAddPlacement={() => onAddPlacementForSlot('Mic_1')}
          onEditMapping={onEditMapping}
          onDeleteMapping={onDeleteMapping}
        />
      </div>

      {/* Placement Matrix Overview & Progress Summaries */}
      <PlacementMatrixOverview
        cabSpecificMappings={cabSpecificMappings}
        mic0All={mic0All}
        mic0VerifiedCount={mic0VerifiedCount}
        mic0NeedsReviewCount={mic0NeedsReviewCount}
        mic1All={mic1All}
        mic1VerifiedCount={mic1VerifiedCount}
        mic1NeedsReviewCount={mic1NeedsReviewCount}
      />

      {/* Footer Info Strip */}
      <div className="pt-3 border-t border-[#1e2330] flex items-center justify-between flex-wrap gap-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-gray-400 text-[11px]">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Profiles are loaded from Firestore and take top precedence over reference calibrations. Use the editor to add, update or verify placements.</span>
        </div>
        <div className="flex items-center gap-3 text-gray-400 text-[11px]">
          <span>Live Firestore Sync</span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#161a25] border border-[#23293a] hover:border-gray-500 text-gray-300 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Live Resolver Sandbox Section
const LiveResolverSandboxSection: React.FC<{
  isValidCab: boolean;
  testSlot: 'Mic_0' | 'Mic_1' | 'Mic_2';
  setTestSlot: (s: 'Mic_0' | 'Mic_1' | 'Mic_2') => void;
  testMicModel: string;
  setTestMicModel: (m: string) => void;
  testPosition: SemanticPosition;
  setTestPosition: (p: SemanticPosition) => void;
  testOrientation: SemanticOrientation;
  setTestOrientation: (o: SemanticOrientation) => void;
  testDistance: SemanticDistance;
  setTestDistance: (d: SemanticDistance) => void;
  testAngle: SemanticAngle;
  setTestAngle: (a: SemanticAngle) => void;
  customTestInput: string;
  setCustomTestInput: (i: string) => void;
  useCustomInput: boolean;
  setUseCustomInput: (u: boolean) => void;
  liveResolution: PlacementResolutionResult;
}> = ({
  isValidCab,
  testSlot,
  setTestSlot,
  testMicModel,
  setTestMicModel,
  testPosition,
  setTestPosition,
  testOrientation,
  setTestOrientation,
  testDistance,
  setTestDistance,
  testAngle,
  setTestAngle,
  customTestInput,
  setCustomTestInput,
  useCustomInput,
  setUseCustomInput,
  liveResolution
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const effectiveLiveOrient = getEffectiveMappingOrientation(
    liveResolution.matchedProfile || {
      position: liveResolution.semanticPosition,
      orientation: liveResolution.semanticOrientation,
      friendly_value: liveResolution.parsedLabel,
      friendly_placement: liveResolution.semanticPosition,
      friendly_orientation: liveResolution.semanticOrientation,
    }
  );
  const displayLiveOrient = effectiveLiveOrient ? formatSemanticOrientation(effectiveLiveOrient) : '—';

  return (
    <div className="bg-[#121217] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between flex-wrap gap-3 cursor-pointer"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button type="button" className="text-gray-400 hover:text-white p-0.5">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
            <Compass className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Live Mic Placement Resolver Sandbox
            </h4>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            Test how any semantic placement input resolves in real time according to the strict 4-tier precedence.
          </p>
        </div>

        {isExpanded && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5"
          >
            <button
              type="button"
              onClick={() => setUseCustomInput(false)}
              className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-lg transition-all ${!useCustomInput ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Grid Selectors
            </button>
            <button
              type="button"
              onClick={() => setUseCustomInput(true)}
              className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-lg transition-all ${useCustomInput ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Raw Semantic String
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-5 pt-2">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-black/30 p-4 rounded-2xl border border-white/5 font-mono">
            <div className="space-y-1.5">
              <label className="text-[9.5px] text-gray-400 uppercase tracking-wider block font-bold">Target Mic Slot</label>
              <select
                value={testSlot}
                onChange={(e) => setTestSlot(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Mic_0">Mic 0 (Mic0 Slot / Speaker 0 - Calibrated)</option>
                <option value="Mic_1">Mic 1 (Mic1 Slot / Speaker 1 - Calibration Gap)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9.5px] text-gray-400 uppercase tracking-wider block font-bold">Mic Model</label>
              <select
                value={testMicModel}
                onChange={(e) => setTestMicModel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="Dynamic 57">Dynamic 57 (Verified Reference Mic)</option>
                <option value="Condenser 87">Condenser 87 (Unverified Mic)</option>
                <option value="Ribbon 121">Ribbon 121 (Unverified Mic)</option>
                <option value="Dynamic 421">Dynamic 421 (Unverified Mic)</option>
                <option value="Custom Mic">Custom Uncalibrated Mic</option>
              </select>
            </div>

            {!useCustomInput ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-gray-400 uppercase tracking-wider block font-bold">Position</label>
                  <select
                    value={testPosition}
                    onChange={(e) => setTestPosition(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Cap">Cap (Center)</option>
                    <option value="Cap Edge">Cap Edge</option>
                    <option value="Cone">Cone</option>
                    <option value="Cone Edge">Cone Edge</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-gray-400 uppercase tracking-wider block font-bold">Orientation</label>
                  {testPosition === 'Cap' ? (
                    <div className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-500 italic">
                      Center (No Orientation)
                    </div>
                  ) : (
                    <select
                      value={testOrientation}
                      onChange={(e) => setTestOrientation(e.target.value as SemanticOrientation)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="W">W · 09:00 (Factory Calibrated)</option>
                      <option value="N">N · 00:00 (Calibrated)</option>
                      <option value="E">E · 03:00 (Uncalibrated)</option>
                      <option value="S">S · 06:00 (Uncalibrated)</option>
                    </select>
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9.5px] text-gray-400 uppercase tracking-wider block font-bold">Distance & Angle</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={testDistance}
                      onChange={(e) => setTestDistance(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Close">Close</option>
                      <option value="Medium">Medium</option>
                      <option value="Far">Far</option>
                    </select>
                    <select
                      value={testAngle}
                      onChange={(e) => setTestAngle(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="On Axis">On Axis (0°)</option>
                      <option value="45° Off Axis">45° Off Axis</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[9.5px] text-gray-400 uppercase tracking-wider block font-bold">Custom Semantic String Input</label>
                <input
                  type="text"
                  placeholder='e.g. "Cap Edge, W, Close", "Cone · E · Far", "Cap Edge, 00:00"'
                  value={customTestInput}
                  onChange={(e) => setCustomTestInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600"
                />
              </div>
            )}
          </div>

          {/* Live Resolution Output Card in Canonical Order: Orientation | XAxis | YAxis | Distance | Angle | Speaker */}
          <div className="bg-[#18181f] border border-white/10 rounded-2xl p-5 space-y-4 font-mono">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold">Resolver Tier / Source:</span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  liveResolution.resolutionSource === 'firestore_verified'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : liveResolution.resolutionSource === 'reference_calibration_vir'
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : liveResolution.resolutionSource === 'uncalibrated_orientation_gap'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : liveResolution.resolutionSource === 'estimated_profile'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                }`}>
                  {liveResolution.resolutionSource === 'firestore_verified' && 'TIER 1: FIRESTORE VERIFIED'}
                  {liveResolution.resolutionSource === 'reference_calibration_vir' && 'TIER 2: VIR REFERENCE CALIBRATION (MIC 0 ONLY)'}
                  {liveResolution.resolutionSource === 'uncalibrated_orientation_gap' && 'UNCALIBRATED ORIENTATION (AWAITING AT5 CALIBRATION)'}
                  {liveResolution.resolutionSource === 'estimated_profile' && 'TIER 3: ESTIMATED PROFILE (NEEDS REVIEW)'}
                  {liveResolution.resolutionSource === 'safe_default' && 'TIER 4: SAFE DEFAULT / UNCALIBRATED GAP'}
                  {liveResolution.resolutionSource === 'cab_default' && 'CAB DEFAULT (UNSPECIFIED)'}
                </span>
              </div>

              <div className="text-[10px] text-gray-400">
                Parsed Canonical: <span className="text-white font-bold">{liveResolution.parsedLabel || 'N/A'}</span>
              </div>
            </div>

            {/* Canonical Sequence: Orientation | XAxis | YAxis | Distance | Angle | Speaker */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Orientation</span>
                <span className={`text-sm font-bold block ${displayLiveOrient === '—' ? 'text-gray-400' : 'text-cyan-300'}`}>
                  {displayLiveOrient}
                </span>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">XAxis</span>
                <span className="text-sm font-bold text-white block">{liveResolution.coordinates.XAxis}</span>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">YAxis</span>
                <span className="text-sm font-bold text-white block">{liveResolution.coordinates.YAxis}</span>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Distance</span>
                <span className="text-sm font-bold text-white block">{liveResolution.coordinates.Distance}</span>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Angle</span>
                <span className="text-sm font-bold text-white block">{liveResolution.coordinates.Angle}</span>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Speaker</span>
                <span className="text-sm font-bold text-white block">{liveResolution.coordinates.Speaker}</span>
              </div>
            </div>

            {liveResolution.warning && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{liveResolution.warning}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent: Built-in VIR Reference Calibration Section (collapsed by default)
const BuiltInReferenceCalibrationSection: React.FC<{
  activeVIRCoordinates: ReturnType<typeof getVIRCalibrationCoordinates>;
  hasRefOverrides: boolean;
  onResetRefOverrides: () => void;
  onOpenRefEdit: () => void;
}> = ({
  activeVIRCoordinates,
  hasRefOverrides,
  onResetRefOverrides,
  onOpenRefEdit
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-[#111116] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between flex-wrap gap-3 cursor-pointer"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button type="button" className="text-gray-400 hover:text-white p-0.5">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
            </button>
            <Layers className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Built-in VIR Reference Calibration Coordinates (Numeric)
            </h4>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            Position Vectors (X,Y) · Distance Offsets · Angle Offsets · Verified AT5 Spatial Grid
          </p>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {hasRefOverrides && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-mono font-bold uppercase">
              <span>Overrides Active</span>
              <button
                type="button"
                onClick={onResetRefOverrides}
                title="Reset reference values to factory defaults"
                className="hover:text-white transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onOpenRefEdit}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/15 text-cyan-400 text-[10px] font-mono font-bold uppercase rounded-lg transition-all flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Edit Reference Values</span>
          </button>
          <span className="text-[9px] font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 text-gray-400 uppercase">
            Built-in Reference
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-2">
          <p className="text-xs text-gray-400 font-mono">
            Verified AT5 VIR reference coordinates for the reference cabinet (<span className="text-gray-300">4x12 Brit 8000</span>, GUID: <span className="text-gray-300">7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b</span>) and reference mic (<span className="text-gray-300">Dynamic 57</span>, GUID: <span className="text-gray-300">1e41acc4-85af-4e84-bee4-eabc0be5fef1</span>).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Position coordinates table */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3 font-mono">
              <h5 className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Position Vectors (X, Y)</h5>
              <div className="text-xs space-y-3">
                {[
                  { group: "Center", keys: ["Cap" as const] },
                  { group: "Cap Edge", keys: ["Cap Edge W", "Cap Edge N", "Cap Edge E", "Cap Edge S"] as const },
                  { group: "Cone", keys: ["Cone W", "Cone N", "Cone E", "Cone S"] as const },
                  { group: "Cone Edge", keys: ["Cone Edge W", "Cone Edge N", "Cone Edge E", "Cone Edge S"] as const },
                ].map((grp, gIdx) => (
                  <div key={grp.group} className={`${gIdx > 0 ? 'pt-2.5 border-t border-white/5' : ''} space-y-1`}>
                    {grp.keys.map((posKey) => {
                      const coords = activeVIRCoordinates.positions[posKey];
                      const isCenter = posKey === "Cap";
                      const isCalibrated = coords?.isCalibrated;
                      return (
                        <div key={posKey} className="py-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300 font-bold flex items-center gap-1.5">
                              <span>{posKey}</span>
                              {(() => {
                                const match = posKey.match(/ ([NESW])$/);
                                const orient = match ? (match[1] as SemanticOrientation) : undefined;
                                return orient ? (
                                  <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.2 rounded font-normal">
                                    {CARDINAL_ORIENTATION_CLOCK[orient]}
                                  </span>
                                ) : null;
                              })()}
                            </span>
                            {isCenter ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                                Calibrated / Center
                              </span>
                            ) : isCalibrated ? (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                Calibrated
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                                Awaiting AT5
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-gray-400">
                            {isCalibrated ? (
                              <>
                                <span>X: <span className="text-white">{coords.X}</span></span>
                                <span>Y: <span className="text-white">{coords.Y}</span></span>
                              </>
                            ) : (
                              <span className="text-gray-500 italic">Uncalibrated (X: —, Y: —)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Distance & Angle coordinates table */}
            <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3 font-mono">
              <h5 className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">Distance & Angle Offsets</h5>
              <div className="divide-y divide-white/5 text-xs">
                {Object.entries(activeVIRCoordinates.distances).map(([dist, coords]: [string, any]) => (
                  <div key={dist} className="py-2 flex items-center justify-between">
                    <span className="text-gray-300 font-bold">{dist}</span>
                    <span className="text-gray-400">Distance: <span className="text-white">{coords.Distance}</span></span>
                  </div>
                ))}
                {Object.entries(activeVIRCoordinates.angles).map(([ang, coords]: [string, any]) => (
                  <div key={ang} className="py-2 flex items-center justify-between">
                    <span className="text-gray-300 font-bold">{ang}</span>
                    <span className="text-gray-400">Angle: <span className="text-white">{coords.Angle}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface MicPlacementManagementViewProps {
  cabProfile?: GearProfile | null;
  cabProfiles?: GearProfile[];
  onSelectCabProfile?: (cab: GearProfile) => void;
  onRefreshChain?: () => void;
}

export const MicPlacementManagementView: React.FC<MicPlacementManagementViewProps> = ({
  cabProfile,
  cabProfiles,
  onSelectCabProfile,
  onRefreshChain
}) => {
  const [dbMappings, setDbMappings] = useState<MicPlacementMapping[]>([]);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Deletion state
  const [deletingMapping, setDeletingMapping] = useState<MicPlacementMapping | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Live Tester / Sandbox state
  const [testSlot, setTestSlot] = useState<'Mic_0' | 'Mic_1' | 'Mic_2'>('Mic_0');
  const [testMicModel, setTestMicModel] = useState<string>('Dynamic 57');
  const [testPosition, setTestPosition] = useState<SemanticPosition>('Cap Edge');
  const [testOrientation, setTestOrientation] = useState<SemanticOrientation>('W');
  const [testDistance, setTestDistance] = useState<SemanticDistance>('Close');
  const [testAngle, setTestAngle] = useState<SemanticAngle>('On Axis');
  const [customTestInput, setCustomTestInput] = useState<string>('');
  const [useCustomInput, setUseCustomInput] = useState<boolean>(false);

  // Custom Mapping Creator / Editor state
  const [editingMapping, setEditingMapping] = useState<MicPlacementMapping | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSlot, setNewSlot] = useState<'Mic_0' | 'Mic_1' | 'Mic_2'>('Mic_0');
  const [newLabel, setNewLabel] = useState('');
  const [newPosition, setNewPosition] = useState<SemanticPosition>('Cap Edge');
  const [newOrientation, setNewOrientation] = useState<SemanticOrientation>('W');
  const [newDistance, setNewDistance] = useState<SemanticDistance>('Close');
  const [newAngle, setNewAngle] = useState<SemanticAngle>('On Axis');
  const [newSpeaker, setNewSpeaker] = useState<'0' | '1' | '2' | '3'>('0');
  const [customX, setCustomX] = useState('-0.214223');
  const [customY, setCustomY] = useState('-0.00519017');
  const [customDist, setCustomDist] = useState('0');
  const [customAng, setCustomAng] = useState('0');
  const [useManualCoordinates, setUseManualCoordinates] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<'validated' | 'needs_review' | 'estimated'>('validated');
  const [isSaving, setIsSaving] = useState(false);

  // Built-in Reference Overrides Editor state
  const [showRefEditModal, setShowRefEditModal] = useState(false);
  const [refCalibrationVersion, setRefCalibrationVersion] = useState(0);
  const [refPositions, setRefPositions] = useState<Record<string, { X: number; Y: number; isCalibrated?: boolean }>>(() => {
    const coords = getVIRCalibrationCoordinates();
    const map: Record<string, { X: number; Y: number; isCalibrated?: boolean }> = {};
    for (const [k, v] of Object.entries(coords.positions)) {
      map[k] = { X: v.X, Y: v.Y, isCalibrated: v.isCalibrated };
    }
    return map;
  });
  const [refDistances, setRefDistances] = useState<Record<string, { Distance: number }>>({
    "Close": { Distance: VIR_CALIBRATION_COORDINATES.distances["Close"].Distance },
    "Medium": { Distance: VIR_CALIBRATION_COORDINATES.distances["Medium"].Distance },
    "Far": { Distance: VIR_CALIBRATION_COORDINATES.distances["Far"].Distance },
  });
  const [refAngles, setRefAngles] = useState<Record<string, { Angle: number }>>({
    "On Axis": { Angle: VIR_CALIBRATION_COORDINATES.angles["On Axis"].Angle },
    "45° Off Axis": { Angle: VIR_CALIBRATION_COORDINATES.angles["45° Off Axis"].Angle },
  });

  const activeVIRCoordinates = useMemo(() => {
    return getVIRCalibrationCoordinates();
  }, [refCalibrationVersion]);

  const hasRefOverrides = useMemo(() => {
    const ov = getVIRCalibrationOverrides();
    return Boolean(
      (ov.positions && Object.keys(ov.positions).length > 0) ||
      (ov.distances && Object.keys(ov.distances).length > 0) ||
      (ov.angles && Object.keys(ov.angles).length > 0)
    );
  }, [refCalibrationVersion]);

  const isValidCab = Boolean(cabProfile && cabProfile.type === 'cab');
  const cabName = isValidCab ? (cabProfile?.displayName || '') : '';
  const cabGuid = isValidCab ? (cabProfile?.guid || '') : '';
  const isReferenceCab = isValidCab ? isVIRReferenceCabinet(cabName, cabGuid) : false;

  const loadMappings = async (forceRefresh = false) => {
    setIsLoadingMappings(true);
    try {
      const mappings = await ensureMicPlacementDataLoaded(forceRefresh);
      setDbMappings(mappings);
      setDbMicPlacementMappings(mappings);
      const overrides = await at5DatabaseService.getVIRReferenceOverrides(forceRefresh);
      if (overrides && (overrides.positions || overrides.distances || overrides.angles)) {
        setVIRCalibrationOverrides(overrides);
        setRefCalibrationVersion(v => v + 1);
      }
    } catch (err: any) {
      console.error('Error fetching mic placement mappings:', err);
    } finally {
      setIsLoadingMappings(false);
    }
  };

  useEffect(() => {
    loadMappings();
  }, []);

  // Filter mappings for this cabinet
  const cabSpecificMappings = useMemo(() => {
    if (!isValidCab || !cabName) return [];
    const cleanCab = cabName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return dbMappings.filter(m => {
      const gearClean = (m.gear || m.cabName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return gearClean === cleanCab || (m.cabGuid && cabGuid && m.cabGuid.toLowerCase().replace(/[^a-z0-9]/g, '') === cabGuid.toLowerCase().replace(/[^a-z0-9]/g, ''));
    });
  }, [dbMappings, isValidCab, cabName, cabGuid]);

  // Live resolution result in sandbox
  const liveResolution: PlacementResolutionResult = useMemo(() => {
    if (!isValidCab || !cabName) {
      return {
        resolved: false,
        coordinates: { XAxis: 0, YAxis: 0, Distance: 0, Angle: 0, Speaker: 0 },
        resolutionSource: 'safe_default',
        isEstimated: false,
        isReferenceCalibration: false,
        warning: 'No valid Cabinet profile selected.',
        parsedLabel: ''
      };
    }
    const inputLabel = useCustomInput 
      ? customTestInput 
      : (testPosition === 'Cap'
          ? `${testPosition}, ${testDistance}${testAngle !== 'On Axis' ? `, ${testAngle}` : ''}`
          : `${testPosition}, ${testOrientation}, ${testDistance}${testAngle !== 'On Axis' ? `, ${testAngle}` : ''}`);

    return resolveCompositeMicPlacement({
      cabName,
      cabGuid,
      micSlot: testSlot,
      requestedLabel: inputLabel,
      micModelName: testMicModel,
      dbMappings
    });
  }, [isValidCab, cabName, cabGuid, testSlot, testMicModel, testPosition, testOrientation, testDistance, testAngle, customTestInput, useCustomInput, dbMappings, refCalibrationVersion]);

  // Handle open Add Modal (clean state)
  const handleOpenAddModal = () => {
    setEditingMapping(null);
    setNewSlot('Mic_0');
    setNewLabel('');
    setNewPosition('Cap Edge');
    setNewOrientation('W');
    setNewDistance('Close');
    setNewAngle('On Axis');
    setNewSpeaker('0');
    setCustomX('-0.214223');
    setCustomY('-0.00519017');
    setCustomDist('0');
    setCustomAng('0');
    setUseManualCoordinates(false);
    setNewNotes('');
    setNewStatus('needs_review');
    setShowAddModal(true);
  };

  // Handle open Add Modal for specific mic slot (Mic 0 or Mic 1)
  const handleOpenAddModalForSlot = (slot: 'Mic_0' | 'Mic_1') => {
    setEditingMapping(null);
    setNewSlot(slot);
    setNewSpeaker(slot === 'Mic_0' ? '0' : '1');
    setNewLabel('');
    setNewPosition('Cap Edge');
    setNewOrientation('W');
    setNewDistance('Close');
    setNewAngle('On Axis');
    setCustomX(slot === 'Mic_0' ? '-0.214223' : '0');
    setCustomY(slot === 'Mic_0' ? '-0.00519017' : '0');
    setCustomDist('0');
    setCustomAng('0');
    setUseManualCoordinates(false);
    setNewNotes('');
    setNewStatus('needs_review');
    setShowAddModal(true);
  };

  // Handle open Edit Modal for a custom profile
  const handleOpenEditMapping = (m: MicPlacementMapping) => {
    setEditingMapping(m);
    const xml = m.maps_to || m.xml_values || {};
    const slotKey = (m.friendly_setting || m.target || 'Mic_0_Placement').toLowerCase();
    const isSlot1 = slotKey.includes('mic1') || slotKey.includes('mic2') || m.micIndex === 1;
    const resolvedSlot: 'Mic_0' | 'Mic_1' = isSlot1 ? 'Mic_1' : 'Mic_0';

    const parsedPlacement = parseSemanticPlacement(m.friendly_value || m.friendly_name || m.canonicalPlacementName || '');

    setNewSlot(resolvedSlot);
    setNewLabel(m.friendly_value || m.friendly_name || m.canonicalPlacementName || '');
    setNewPosition((m.friendlyPlacement || m.friendly_placement || parsedPlacement.position || 'Cap Edge') as SemanticPosition);
    setNewOrientation((m.friendlyOrientation || m.friendly_orientation || parsedPlacement.orientation || 'W') as SemanticOrientation);
    setNewDistance((m.friendlyDistance || m.friendly_distance || parsedPlacement.distance || 'Close') as SemanticDistance);
    setNewAngle((m.friendlyAngle || m.friendly_angle || parsedPlacement.angle || 'On Axis') as SemanticAngle);
    setNewNotes(m.notes || '');
    const initialStatus: 'validated' | 'needs_review' | 'estimated' = 
      (m.status === 'validated' || m.validationStatus === 'validated' || m.validationStatus === 'at5p_validated')
        ? 'validated'
        : (m.status === 'estimated' ? 'estimated' : 'needs_review');
    setNewStatus(initialStatus);

    const prefix = resolvedSlot === 'Mic_0' ? 'Mic0' : 'Mic1';
    const spk = xml[`${prefix}Speaker`] ?? xml.Speaker ?? (resolvedSlot === 'Mic_0' ? 0 : 1);
    setNewSpeaker(String(spk) as any);

    const x = xml[`${prefix}XAxis`] ?? xml.XAxis ?? 0;
    const y = xml[`${prefix}YAxis`] ?? xml.YAxis ?? 0;
    const d = xml[`${prefix}Distance`] ?? xml.Distance ?? 0;
    const a = xml[`${prefix}Angle`] ?? xml.Angle ?? 0;

    setCustomX(String(x));
    setCustomY(String(y));
    setCustomDist(String(d));
    setCustomAng(String(a));
    setUseManualCoordinates(true);

    setShowAddModal(true);
  };

  // Handle saving mapping (Create or Edit)
  const handleSaveMapping = async () => {
    if (!newLabel.trim()) {
      setSaveErrorMsg('Please provide a semantic label (e.g. "Cap Edge, Close").');
      return;
    }

    setIsSaving(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const isSlot1 = newSlot === 'Mic_1' || newSlot === 'Mic_2';
      const prefix = isSlot1 ? 'Mic1' : 'Mic0';
      let coords: { Angle: number; XAxis: number; YAxis: number; Distance: number; Speaker: number };

      if (useManualCoordinates) {
        coords = {
          Angle: Number(customAng) || 0,
          XAxis: Number(customX) || 0,
          YAxis: Number(customY) || 0,
          Distance: Number(customDist) || 0,
          Speaker: Number(newSpeaker) || (isSlot1 ? 1 : 0)
        };
      } else {
        const composed = composeVIRCoordinates(
          newPosition, 
          newDistance, 
          newAngle, 
          newSlot, 
          Number(newSpeaker),
          newPosition === 'Cap' ? undefined : newOrientation
        );
        coords = composed;
      }

      const xmlValues: Record<string, number> = {
        [`${prefix}Angle`]: coords.Angle,
        [`${prefix}XAxis`]: coords.XAxis,
        [`${prefix}YAxis`]: coords.YAxis,
        [`${prefix}Distance`]: coords.Distance,
        [`${prefix}Speaker`]: coords.Speaker
      };

      const mappingData: MicPlacementMapping = {
        id: editingMapping?.id,
        gear: editingMapping?.gear || cabName,
        cabName: editingMapping?.cabName || editingMapping?.gear || cabName,
        cabGuid: editingMapping?.cabGuid || cabGuid,
        micSlot: editingMapping?.micSlot || (isSlot1 ? 'Mic_1' : 'Mic_0'),
        micIndex: editingMapping?.micIndex !== undefined ? editingMapping.micIndex : (isSlot1 ? 1 : 0),
        friendly_setting: editingMapping?.friendly_setting || (isSlot1 ? 'Mic_1_Placement' : 'Mic_0_Placement'),
        friendly_value: newLabel.trim() || editingMapping?.friendly_value || 'Cap Edge, Close, On Axis',
        friendly_placement: newPosition,
        friendly_orientation: newPosition === 'Cap' ? undefined : newOrientation,
        friendly_distance: newDistance,
        friendly_angle: newAngle,
        friendlyPlacement: newPosition,
        friendlyOrientation: newPosition === 'Cap' ? undefined : newOrientation,
        friendlyDistance: newDistance,
        friendlyAngle: newAngle,
        canonicalPlacementName: newLabel.trim() || editingMapping?.canonicalPlacementName || 'Cap Edge, Close, On Axis',
        maps_to: xmlValues,
        xml_values: xmlValues,
        status: newStatus,
        validationStatus: newStatus === 'estimated' ? 'needs_review' : newStatus,
        confidence: useManualCoordinates ? 'low' : 'medium',
        source: editingMapping ? (editingMapping.source || 'user_edited') : 'manual_calibration',
        notes: newNotes.trim() ? newNotes.trim() : undefined,
        micModelName: editingMapping?.micModelName,
        micModelGuid: editingMapping?.micModelGuid,
        micModelScope: editingMapping?.micModelScope,
        speakerModelName: editingMapping?.speakerModelName,
        speakerModelGuid: editingMapping?.speakerModelGuid
      };

      await at5DatabaseService.saveMicPlacementMapping(mappingData);

      await loadMappings();
      if (onRefreshChain) onRefreshChain();

      const actionWord = editingMapping ? 'Updated' : 'Saved';
      setSaveSuccessMsg(`${actionWord} profile "${mappingData.friendly_value}" for cabinet "${mappingData.cabName}".`);
      setShowAddModal(false);
      setEditingMapping(null);
      setNewLabel('');
      setNewNotes('');
    } catch (err: any) {
      setSaveErrorMsg(`Failed to save mapping: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Single shared deletion workflow entry point
  const requestDeleteCustomMicPlacement = (profile: MicPlacementMapping | null) => {
    if (!profile) return;
    setDeletingMapping(profile);
  };

  // Authoritative deletion execution targeting original persistent Firestore document ID
  const executeDeleteCustomMicPlacement = async () => {
    if (!deletingMapping) return;

    // Prioritize persistent identity: firestoreDocumentId -> id -> originalProfileId
    // CRITICAL: NEVER derive the Firestore deletion target from normalized slot or editor state
    const targetDocId = (
      deletingMapping.firestoreDocumentId ||
      deletingMapping.id ||
      deletingMapping.originalProfileId
    )?.trim();

    if (!targetDocId) {
      const errorMsg = 'Failed to delete Mic Placement Profile: Missing persistent Firestore document ID.';
      console.error(errorMsg, deletingMapping);
      setSaveErrorMsg(errorMsg);
      setDeletingMapping(null);
      return;
    }

    setIsDeleting(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      console.log(`[MicPlacementManagementView] Deleting profile with persistent document ID: "${targetDocId}"`);
      await at5DatabaseService.deleteMicPlacementMapping(targetDocId);

      // Refresh registered profile state across app
      await loadMappings();
      if (onRefreshChain) onRefreshChain();

      // If Edit modal was open for this mapping, close it cleanly
      if (
        editingMapping &&
        (editingMapping.id === targetDocId ||
         editingMapping.firestoreDocumentId === targetDocId ||
         editingMapping.originalProfileId === targetDocId)
      ) {
        setShowAddModal(false);
        setEditingMapping(null);
      }

      // Close confirmation dialog
      setDeletingMapping(null);

      // Provide visible success feedback
      setSaveSuccessMsg('Mic Placement Profile deleted successfully.');
    } catch (err: any) {
      console.error(`[MicPlacementManagementView] Failed to delete mic placement profile "${targetDocId}":`, err);
      let readableError = err.message || String(err);
      try {
        const parsed = JSON.parse(readableError);
        if (parsed.error) readableError = parsed.error;
      } catch {
        // Not JSON
      }
      if (
        readableError.includes('Must be signed in') ||
        readableError.includes('permission-denied') ||
        readableError.includes('insufficient permissions')
      ) {
        readableError = 'You must be signed in with Google to delete profiles from Firestore.';
      }
      setSaveErrorMsg(`Failed to delete Mic Placement Profile: ${readableError}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Edit Built-in Reference Coordinates modal
  const handleOpenRefEdit = () => {
    const coords = getVIRCalibrationCoordinates();
    const map: Record<string, { X: number; Y: number; isCalibrated?: boolean }> = {};
    for (const [k, v] of Object.entries(coords.positions)) {
      map[k] = { X: v.X, Y: v.Y, isCalibrated: v.isCalibrated };
    }
    setRefPositions(map);
    setRefDistances({
      "Close": { Distance: coords.distances["Close"].Distance },
      "Medium": { Distance: coords.distances["Medium"].Distance },
      "Far": { Distance: coords.distances["Far"].Distance },
    });
    setRefAngles({
      "On Axis": { Angle: coords.angles["On Axis"].Angle },
      "45° Off Axis": { Angle: coords.angles["45° Off Axis"].Angle },
    });
    setShowRefEditModal(true);
  };

  // Save Built-in Reference Calibration Overrides
  const handleSaveRefOverrides = async () => {
    const posOverrides: Record<string, { X: number; Y: number }> = {};
    for (const [k, v] of Object.entries(refPositions)) {
      if (v && typeof v.X === 'number' && typeof v.Y === 'number' && !isNaN(v.X) && !isNaN(v.Y)) {
        posOverrides[k] = { X: v.X, Y: v.Y };
      }
    }
    if (posOverrides["Cap Edge W"] && !posOverrides["Cap Edge"]) posOverrides["Cap Edge"] = posOverrides["Cap Edge W"];
    if (posOverrides["Cone W"] && !posOverrides["Cone"]) posOverrides["Cone"] = posOverrides["Cone W"];
    if (posOverrides["Cone Edge W"] && !posOverrides["Cone Edge"]) posOverrides["Cone Edge"] = posOverrides["Cone Edge W"];
    const overrides: VIRReferenceOverrides = {
      positions: posOverrides,
      distances: {
        "Close": { Distance: Number(refDistances["Close"].Distance) },
        "Medium": { Distance: Number(refDistances["Medium"].Distance) },
        "Far": { Distance: Number(refDistances["Far"].Distance) },
      },
      angles: {
        "On Axis": { Angle: Number(refAngles["On Axis"].Angle) },
        "45° Off Axis": { Angle: Number(refAngles["45° Off Axis"].Angle) },
      }
    };

    setVIRCalibrationOverrides(overrides);
    try {
      await at5DatabaseService.saveVIRReferenceOverrides(overrides);
    } catch (e) {
      console.warn("Could not save VIR reference overrides to Firestore:", e);
    }
    setRefCalibrationVersion(v => v + 1);
    setSaveSuccessMsg('Updated built-in VIR Reference Calibration coordinates. Overrides are active.');
    setShowRefEditModal(false);
    if (onRefreshChain) onRefreshChain();
  };

  // Reset Built-in Reference to Factory Defaults
  const handleResetRefOverrides = async () => {
    resetVIRCalibrationOverrides();
    try {
      await at5DatabaseService.resetVIRReferenceOverrides();
    } catch (e) {
      console.warn("Could not reset VIR reference overrides in Firestore:", e);
    }
    setRefCalibrationVersion(v => v + 1);
    setSaveSuccessMsg('Restored built-in VIR Reference Calibration to factory verified defaults.');
    setShowRefEditModal(false);
    if (onRefreshChain) onRefreshChain();
  };

  if (!isValidCab) {
    return (
      <div className="space-y-6" id="mic-placement-management-view">
        <div className="bg-[#111116] border border-white/10 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Crosshair className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-lg">
            <h3 className="text-lg font-mono font-bold text-white uppercase tracking-wider">
              No Cabinet Profile Selected
            </h3>
            <p className="text-xs text-gray-400 font-mono leading-relaxed">
              VIR Mic Placement operates only against an active Cabinet Gear Profile. Please select a Cabinet profile from the Gear Profiles view or choose one from the available cabinets below.
            </p>
          </div>

          {cabProfiles && cabProfiles.length > 0 && onSelectCabProfile && (
            <div className="pt-3 flex flex-col items-center gap-2">
              <span className="text-[10px] font-mono uppercase text-gray-400 font-bold tracking-wider">
                Select a Cabinet Profile:
              </span>
              <div className="flex items-center gap-2">
                <select
                  value=""
                  onChange={(e) => {
                    const found = cabProfiles.find(c => (c.id === e.target.value) || (c.guid === e.target.value));
                    if (found) onSelectCabProfile(found);
                  }}
                  className="bg-[#181820] border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-bold rounded-xl px-4 py-2.5 outline-none cursor-pointer transition-all shadow-lg"
                >
                  <option value="" disabled>Choose a cabinet...</option>
                  {cabProfiles.map(cab => (
                    <option key={cab.id || cab.guid} value={cab.id || cab.guid} className="bg-[#18181f] text-white">
                      {cab.displayName} ({cab.guid})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="mic-placement-management-view">
      {/* 1. COMPACT ARCHITECTURE / ACTIVE CABINET & PRECEDENCE BANNER */}
      <CompactArchitectureHeader
        cabName={cabName}
        cabGuid={cabGuid}
        isReferenceCab={isReferenceCab}
        cabProfile={cabProfile}
        cabProfiles={cabProfiles}
        onSelectCabProfile={onSelectCabProfile}
        isLoadingMappings={isLoadingMappings}
        onRefresh={() => loadMappings(true)}
      />

      {/* FEEDBACK ALERTS */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-400 hover:underline text-[10px] uppercase font-bold">Dismiss</button>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{saveErrorMsg}</span>
          </div>
          <button onClick={() => setSaveErrorMsg(null)} className="text-rose-400 hover:underline text-[10px] uppercase font-bold">Dismiss</button>
        </div>
      )}

      {/* 2. FIRESTORE REGISTERED MIC PLACEMENTS PRIMARY WORKSPACE */}
      <FirestoreRegisteredWorkspace
        cabName={cabName}
        cabProfile={cabProfile}
        cabSpecificMappings={cabSpecificMappings}
        onAddPlacementForSlot={handleOpenAddModalForSlot}
        onEditMapping={handleOpenEditMapping}
        onDeleteMapping={requestDeleteCustomMicPlacement}
        onRefresh={() => loadMappings(true)}
      />

      {/* 3. LIVE MIC PLACEMENT RESOLVER SANDBOX */}
      <LiveResolverSandboxSection
        isValidCab={isValidCab}
        testSlot={testSlot}
        setTestSlot={setTestSlot}
        testMicModel={testMicModel}
        setTestMicModel={setTestMicModel}
        testPosition={testPosition}
        setTestPosition={setTestPosition}
        testOrientation={testOrientation}
        setTestOrientation={setTestOrientation}
        testDistance={testDistance}
        setTestDistance={setTestDistance}
        testAngle={testAngle}
        setTestAngle={setTestAngle}
        customTestInput={customTestInput}
        setCustomTestInput={setCustomTestInput}
        useCustomInput={useCustomInput}
        setUseCustomInput={setUseCustomInput}
        liveResolution={liveResolution}
      />

      {/* 4. BUILT-IN VIR REFERENCE CALIBRATION COORDINATES (COLLAPSED BY DEFAULT) */}
      <BuiltInReferenceCalibrationSection
        activeVIRCoordinates={activeVIRCoordinates}
        hasRefOverrides={hasRefOverrides}
        onResetRefOverrides={handleResetRefOverrides}
        onOpenRefEdit={handleOpenRefEdit}
      />

      {/* 6. ADD / EDIT CUSTOM MAPPING MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161b] border border-white/15 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
                  {editingMapping ? 'Custom Mapping Editor' : 'New Mapping Registration'}
                </span>
                <h4 className="text-base font-bold font-display text-white">
                  {editingMapping ? 'Edit Custom Cabinet Mic Placement' : 'Create Custom Cabinet Mic Placement'}
                </h4>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingMapping(null);
                }}
                className="text-gray-400 hover:text-white font-mono text-xs uppercase"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4 font-mono">
              {editingMapping && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-2.5 text-amber-300 text-xs">
                  <Lock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-bold text-[11px] uppercase tracking-wider text-amber-400">Record Identity Locked</div>
                    <div className="text-[10.5px] text-amber-200/80 mt-0.5">
                      Cabinet, Mic Slot, and bound gear identity are permanent. Placement labels, coordinate data, verification status, and notes can be edited below.
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-gray-400 uppercase font-bold flex items-center justify-between">
                    <span>Cabinet Identity</span>
                    {editingMapping && <span className="text-amber-400 flex items-center gap-1 text-[9px]"><Lock className="w-2.5 h-2.5" /> Locked</span>}
                  </label>
                  <div className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 font-mono truncate">
                    {editingMapping ? (editingMapping.cabName || editingMapping.gear || cabName) : cabName}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-gray-400 uppercase font-bold flex items-center justify-between">
                    <span>Mic Slot</span>
                    {editingMapping && <span className="text-amber-400 flex items-center gap-1 text-[9px]"><Lock className="w-2.5 h-2.5" /> Locked</span>}
                  </label>
                  {editingMapping ? (
                    <div className="w-full bg-black/60 border border-amber-500/20 rounded-xl px-3 py-2 text-xs text-gray-400 font-mono flex items-center justify-between">
                      <span>{newSlot === 'Mic_1' ? 'Mic 1 (Slot 1 / AT5 Mic1 / Secondary)' : 'Mic 0 (Slot 0 / AT5 Mic0 / Primary)'}</span>
                      <Lock className="w-3 h-3 text-amber-400/70" />
                    </div>
                  ) : (
                    <select
                      value={newSlot}
                      onChange={(e) => {
                        const s = e.target.value as any;
                        setNewSlot(s);
                        setNewSpeaker(s === 'Mic_0' ? '0' : '1');
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Mic_0">Mic 0 (Slot 0 / AT5 Mic0 / Primary)</option>
                      <option value="Mic_1">Mic 1 (Slot 1 / AT5 Mic1 / Secondary)</option>
                    </select>
                  )}
                </div>
              </div>

              {editingMapping && (editingMapping.micModelName || editingMapping.speakerModelName) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editingMapping.micModelName && (
                    <div className="space-y-1.5">
                      <label className="text-[9.5px] text-gray-400 uppercase font-bold flex items-center justify-between">
                        <span>Bound Mic Model</span>
                        <span className="text-amber-400 flex items-center gap-1 text-[9px]"><Lock className="w-2.5 h-2.5" /> Locked</span>
                      </label>
                      <div className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 font-mono truncate">
                        {editingMapping.micModelName}
                      </div>
                    </div>
                  )}
                  {editingMapping.speakerModelName && (
                    <div className="space-y-1.5">
                      <label className="text-[9.5px] text-gray-400 uppercase font-bold flex items-center justify-between">
                        <span>Bound Speaker Model</span>
                        <span className="text-amber-400 flex items-center gap-1 text-[9px]"><Lock className="w-2.5 h-2.5" /> Locked</span>
                      </label>
                      <div className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 font-mono truncate">
                        {editingMapping.speakerModelName}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[9.5px] text-gray-400 uppercase font-bold">
                    Semantic Placement Label / Tuple
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewLabel(
                      newPosition === 'Cap'
                        ? `${newPosition}, ${newDistance}, ${newAngle}`
                        : `${newPosition}, ${newOrientation}, ${newDistance}, ${newAngle}`
                    )}
                    className="text-[9.5px] text-cyan-400 hover:text-cyan-300 underline font-bold uppercase"
                  >
                    Auto-Fill from Tuple
                  </button>
                </div>
                <input
                  type="text"
                  placeholder='e.g. "Cap Edge, Close", "Cone, 45° Off Axis", "Cone Edge, W, Far"'
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9.5px] text-gray-400 uppercase font-bold block">Speaker Index</label>
                <select
                  value={newSpeaker}
                  onChange={(e) => setNewSpeaker(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="0">Speaker 0 (Top Left / Default Mic 0)</option>
                  <option value="1">Speaker 1 (Top Right / Default Mic 1)</option>
                  <option value="2">Speaker 2 (Bottom Left)</option>
                  <option value="3">Speaker 3 (Bottom Right)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                <span className="text-[10px] text-gray-300 font-bold uppercase">Manual Numeric Coordinate Input</span>
                <input
                  type="checkbox"
                  checked={useManualCoordinates}
                  onChange={(e) => setUseManualCoordinates(e.target.checked)}
                  className="accent-cyan-500 w-4 h-4"
                />
              </div>

              {!useManualCoordinates ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[9.5px] text-gray-400 uppercase font-bold block">Position</label>
                    <select
                      value={newPosition}
                      onChange={(e) => setNewPosition(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Cap">Cap (Center)</option>
                      <option value="Cap Edge">Cap Edge</option>
                      <option value="Cone">Cone</option>
                      <option value="Cone Edge">Cone Edge</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9.5px] text-gray-400 uppercase font-bold block">Orientation</label>
                    {newPosition === 'Cap' ? (
                      <div className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-500 italic">
                        Centre (N/A)
                      </div>
                    ) : (
                      <select
                        value={newOrientation}
                        onChange={(e) => setNewOrientation(e.target.value as SemanticOrientation)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="W">W · 09:00 (Factory Calibrated)</option>
                        <option value="N">N · 00:00</option>
                        <option value="E">E · 03:00</option>
                        <option value="S">S · 06:00</option>
                      </select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9.5px] text-gray-400 uppercase font-bold block">Distance</label>
                    <select
                      value={newDistance}
                      onChange={(e) => setNewDistance(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Close">Close</option>
                      <option value="Medium">Medium</option>
                      <option value="Far">Far</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9.5px] text-gray-400 uppercase font-bold block">Angle</label>
                    <select
                      value={newAngle}
                      onChange={(e) => setNewAngle(e.target.value as any)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="On Axis">On Axis (0°)</option>
                      <option value="45° Off Axis">45° Off Axis</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase block">XAxis</label>
                    <input
                      type="text"
                      value={customX}
                      onChange={(e) => setCustomX(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase block">YAxis</label>
                    <input
                      type="text"
                      value={customY}
                      onChange={(e) => setCustomY(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase block">Distance</label>
                    <input
                      type="text"
                      value={customDist}
                      onChange={(e) => setCustomDist(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-gray-400 uppercase block">Angle</label>
                    <input
                      type="text"
                      value={customAng}
                      onChange={(e) => setCustomAng(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-gray-400 uppercase font-bold block">Verification Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="validated">Approved (Validated)</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="estimated">Estimated</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-gray-400 uppercase font-bold block">Notes / Provenance</label>
                  <input
                    type="text"
                    placeholder="e.g. Measured on 1960A cab with Shure SM57"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div>
                {editingMapping && (editingMapping.firestoreDocumentId || editingMapping.id || editingMapping.originalProfileId) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDeleteCustomMicPlacement(editingMapping);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-mono font-bold uppercase rounded-xl transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Profile
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingMapping(null);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-mono uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMapping}
                  disabled={isSaving}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold uppercase rounded-xl transition-all shadow"
                >
                  {isSaving ? 'Saving Profile...' : (editingMapping ? 'Update Mic Placement Profile' : 'Save Mic Placement Profile')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. EDIT BUILT-IN VIR REFERENCE CALIBRATION COORDINATES MODAL */}
      {showRefEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161b] border border-cyan-500/30 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-cyan-500/10 text-cyan-400">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
                    Reference Calibration Tuning (Mic 0)
                  </span>
                </div>
                <h4 className="text-base font-bold font-display text-white">
                  Edit Built-in VIR Reference Calibration Coordinates
                </h4>
              </div>
              <button
                onClick={() => setShowRefEditModal(false)}
                className="text-gray-400 hover:text-white font-mono text-xs uppercase"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl text-cyan-300 text-xs font-mono">
              <span className="font-bold">Edit-Only Protection:</span> Built-in reference calibrations cannot be deleted. Values tuned here override built-in VIR calculations immediately, persist across sessions, and can be restored to factory verified values at any time.
            </div>

            <div className="space-y-5 font-mono text-xs max-h-[60vh] overflow-y-auto pr-2">
              {/* Positions */}
              <div className="space-y-3">
                <h5 className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Position Vectors (X, Y)</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {VIR_REFERENCE_GRID_KEYS.map((pos) => {
                    const coords = refPositions[pos] || { X: 0, Y: 0 };
                    const defPos = VIR_CALIBRATION_COORDINATES.positions[pos as keyof typeof VIR_CALIBRATION_COORDINATES.positions];
                    const hasDefault = defPos && typeof defPos.X === 'number' && !isNaN(defPos.X);
                    const isCenter = pos === 'Cap';
                    const isCalibrated = coords.isCalibrated ?? (hasDefault || isCenter || pos.endsWith(' W') || pos.endsWith(' N'));
                    return (
                      <div key={pos} className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-white font-bold text-[11px]">{pos}</span>
                            {(() => {
                              const match = pos.match(/ ([NESW])$/);
                              const orient = match ? (match[1] as SemanticOrientation) : undefined;
                              return orient ? (
                                <span className="text-[8px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1 py-0.2 rounded font-normal">
                                  {CARDINAL_ORIENTATION_CLOCK[orient]}
                                </span>
                              ) : null;
                            })()}
                            {isCenter ? (
                              <span className="text-[8px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-bold uppercase">Center</span>
                            ) : isCalibrated ? (
                              <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">Calibrated</span>
                            ) : (
                              <span className="text-[8px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">Uncalibrated</span>
                            )}
                          </div>
                          <span className="text-[9px] text-gray-500">
                            Default: {hasDefault ? `(${defPos.X.toFixed(4)}, ${defPos.Y.toFixed(4)})` : 'Awaiting AT5'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] text-gray-400 block mb-0.5">X Axis</label>
                            <input
                              type="number"
                              step="0.000001"
                              value={coords.X !== null && coords.X !== undefined ? coords.X : ''}
                              placeholder={isCalibrated ? '0.000000' : 'Awaiting AT5'}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setRefPositions(prev => ({
                                  ...prev,
                                  [pos]: { ...prev[pos], X: val, isCalibrated: true }
                                }));
                              }}
                              className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-gray-600"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-gray-400 block mb-0.5">Y Axis</label>
                            <input
                              type="number"
                              step="0.000001"
                              value={coords.Y !== null && coords.Y !== undefined ? coords.Y : ''}
                              placeholder={isCalibrated ? '0.000000' : 'Awaiting AT5'}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setRefPositions(prev => ({
                                  ...prev,
                                  [pos]: { ...prev[pos], Y: val, isCalibrated: true }
                                }));
                              }}
                              className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-gray-600"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Distances */}
              <div className="space-y-3">
                <h5 className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Distance Offsets</h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(refDistances).map(([dist, coords]) => (
                    <div key={dist} className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-[11px]">{dist}</span>
                        <span className="text-[9px] text-gray-500">
                          Default: {VIR_CALIBRATION_COORDINATES.distances[dist as keyof typeof VIR_CALIBRATION_COORDINATES.distances]?.Distance}
                        </span>
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 block mb-0.5">Distance</label>
                        <input
                          type="number"
                          step="0.1"
                          value={coords.Distance}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setRefDistances(prev => ({
                              ...prev,
                              [dist]: { Distance: val }
                            }));
                          }}
                          className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Angles */}
              <div className="space-y-3">
                <h5 className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">Angle Offsets</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(refAngles).map(([ang, coords]) => (
                    <div key={ang} className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-[11px]">{ang}</span>
                        <span className="text-[9px] text-gray-500">
                          Default: {VIR_CALIBRATION_COORDINATES.angles[ang as keyof typeof VIR_CALIBRATION_COORDINATES.angles]?.Angle}
                        </span>
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 block mb-0.5">Angle Value</label>
                        <input
                          type="number"
                          step="1"
                          value={coords.Angle}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setRefAngles(prev => ({
                              ...prev,
                              [ang]: { Angle: val }
                            }));
                          }}
                          className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 font-mono">
              <button
                onClick={handleResetRefOverrides}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs uppercase rounded-xl transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Factory Defaults</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRefEditModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-xs uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRefOverrides}
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold uppercase rounded-xl transition-all shadow"
                >
                  Save Reference Coordinates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 7. DELETE CONFIRMATION MODAL */}
      {deletingMapping && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-[#18181f] border border-rose-500/30 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold font-display text-white">
                  Delete Custom Mic Placement?
                </h4>
                <p className="text-xs text-gray-400 font-mono">
                  This permanently removes this calibrated placement profile.
                </p>
              </div>
            </div>

            {/* Profile summary card */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-[10px] uppercase font-bold">Semantic Placement:</span>
                <span className="text-white font-bold">
                  {deletingMapping.friendly_value || deletingMapping.friendly_name || deletingMapping.canonicalPlacementName || 'Placement'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-[10px] uppercase font-bold">Cabinet:</span>
                <span className="text-gray-300">
                  {deletingMapping.cabName || deletingMapping.gear || cabName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-[10px] uppercase font-bold">Slot:</span>
                <span className="text-cyan-400 font-bold">
                  {(deletingMapping.friendly_setting || deletingMapping.target || 'Mic_0_Placement').replace(/_/g, ' ')}
                </span>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-500">
                <span>Target Document:</span>
                <span className="font-mono text-gray-400 truncate max-w-[200px]" title={deletingMapping.firestoreDocumentId || deletingMapping.id || deletingMapping.originalProfileId}>
                  {deletingMapping.firestoreDocumentId || deletingMapping.id || deletingMapping.originalProfileId}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 font-mono">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingMapping(null)}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs uppercase rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeDeleteCustomMicPlacement}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-lg shadow-rose-950/40 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting Profile...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
