import React, { useState, useEffect, useMemo } from 'react';
import { 
  MicPlacementMapping, 
  GearProfile 
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
  VIRCoordinates
} from '../services/at5MicPlacementService';
import { at5DatabaseService } from '../services/at5DatabaseService';
import { 
  Sliders, 
  CheckCircle2, 
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
  Compass
} from 'lucide-react';

interface MicPlacementManagementViewProps {
  cabProfile?: GearProfile | null;
  onRefreshChain?: () => void;
}

export const MicPlacementManagementView: React.FC<MicPlacementManagementViewProps> = ({
  cabProfile,
  onRefreshChain
}) => {
  const [dbMappings, setDbMappings] = useState<MicPlacementMapping[]>([]);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Live Tester / Sandbox state
  const [testSlot, setTestSlot] = useState<'Mic_1' | 'Mic_2'>('Mic_1');
  const [testMicModel, setTestMicModel] = useState<string>('Dynamic 57');
  const [testPosition, setTestPosition] = useState<SemanticPosition>('Cap Edge');
  const [testDistance, setTestDistance] = useState<SemanticDistance>('Close');
  const [testAngle, setTestAngle] = useState<SemanticAngle>('On Axis');
  const [customTestInput, setCustomTestInput] = useState<string>('');
  const [useCustomInput, setUseCustomInput] = useState<boolean>(false);

  // Custom Mapping Creator state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSlot, setNewSlot] = useState<'Mic_1' | 'Mic_2'>('Mic_1');
  const [newLabel, setNewLabel] = useState('');
  const [newPosition, setNewPosition] = useState<SemanticPosition>('Cap Edge');
  const [newDistance, setNewDistance] = useState<SemanticDistance>('Close');
  const [newAngle, setNewAngle] = useState<SemanticAngle>('On Axis');
  const [newSpeaker, setNewSpeaker] = useState<'0' | '1' | '2' | '3'>('0');
  const [customX, setCustomX] = useState('-0.214223');
  const [customY, setCustomY] = useState('-0.00519017');
  const [customDist, setCustomDist] = useState('0');
  const [customAng, setCustomAng] = useState('0');
  const [useManualCoordinates, setUseManualCoordinates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const cabName = cabProfile?.displayName || VIR_REFERENCE_CABINETS[0].name;
  const cabGuid = cabProfile?.guid || VIR_REFERENCE_CABINETS[0].guid;
  const isReferenceCab = isVIRReferenceCabinet(cabName, cabGuid);

  const loadMappings = async () => {
    setIsLoadingMappings(true);
    try {
      const mappings = await at5DatabaseService.getMicPlacementMappings();
      setDbMappings(mappings);
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
    const cleanCab = cabName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return dbMappings.filter(m => {
      const gearClean = (m.gear || m.cabName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return gearClean === cleanCab || (m.cabGuid && cabGuid && m.cabGuid.toLowerCase().replace(/[^a-z0-9]/g, '') === cabGuid.toLowerCase().replace(/[^a-z0-9]/g, ''));
    });
  }, [dbMappings, cabName, cabGuid]);

  // Live resolution result in sandbox
  const liveResolution: PlacementResolutionResult = useMemo(() => {
    const inputLabel = useCustomInput 
      ? customTestInput 
      : `${testPosition}, ${testDistance}${testAngle !== 'On Axis' ? `, ${testAngle}` : ''}`;

    return resolveCompositeMicPlacement({
      cabName,
      cabGuid,
      micSlot: testSlot,
      requestedLabel: inputLabel,
      micModelName: testMicModel,
      dbMappings
    });
  }, [cabName, cabGuid, testSlot, testMicModel, testPosition, testDistance, testAngle, customTestInput, useCustomInput, dbMappings]);

  // Handle saving new mapping
  const handleSaveNewMapping = async () => {
    if (!newLabel.trim()) {
      setSaveErrorMsg('Please provide a semantic label (e.g. "Cap Edge, Close").');
      return;
    }

    setIsSaving(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const prefix = newSlot === 'Mic_1' ? 'Mic0' : 'Mic1';
      let coords: { Angle: number; XAxis: number; YAxis: number; Distance: number; Speaker: number };

      if (useManualCoordinates) {
        coords = {
          Angle: Number(customAng) || 0,
          XAxis: Number(customX) || 0,
          YAxis: Number(customY) || 0,
          Distance: Number(customDist) || 0,
          Speaker: Number(newSpeaker) || (newSlot === 'Mic_1' ? 0 : 1)
        };
      } else {
        const composed = composeVIRCoordinates(newPosition, newDistance, newAngle, newSlot, Number(newSpeaker));
        coords = composed;
      }

      const xmlValues: Record<string, number> = {
        [`${prefix}Angle`]: coords.Angle,
        [`${prefix}XAxis`]: coords.XAxis,
        [`${prefix}YAxis`]: coords.YAxis,
        [`${prefix}Distance`]: coords.Distance,
        [`${prefix}Speaker`]: coords.Speaker
      };

      // Manual coordinate edits or new entries must be marked as needs_review, not at5p_validated
      await at5DatabaseService.saveMicPlacementMapping({
        gear: cabName,
        cabName,
        cabGuid,
        friendly_setting: newSlot === 'Mic_1' ? 'Mic_1_Placement' : 'Mic_2_Placement',
        friendly_value: newLabel.trim(),
        friendly_placement: newPosition,
        friendly_distance: newDistance,
        friendly_angle: newAngle,
        friendlyPlacement: newPosition,
        friendlyDistance: newDistance,
        friendlyAngle: newAngle,
        maps_to: xmlValues,
        status: 'needs_review',
        validationStatus: 'needs_review',
        confidence: useManualCoordinates ? 'low' : 'medium',
        source: 'manual_calibration'
      });

      // Dedicated refresh path - do NOT trigger global parameter manifest refresh
      await loadMappings();
      if (onRefreshChain) onRefreshChain();

      setSaveSuccessMsg(`Saved mapping "${newLabel}" for cabinet "${cabName}" (Status: Needs Review).`);
      setShowAddModal(false);
      setNewLabel('');
    } catch (err: any) {
      setSaveErrorMsg(`Failed to save mapping: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMapping = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('Delete this mic placement profile?')) return;
    try {
      await at5DatabaseService.deleteMicPlacementMapping(id);
      // Dedicated refresh path - do NOT trigger global parameter manifest refresh
      await loadMappings();
      if (onRefreshChain) onRefreshChain();
      setSaveSuccessMsg('Mapping deleted successfully.');
    } catch (err: any) {
      setSaveErrorMsg(`Failed to delete mapping: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8" id="mic-placement-management-view">
      {/* 1. HEADER & PRECEDENCE BANNER */}
      <div className="bg-[#111116] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Crosshair className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                AT5 VIR Cabinet Mic Placement Architecture
              </span>
            </div>
            <h3 className="text-xl font-bold font-display text-white tracking-tight">
              Semantic 3D Coordinate Calibration & Precedence Resolver
            </h3>
            <p className="text-xs text-gray-400 font-mono max-w-3xl leading-relaxed">
              Maps human semantic microphone placement labels (e.g. <span className="text-white font-bold">Cap Edge, Close</span>, <span className="text-white font-bold">Cone, 45° Off Axis</span>) into exact AmpliTube 5 VIR grid coordinates with strict hierarchical precedence and scope-limited reference protection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadMappings}
              disabled={isLoadingMappings}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl transition-all"
              title="Refresh database mappings"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingMappings ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold uppercase rounded-xl transition-all shadow flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Mapping</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK ALERTS */}
        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-400 hover:underline text-[10px] uppercase font-bold">Dismiss</button>
          </div>
        )}

        {saveErrorMsg && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{saveErrorMsg}</span>
            </div>
            <button onClick={() => setSaveErrorMsg(null)} className="text-rose-400 hover:underline text-[10px] uppercase font-bold">Dismiss</button>
          </div>
        )}

        {/* PRECEDENCE TIER HIERARCHY BAR */}
        <div className="mt-6 pt-5 border-t border-white/5 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Tier 1: Firestore</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Exact</span>
            </div>
            <p className="text-[11px] text-gray-300 font-medium">Exact verified Firestore mapping for cabinet + mic slot.</p>
          </div>

          <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Tier 2: VIR Reference</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">Mic 1 Only</span>
            </div>
            <p className="text-[11px] text-gray-300 font-medium">Verified on 4x12 Brit 8000 + Dynamic 57. Mic 2 is a calibration gap.</p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Tier 3: Estimated</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Needs Review</span>
            </div>
            <p className="text-[11px] text-gray-300 font-medium">Estimated/discovered mapping in Firestore requiring review.</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-800/40 border border-white/10 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tier 4: Safe Default</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-300 font-bold">Fallback</span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Safe coordinates (0) with warning. Never silent contamination.</p>
          </div>
        </div>
      </div>

      {/* 2. ACTIVE CABINET CONTEXT & REFERENCE SCOPE BADGE */}
      <div className="bg-[#141418] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold tracking-wider">Active Target Cabinet:</span>
            <span className="text-sm font-bold font-mono text-white">{cabName}</span>
            <span className="text-[10px] font-mono text-gray-500 truncate max-w-[280px]">({cabGuid})</span>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            {isReferenceCab ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                This cabinet is the verified VIR reference model (4x12 Brit 8000). Built-in reference calibration is active for Mic 1.
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Non-reference cabinet model. Requires explicit Firestore mapping profiles to prevent reference coordinate contamination.
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-mono font-bold px-3 py-1 rounded-lg border ${
            isReferenceCab 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {isReferenceCab ? 'VIR REFERENCE CALIBRATED' : 'CUSTOM SCOPE ENFORCED'}
          </span>
        </div>
      </div>

      {/* 3. INTERACTIVE RESOLVER SANDBOX & TESTER */}
      <div className="bg-[#121217] border border-white/10 rounded-3xl p-6 space-y-6 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                Live Mic Placement Resolver Sandbox
              </h4>
            </div>
            <p className="text-xs text-gray-400 font-mono">
              Test how any semantic placement input resolves in real time according to the strict 4-tier precedence.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setUseCustomInput(false)}
              className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-lg transition-all ${!useCustomInput ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Grid Selectors
            </button>
            <button
              onClick={() => setUseCustomInput(true)}
              className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-lg transition-all ${useCustomInput ? 'bg-cyan-500 text-black shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Raw Semantic String
            </button>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-black/30 p-4 rounded-2xl border border-white/5">
          <div className="space-y-1.5">
            <label className="text-[9.5px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Target Mic Slot</label>
            <select
              value={testSlot}
              onChange={(e) => setTestSlot(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Mic_1">Mic 0 (Mic0 Slot / Speaker 0 - Calibrated)</option>
              <option value="Mic_2">Mic 1 (Mic1 Slot / Speaker 1 - Calibration Gap)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9.5px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Mic Model</label>
            <select
              value={testMicModel}
              onChange={(e) => setTestMicModel(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
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
                <label className="text-[9.5px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Position</label>
                <select
                  value={testPosition}
                  onChange={(e) => setTestPosition(e.target.value as any)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Cap">Cap (Center)</option>
                  <option value="Cap Edge">Cap Edge</option>
                  <option value="Cone">Cone</option>
                  <option value="Cone Edge">Cone Edge</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9.5px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Distance & Angle</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={testDistance}
                    onChange={(e) => setTestDistance(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Close">Close</option>
                    <option value="Medium">Medium</option>
                    <option value="Far">Far</option>
                  </select>
                  <select
                    value={testAngle}
                    onChange={(e) => setTestAngle(e.target.value as any)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="On Axis">On Axis (0°)</option>
                    <option value="45° Off Axis">45° Off Axis</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[9.5px] font-mono text-gray-400 uppercase tracking-wider block font-bold">Custom Semantic String Input</label>
              <input
                type="text"
                placeholder='e.g. "Cap Edge, Close", "Cone, 45° Off Axis", "Cone Edge, Far"'
                value={customTestInput}
                onChange={(e) => setCustomTestInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600"
              />
            </div>
          )}
        </div>

        {/* LIVE RESOLVER OUTPUT CARD */}
        <div className="bg-[#18181f] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">Resolver Tier / Source:</span>
              <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                liveResolution.resolutionSource === 'firestore_verified'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : liveResolution.resolutionSource === 'reference_calibration_vir'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : liveResolution.resolutionSource === 'estimated_profile'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              }`}>
                {liveResolution.resolutionSource === 'firestore_verified' && 'TIER 1: FIRESTORE VERIFIED'}
                {liveResolution.resolutionSource === 'reference_calibration_vir' && 'TIER 2: VIR REFERENCE CALIBRATION (MIC 1 ONLY)'}
                {liveResolution.resolutionSource === 'estimated_profile' && 'TIER 3: ESTIMATED PROFILE (NEEDS REVIEW)'}
                {liveResolution.resolutionSource === 'safe_default' && 'TIER 4: SAFE DEFAULT / UNCALIBRATED GAP'}
                {liveResolution.resolutionSource === 'cab_default' && 'CAB DEFAULT (UNSPECIFIED)'}
              </span>
            </div>

            <div className="text-[10px] font-mono text-gray-400">
              Parsed Canonical: <span className="text-white font-bold">{liveResolution.parsedLabel || 'N/A'}</span>
            </div>
          </div>

          {/* Coordinate grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            {Object.entries(liveResolution.coordinates).map(([key, val]) => (
              <div key={key} className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">{key}</span>
                <span className="text-sm font-mono font-bold text-white block">{val}</span>
              </div>
            ))}
          </div>

          {/* Warning or notes */}
          {liveResolution.warning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-mono flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{liveResolution.warning}</span>
            </div>
          )}
        </div>
      </div>

      {/* 4. VERIFIED VIR REFERENCE CALIBRATION GRID TABLE */}
      <div className="bg-[#111116] border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                Built-in VIR Reference Calibration Coordinates (Numeric)
              </h4>
            </div>
            <p className="text-xs text-gray-400 font-mono">
              Calibrated values from 7 controlled AT5P exports for reference cabinet (<span className="text-gray-300">4x12 Brit 8000</span>, GUID: <span className="text-gray-300">7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b</span>) and reference mic (<span className="text-gray-300">Dynamic 57</span>, GUID: <span className="text-gray-300">1e41acc4-85af-4e84-bee4-eabc0be5fef1</span>).
            </p>
          </div>

          <span className="text-[9px] font-mono px-2.5 py-1 rounded bg-white/5 border border-white/10 text-gray-400 uppercase">
            Built-in Reference
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Position coordinates table */}
          <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
            <h5 className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">Position Vectors (X, Y)</h5>
            <div className="divide-y divide-white/5 font-mono text-xs">
              {Object.entries(VIR_CALIBRATION_COORDINATES.positions).map(([pos, coords]) => (
                <div key={pos} className="py-2 flex items-center justify-between">
                  <span className="text-gray-300 font-bold">{pos}</span>
                  <div className="flex items-center gap-4 text-gray-400">
                    <span>X: <span className="text-white">{coords.X}</span></span>
                    <span>Y: <span className="text-white">{coords.Y}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distance & Angle coordinates table */}
          <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
            <h5 className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">Distance & Angle Offsets</h5>
            <div className="divide-y divide-white/5 font-mono text-xs">
              {Object.entries(VIR_CALIBRATION_COORDINATES.distances).map(([dist, coords]) => (
                <div key={dist} className="py-2 flex items-center justify-between">
                  <span className="text-gray-300 font-bold">{dist}</span>
                  <span className="text-gray-400">Distance: <span className="text-white">{coords.Distance}</span></span>
                </div>
              ))}
              {Object.entries(VIR_CALIBRATION_COORDINATES.angles).map(([ang, coords]) => (
                <div key={ang} className="py-2 flex items-center justify-between">
                  <span className="text-gray-300 font-bold">{ang}</span>
                  <span className="text-gray-400">Angle: <span className="text-white">{coords.Angle}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. DATABASE REGISTERED PROFILES FOR THIS CABINET */}
      <div className="bg-[#111116] border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <h4 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Firestore Registered Mic Placements for "{cabName}" ({cabSpecificMappings.length})
            </h4>
            <p className="text-xs text-gray-400 font-mono">
              Custom calibrated profiles stored persistently in Firestore. These take top precedence (Tier 1).
            </p>
          </div>
        </div>

        {cabSpecificMappings.length === 0 ? (
          <div className="p-8 text-center bg-black/20 border border-white/5 rounded-2xl space-y-2">
            <p className="text-xs text-gray-500 font-mono uppercase">No custom Firestore mic placement profiles created for this cabinet yet.</p>
            <p className="text-[11px] text-gray-600 font-mono">Click &quot;Add Custom Mapping&quot; or import a .at5p preset to register custom calibrated placements.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cabSpecificMappings.map((m, idx) => {
              const xml = m.maps_to || m.xml_values || {};
              const slot = m.friendly_setting || m.target || 'Mic_1_Placement';
              const label = m.friendly_value || m.friendly_name || 'Placement';
              const status = m.status || m.validationStatus || 'needs_review';

              return (
                <div key={m.id || idx} className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold">{slot.replace(/_/g, ' ')}</span>
                      <h5 className="text-sm font-bold font-mono text-white">{label}</h5>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${
                        status === 'validated' || status === 'at5p_validated'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {status.replace(/_/g, ' ')}
                      </span>
                      <button
                        onClick={() => handleDeleteMapping(m.id)}
                        className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all"
                        title="Delete mapping"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 bg-white/5 p-2 rounded-xl text-center font-mono">
                    {Object.entries(xml).map(([k, v]) => (
                      <div key={k} className="space-y-0.5">
                        <span className="text-[8px] text-gray-500 block truncate">{k.replace(/Mic[01]/, '')}</span>
                        <span className="text-[11px] font-bold text-white block truncate">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. ADD CUSTOM MAPPING MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16161b] border border-white/15 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-cyan-400 uppercase font-bold tracking-wider">New Mapping Registration</span>
                <h4 className="text-base font-bold font-display text-white">Create Custom Cabinet Mic Placement</h4>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white font-mono text-xs uppercase"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4 font-mono">
              <div className="space-y-1.5">
                <label className="text-[9.5px] text-gray-400 uppercase font-bold block">Semantic Label / Name</label>
                <input
                  type="text"
                  placeholder='e.g. "Cap Edge, Close", "Cone, 45° Off Axis"'
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-gray-400 uppercase font-bold block">Mic Slot</label>
                  <select
                    value={newSlot}
                    onChange={(e) => {
                      const s = e.target.value as any;
                      setNewSlot(s);
                      setNewSpeaker(s === 'Mic_1' ? '0' : '1');
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Mic_1">Mic 0 (Mic 0 Slot)</option>
                    <option value="Mic_2">Mic 1 (Mic 1 Slot)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9.5px] text-gray-400 uppercase font-bold block">Speaker Index</label>
                  <select
                    value={newSpeaker}
                    onChange={(e) => setNewSpeaker(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="0">Speaker 0 (Top Left / Default Mic 1)</option>
                    <option value="1">Speaker 1 (Top Right / Default Mic 2)</option>
                    <option value="2">Speaker 2 (Bottom Left)</option>
                    <option value="3">Speaker 3 (Bottom Right)</option>
                  </select>
                </div>
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
                <div className="grid grid-cols-3 gap-3">
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
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-mono uppercase rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewMapping}
                disabled={isSaving}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold uppercase rounded-xl transition-all shadow"
              >
                {isSaving ? 'Saving Profile...' : 'Save Mic Placement Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
