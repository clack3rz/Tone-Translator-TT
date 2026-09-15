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
  VIRCoordinates,
  getVIRCalibrationCoordinates,
  getVIRCalibrationOverrides,
  setVIRCalibrationOverrides,
  resetVIRCalibrationOverrides,
  VIRReferenceOverrides
} from '../services/at5MicPlacementService';
import { at5DatabaseService } from '../services/at5DatabaseService';
import { setDbMicPlacementMappings, ensureMicPlacementDataLoaded } from '../services/at5ParameterManifest';
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
  Compass,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
  Lock,
  Loader2
} from 'lucide-react';

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
  const [refPositions, setRefPositions] = useState<Record<string, { X: number; Y: number }>>({
    "Cap": { X: VIR_CALIBRATION_COORDINATES.positions["Cap"].X, Y: VIR_CALIBRATION_COORDINATES.positions["Cap"].Y },
    "Cap Edge": { X: VIR_CALIBRATION_COORDINATES.positions["Cap Edge"].X, Y: VIR_CALIBRATION_COORDINATES.positions["Cap Edge"].Y },
    "Cone": { X: VIR_CALIBRATION_COORDINATES.positions["Cone"].X, Y: VIR_CALIBRATION_COORDINATES.positions["Cone"].Y },
    "Cone Edge": { X: VIR_CALIBRATION_COORDINATES.positions["Cone Edge"].X, Y: VIR_CALIBRATION_COORDINATES.positions["Cone Edge"].Y },
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
      : `${testPosition}, ${testDistance}${testAngle !== 'On Axis' ? `, ${testAngle}` : ''}`;

    return resolveCompositeMicPlacement({
      cabName,
      cabGuid,
      micSlot: testSlot,
      requestedLabel: inputLabel,
      micModelName: testMicModel,
      dbMappings
    });
  }, [isValidCab, cabName, cabGuid, testSlot, testMicModel, testPosition, testDistance, testAngle, customTestInput, useCustomInput, dbMappings, refCalibrationVersion]);

  // Handle open Add Modal (clean state)
  const handleOpenAddModal = () => {
    setEditingMapping(null);
    setNewSlot('Mic_0');
    setNewLabel('');
    setNewPosition('Cap Edge');
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

  // Handle open Edit Modal for a custom profile
  const handleOpenEditMapping = (m: MicPlacementMapping) => {
    setEditingMapping(m);
    const xml = m.maps_to || m.xml_values || {};
    const slotKey = (m.friendly_setting || m.target || 'Mic_0_Placement').toLowerCase();
    const isSlot1 = slotKey.includes('mic1') || slotKey.includes('mic2') || m.micIndex === 1;
    const resolvedSlot: 'Mic_0' | 'Mic_1' = isSlot1 ? 'Mic_1' : 'Mic_0';

    setNewSlot(resolvedSlot);
    setNewLabel(m.friendly_value || m.friendly_name || m.canonicalPlacementName || '');
    setNewPosition((m.friendlyPlacement || m.friendly_placement || 'Cap Edge') as SemanticPosition);
    setNewDistance((m.friendlyDistance || m.friendly_distance || 'Close') as SemanticDistance);
    setNewAngle((m.friendlyAngle || m.friendly_angle || 'On Axis') as SemanticAngle);
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
        friendly_distance: newDistance,
        friendly_angle: newAngle,
        friendlyPlacement: newPosition,
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
    setRefPositions({
      "Cap": { X: coords.positions["Cap"].X, Y: coords.positions["Cap"].Y },
      "Cap Edge": { X: coords.positions["Cap Edge"].X, Y: coords.positions["Cap Edge"].Y },
      "Cone": { X: coords.positions["Cone"].X, Y: coords.positions["Cone"].Y },
      "Cone Edge": { X: coords.positions["Cone Edge"].X, Y: coords.positions["Cone Edge"].Y },
    });
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
    const overrides: VIRReferenceOverrides = {
      positions: {
        "Cap": { X: Number(refPositions["Cap"].X), Y: Number(refPositions["Cap"].Y) },
        "Cap Edge": { X: Number(refPositions["Cap Edge"].X), Y: Number(refPositions["Cap Edge"].Y) },
        "Cone": { X: Number(refPositions["Cone"].X), Y: Number(refPositions["Cone"].Y) },
        "Cone Edge": { X: Number(refPositions["Cone Edge"].X), Y: Number(refPositions["Cone Edge"].Y) },
      },
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
              onClick={() => loadMappings(true)}
              disabled={isLoadingMappings}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl transition-all"
              title="Refresh database mappings"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingMappings ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenAddModal}
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
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">Mic 0 Only</span>
            </div>
            <p className="text-[11px] text-gray-300 font-medium">Verified on 4x12 Brit 8000 + Dynamic 57. Mic 1 is a calibration gap.</p>
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
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold tracking-wider">Active Target Cabinet:</span>
            {cabProfiles && cabProfiles.length > 0 && onSelectCabProfile ? (
              <div className="flex items-center gap-2">
                <select
                  value={cabProfile?.id || cabProfile?.guid || ''}
                  onChange={(e) => {
                    const selected = cabProfiles.find(c => (c.id === e.target.value) || (c.guid === e.target.value));
                    if (selected) {
                      onSelectCabProfile(selected);
                    }
                  }}
                  className="bg-[#1e1e24] border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 text-xs font-mono font-bold rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-cyan-400 transition-all cursor-pointer shadow-sm"
                >
                  {cabProfiles.map(cab => (
                    <option key={cab.id || cab.guid} value={cab.id || cab.guid} className="bg-[#18181f] text-white">
                      {cab.displayName}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] font-mono text-gray-500 truncate max-w-[280px]">({cabGuid})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono text-white">{cabName}</span>
                <span className="text-[10px] font-mono text-gray-500 truncate max-w-[280px]">({cabGuid})</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 font-mono">
            {isReferenceCab ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                This cabinet is the verified VIR reference model (4x12 Brit 8000). Built-in reference calibration is active for Mic 0.
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
              <option value="Mic_0">Mic 0 (Mic0 Slot / Speaker 0 - Calibrated)</option>
              <option value="Mic_1">Mic 1 (Mic1 Slot / Speaker 1 - Calibration Gap)</option>
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
                {liveResolution.resolutionSource === 'reference_calibration_vir' && 'TIER 2: VIR REFERENCE CALIBRATION (MIC 0 ONLY)'}
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
        <div className="flex items-center justify-between flex-wrap gap-3">
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

          <div className="flex items-center gap-2">
            {hasRefOverrides && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-mono font-bold uppercase">
                <span>Overrides Active</span>
                <button
                  onClick={handleResetRefOverrides}
                  title="Reset reference values to factory defaults"
                  className="hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
            <button
              onClick={handleOpenRefEdit}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Position coordinates table */}
          <div className="bg-black/30 border border-white/5 rounded-2xl p-4 space-y-3">
            <h5 className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">Position Vectors (X, Y)</h5>
            <div className="divide-y divide-white/5 font-mono text-xs">
              {Object.entries(activeVIRCoordinates.positions).map(([pos, coords]) => (
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
              {Object.entries(activeVIRCoordinates.distances).map(([dist, coords]) => (
                <div key={dist} className="py-2 flex items-center justify-between">
                  <span className="text-gray-300 font-bold">{dist}</span>
                  <span className="text-gray-400">Distance: <span className="text-white">{coords.Distance}</span></span>
                </div>
              ))}
              {Object.entries(activeVIRCoordinates.angles).map(([ang, coords]) => (
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
              const slot = m.friendly_setting || m.target || 'Mic_0_Placement';
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
                        onClick={() => handleOpenEditMapping(m)}
                        className="p-1.5 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition-all"
                        title="Edit custom profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteCustomMicPlacement(m);
                        }}
                        className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-all"
                        title="Delete custom profile"
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
                    Semantic Placement Label / Triplet
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewLabel(`${newPosition}, ${newDistance}, ${newAngle}`)}
                    className="text-[9.5px] text-cyan-400 hover:text-cyan-300 underline font-bold uppercase"
                  >
                    Auto-Fill from Triplet
                  </button>
                </div>
                <input
                  type="text"
                  placeholder='e.g. "Cap Edge, Close", "Cone, 45° Off Axis"'
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
                  {Object.entries(refPositions).map(([pos, coords]) => (
                    <div key={pos} className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-[11px]">{pos}</span>
                        <span className="text-[9px] text-gray-500">
                          Default: ({VIR_CALIBRATION_COORDINATES.positions[pos as keyof typeof VIR_CALIBRATION_COORDINATES.positions]?.X.toFixed(4)}, {VIR_CALIBRATION_COORDINATES.positions[pos as keyof typeof VIR_CALIBRATION_COORDINATES.positions]?.Y.toFixed(4)})
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-400 block mb-0.5">X Axis</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={coords.X}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setRefPositions(prev => ({
                                ...prev,
                                [pos]: { ...prev[pos], X: val }
                              }));
                            }}
                            className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-400 block mb-0.5">Y Axis</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={coords.Y}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setRefPositions(prev => ({
                                ...prev,
                                [pos]: { ...prev[pos], Y: val }
                              }));
                            }}
                            className="w-full bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
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
