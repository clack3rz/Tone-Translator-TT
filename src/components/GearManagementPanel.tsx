import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Database,
  Edit2,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Download,
  Upload,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Settings,
  Plus,
  ArrowRight,
  Sparkles,
  Layers,
  Activity,
  History,
  FileJson,
  HelpCircle,
  UploadCloud,
  Zap,
  EyeOff
} from 'lucide-react';
import { GearProfile, GearProfileParameter, AT5CatalogItem, ParameterMapping, IKMPAKCandidate } from '../types';
import { gearProfileService } from '../services/gearProfileService';
import { parseAt5pPreset } from '../services/at5PresetImporter';
import { at5DatabaseService } from '../services/at5DatabaseService';
import { refreshDbParameterMappings } from '../services/at5ParameterManifest';
import { auth, signInWithGoogle } from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { evaluateCandidate, parseCSV, parseJSON, evaluateAliasSafety, isSlotTypeValid, normalizeGuid, checkProfileMatch, normalizeAliasComparison } from '../services/ikmpakService';
import { getAt5Catalog } from '../services/at5Catalog';

function getChildGearType(fieldName: string): "speaker" | "mic" | "room" | "room_mic" | null {
  const norm = fieldName.toLowerCase();
  
  if (norm.includes("speakermodel") || norm === "speaker0" || norm === "speaker1" || norm === "speaker2" || norm === "speaker3") {
    return "speaker";
  }
  if (norm === "roommic" || norm === "roommictype" || norm === "roommicmodel" || norm === "roommics") {
    return "room_mic";
  }
  if (norm === "room" || norm === "roomtype" || norm === "roommodel") {
    return "room";
  }
  if (
    norm.includes("mic0model") || 
    norm.includes("mic1model") || 
    norm === "mic0" || 
    norm === "mic1" || 
    norm === "mic0type" || 
    norm === "mic1type" ||
    norm === "mictype"
  ) {
    return "mic";
  }
  return null;
}

const isGuidValid = (g: any): boolean => {
  if (!g) return false;
  const s = String(g).toLowerCase().trim();
  if (s === "none" || s === "" || s.startsWith("gear-") || s.startsWith("name-") || s === "null" || s === "undefined") return false;
  return s.replace(/[^a-z0-9]/g, "").length > 3;
};

const categorizeParams = (parameters: any[]) => {
  const numeric: any[] = [];
  const references: any[] = [];
  const selectors: any[] = [];

  (parameters || []).forEach(p => {
    const nameLower = p.name ? p.name.toLowerCase() : "";
    const valString = p.value !== undefined ? String(p.value) : "";
    const isRef = isGuidValid(valString) || 
                  nameLower.endsWith('model') || 
                  nameLower.endsWith('type') || 
                  getChildGearType(p.name) !== null;
                  
    const isSel = nameLower.endsWith('on') || 
                  nameLower.endsWith('phase') || 
                  nameLower.endsWith('bypass') || 
                  nameLower.endsWith('switch') || 
                  nameLower.endsWith('enable') ||
                  (typeof p.value === 'number' && Number.isInteger(p.value) && p.max ? p.max <= 5 : false);

    if (isRef) {
      references.push(p);
    } else if (isSel) {
      selectors.push(p);
    } else {
      numeric.push(p);
    }
  });

  return { numeric, references, selectors };
};

const resolveChildGear = (
  type: "speaker" | "mic" | "room" | "room_mic", 
  guid: string,
  profiles: GearProfile[],
  candidates: IKMPAKCandidate[],
  catalog: AT5CatalogItem[]
) => {
  const normG = guid.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

  let matchedProfile: GearProfile | undefined = undefined;
  let matchedCandidate: IKMPAKCandidate | undefined = undefined;
  let matchedCatalog: AT5CatalogItem | undefined = undefined;

  const isRoomOrRoomMic = type === "room" || type === "room_mic";

  if (isRoomOrRoomMic) {
    const normName = guid.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
    const normNameCompact = guid.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    const isSameType = (pType: string) => {
      const pT = pType.toLowerCase().replace(/_/, "");
      const t = type.toLowerCase().replace(/_/, "");
      return pT === t || (t === "roommic" && pT === "roommic");
    };

    // 1. Match type and displayName
    matchedProfile = profiles.find(p => {
      return isSameType(p.type) && (
        p.displayName.toLowerCase().trim() === guid.toLowerCase().trim() ||
        p.displayName.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim() === normName ||
        p.displayName.toLowerCase().replace(/[^a-z0-9]/g, "").trim() === normNameCompact
      );
    });

    // 2. Match type and aliases
    if (!matchedProfile) {
      matchedProfile = profiles.find(p => {
        return isSameType(p.type) && (p.aliases || []).some(alias => {
          return alias.toLowerCase().trim() === guid.toLowerCase().trim() ||
            alias.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim() === normName ||
            alias.toLowerCase().replace(/[^a-z0-9]/g, "").trim() === normNameCompact;
        });
      });
    }

    // 3. Match type and synthetic ID (gear-hall, room-hall, roommic-condenser87)
    if (!matchedProfile) {
      matchedProfile = profiles.find(p => {
        if (!isSameType(p.type)) return false;
        const pIdLower = p.id.toLowerCase();
        return pIdLower === `gear-${normNameCompact}` ||
          pIdLower === `room-${normNameCompact}` ||
          pIdLower === `roommic-${normNameCompact}` ||
          pIdLower === `gear-room-${normNameCompact}` ||
          pIdLower === `gear-roommic-${normNameCompact}`;
      });
    }

    // 4. Match candidate
    matchedCandidate = candidates.find(c => {
      const cType = c.candidateGearType ? c.candidateGearType.toLowerCase().replace(/_/, "") : "";
      const t = type.toLowerCase().replace(/_/, "");
      if (cType !== t) return false;
      return c.name.toLowerCase().trim() === guid.toLowerCase().trim() ||
        c.name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim() === normName ||
        c.name.toLowerCase().replace(/[^a-z0-9]/g, "").trim() === normNameCompact;
    });

    // 5. Match catalog
    matchedCatalog = catalog.find(cat => {
      const catGroup = cat.group ? cat.group.toLowerCase().replace(/_/, "") : "";
      const t = type.toLowerCase().replace(/_/, "");
      if (catGroup !== t && catGroup !== "roommic" && catGroup !== "room_mic") return false;
      return cat.displayName.toLowerCase().trim() === guid.toLowerCase().trim() ||
        cat.displayName.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim() === normName ||
        cat.displayName.toLowerCase().replace(/[^a-z0-9]/g, "").trim() === normNameCompact;
    });

  } else {
    // GUID-based resolution
    matchedProfile = profiles.find(p => {
      if (!p.guid) return false;
      const isSameType = (type === "mic") 
        ? (p.type === "mic" || p.type === "roomMic") 
        : p.type === type;
      if (!isSameType) return false;
      return p.guid.toLowerCase().replace(/[^a-z0-9]/g, "") === normG;
    });

    matchedCandidate = candidates.find(c => {
      if (!c.guid) return false;
      const isSameType = (type === "mic") 
        ? (c.candidateGearType === "mic" || c.candidateGearType === "roomMic") 
        : c.candidateGearType === type;
      if (!isSameType) return false;
      return c.guid.toLowerCase().replace(/[^a-z0-9]/g, "") === normG;
    });

    matchedCatalog = catalog.find(cat => {
      if (!cat.guid) return false;
      const catGroup = cat.group?.toLowerCase();
      const isSameType = (type === "mic") 
        ? (catGroup === "mic" || catGroup === "roommic" || catGroup === "room_mic") 
        : catGroup === type;
      if (!isSameType) return false;
      return cat.guid.toLowerCase().replace(/[^a-z0-9]/g, "") === normG;
    });
  }

  let displayName = "";
  if (matchedProfile) {
    displayName = matchedProfile.displayName;
  } else if (matchedCandidate) {
    displayName = matchedCandidate.name;
  } else if (matchedCatalog) {
    displayName = matchedCatalog.displayName;
  } else {
    if (isRoomOrRoomMic) {
      displayName = guid;
    } else {
      displayName = `Unknown ${type === 'speaker' ? 'Speaker' : 'Mic'} [${guid.substring(0, 8)}]`;
    }
  }

  return {
    displayName,
    matchedProfile: matchedProfile || null,
    matchedCandidate: matchedCandidate || null,
    matchedCatalog: matchedCatalog || null
  };
};

interface GearManagementPanelProps {
  onRefreshChain?: () => void;
  onClose?: () => void;
  initialSelectedGuid?: string | null;
  exportDebugData?: any | null;
}

export const GearManagementPanel: React.FC<GearManagementPanelProps> = ({ onRefreshChain, onClose, initialSelectedGuid, exportDebugData }) => {
  const [profiles, setProfiles] = useState<GearProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<GearProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  // Active view tab: 'profiles' | 'discovery' | 'gaps' | 'ikmpak'
  const [viewMode, setViewMode] = useState<'profiles' | 'discovery' | 'gaps' | 'ikmpak'>('profiles');

  // IKMPAK Discovery Accelerator states
  const [stagedCandidates, setStagedCandidates] = useState<IKMPAKCandidate[]>([]);
  const [isCandidatesLoading, setIsCandidatesLoading] = useState<boolean>(false);
  const [ikmpakSearch, setIkmpakSearch] = useState<string>('');
  const [ikmpakFilter, setIkmpakFilter] = useState<string>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<IKMPAKCandidate | null>(null);
  const [localFileCandidates, setLocalFileCandidates] = useState<IKMPAKCandidate[]>([]);
  const [candidateFileError, setCandidateFileError] = useState<string | null>(null);
  const [candidateFileFeedback, setCandidateFileFeedback] = useState<string | null>(null);
  const [promotionNotes, setPromotionNotes] = useState<string>('');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('ikmpak_candidate');
  const [promotionAliases, setPromotionAliases] = useState<string[]>([]);
  const [promotionType, setPromotionType] = useState<string>('stomp');

  // Active tab inside selected profile
  const [profileTab, setProfileTab] = useState<'overview' | 'aliases' | 'parameters' | 'export' | 'conversion' | 'discovery' | 'validation' | 'raw' | 'compare'>('overview');

  // Inline profile editing forms
  const [editedProfile, setEditedProfile] = useState<GearProfile | null>(null);

  // Parameter editing dialog/form states
  const [isEditingParameter, setIsEditingParameter] = useState<boolean>(false);
  const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null);
  const [paramForm, setParamForm] = useState<GearProfileParameter | null>(null);

  // Import/Discovery states
  const [dragActive, setDragActive] = useState(false);
  const [importedPresetName, setImportedPresetName] = useState<string>('');
  const [discoveredGears, setDiscoveredGears] = useState<any[]>([]);
  const [discoveredProtocols, setDiscoveredProtocols] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // Applied history and review summary states
  const [appliedDiscoveries, setAppliedDiscoveries] = useState<any[]>([]);
  const [reviewingDiscovery, setReviewingDiscovery] = useState<any | null>(null);
  const [updatingGears, setUpdatingGears] = useState<string[]>([]);
  const [clearStagingConfirmOpen, setClearStagingConfirmOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const candFileInputRef = useRef<HTMLInputElement>(null);
  const candidateListRef = useRef<HTMLDivElement>(null);

  const [ikmpakSortBy, setIkmpakSortBy] = useState<'import' | 'name' | 'status'>('import');
  const [hideActioned, setHideActioned] = useState<boolean>(false);
  const [ikmpakActionLoading, setIkmpakActionLoading] = useState<'merging' | 'applying' | 'sending_queue' | 'rejecting' | null>(null);
  const [ikmpakActionFeedback, setIkmpakActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [tabPresetFile, setTabPresetFile] = useState<File | null>(null);
  const [tabPresetImportResult, setTabPresetImportResult] = useState<any | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareSuccessMessage, setCompareSuccessMessage] = useState<string | null>(null);
  const [customMicPlacementFriendlySetting, setCustomMicPlacementFriendlySetting] = useState<"Mic_1_Placement" | "Mic_2_Placement">("Mic_1_Placement");
  const [customMicPlacementFriendlyValue, setCustomMicPlacementFriendlyValue] = useState("");
  const [customMicPlacementFriendlyPlacement, setCustomMicPlacementFriendlyPlacement] = useState("");
  const [customMicPlacementFriendlyDistance, setCustomMicPlacementFriendlyDistance] = useState("");
  const [mic0CalibrateLabel, setMic0CalibrateLabel] = useState("");
  const [mic1CalibrateLabel, setMic1CalibrateLabel] = useState("");


  const activeInstance = useMemo(() => {
    if (!exportDebugData || !selectedProfile) return null;
    const norm = (g: string) => g ? g.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const selectedGuid = norm(selectedProfile.guid || '');
    const selectedName = selectedProfile.displayName.toLowerCase().trim();
    const selectedAliases = selectedProfile.aliases.map(a => a.toLowerCase().trim());

    return [...(exportDebugData.exported_chain || []), ...(exportDebugData.skipped_gear || [])].find(item => {
      const itemGuid = norm(item.resolved_guid || '');
      if (itemGuid && selectedGuid && itemGuid === selectedGuid) return true;
      const itemName = item.normalized_name.toLowerCase().trim();
      return itemName === selectedName || selectedAliases.includes(itemName);
    });
  }, [exportDebugData, selectedProfile]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const loadProfiles = async () => {
    setIsLoading(true);
    try {
      const data = await gearProfileService.getGearProfiles();
      setProfiles(data);
      // Synchronize selection if currently editing / selected
      if (selectedProfile) {
        const found = data.find(p => p.id === selectedProfile.id);
        if (found) {
          setSelectedProfile(found);
          setEditedProfile(JSON.parse(JSON.stringify(found)));
        }
      }
    } catch (err) {
      console.error('Error fetching gear profiles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStagedCandidates = async (preserveSelectionKey?: string | null) => {
    setIsCandidatesLoading(true);
    const savedScrollTop = candidateListRef.current?.scrollTop;
    try {
      const data = await at5DatabaseService.getDiscoveryCandidates();
      setStagedCandidates(data);
      
      if (preserveSelectionKey) {
        const found = data.find(c => getCandidateKey(c) === preserveSelectionKey);
        if (found) {
          setSelectedCandidate(found);
        }
      }
      
      if (savedScrollTop !== undefined && savedScrollTop !== null) {
        setTimeout(() => {
          if (candidateListRef.current) {
            candidateListRef.current.scrollTop = savedScrollTop;
          }
        }, 50);
      }
    } catch (err) {
      console.error('Error fetching discovery candidates:', err);
    } finally {
      setIsCandidatesLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (viewMode === 'ikmpak') {
      loadStagedCandidates();
    }
  }, [viewMode]);

  useEffect(() => {
    if (initialSelectedGuid && profiles.length > 0) {
      const normGuid = (g: string) => g ? g.toLowerCase().replace(/[^a-z0-9]/g, '').trim() : '';
      const target = normGuid(initialSelectedGuid);
      const found = profiles.find(p => 
        (p.guid && normGuid(p.guid) === target) ||
        (p.id && normGuid(p.id) === target) ||
        (p.id && normGuid(p.id) === normGuid(`gear-${target}`)) ||
        (p.displayName && normGuid(p.displayName) === target) ||
        (p.aliases && p.aliases.some(a => normGuid(a) === target))
      );
      if (found) {
        setSelectedProfile(found);
        setEditedProfile(JSON.parse(JSON.stringify(found)));
        setProfileTab('overview');
        setViewMode('profiles');
        setSelectedType('all');
        setSelectedStatus('all');
        setSearchTerm('');
      } else {
        setSearchTerm(initialSelectedGuid);
        setViewMode('profiles');
      }
    }
  }, [initialSelectedGuid, profiles]);

  // Filter and search
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      // 1. Search term check
      const term = searchTerm.toLowerCase().trim();
      const matchSearch = !term ||
        p.displayName.toLowerCase().includes(term) ||
        (p.guid && p.guid.toLowerCase().includes(term)) ||
        p.aliases.some(a => a.toLowerCase().includes(term));

      // 2. Type/group check
      const matchType = selectedType === 'all' || p.type.toLowerCase() === selectedType.toLowerCase();

      // 3. Status check
      const matchStatus = selectedStatus === 'all' || p.validation.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchSearch && matchType && matchStatus;
    });
  }, [profiles, searchTerm, selectedType, selectedStatus]);

  // Handle select a profile for viewing/editing
  const handleSelectProfile = (p: GearProfile) => {
    setSelectedProfile(p);
    setEditedProfile(JSON.parse(JSON.stringify(p)));
    setProfileTab('overview');
    setViewMode('profiles');
    setTabPresetFile(null);
    setTabPresetImportResult(null);
    setCompareError(null);
    setCompareSuccessMessage(null);
    setCustomMicPlacementFriendlyValue("");
  };

  // Profile field modifications
  const handleProfileFieldChange = (field: keyof GearProfile, value: any) => {
    if (!editedProfile) return;
    setEditedProfile({
      ...editedProfile,
      [field]: value
    });
  };

  // Add alias
  const [newAlias, setNewAlias] = useState('');
  const handleAddAlias = () => {
    if (!editedProfile || !newAlias.trim()) return;
    const clean = newAlias.trim();
    if (!editedProfile.aliases.includes(clean)) {
      setEditedProfile({
        ...editedProfile,
        aliases: [...editedProfile.aliases, clean]
      });
    }
    setNewAlias('');
  };

  const handleRemoveAlias = (index: number) => {
    if (!editedProfile) return;
    const updated = [...editedProfile.aliases];
    updated.splice(index, 1);
    setEditedProfile({
      ...editedProfile,
      aliases: updated
    });
  };

  // Parameter editing triggers
  const handleStartEditParam = (index: number) => {
    if (!editedProfile) return;
    setEditingParamIndex(index);
    const rawParam = editedProfile.parameters[index];
    if (rawParam) {
      setParamForm({
        ...rawParam,
        visual: {
          min: rawParam.visual?.min ?? 0,
          max: rawParam.visual?.max ?? 10,
          unit: rawParam.visual?.unit ?? ''
        },
        export: {
          name: rawParam.export?.name ?? rawParam.canonicalName ?? '',
          min: rawParam.export?.min ?? 0,
          max: rawParam.export?.max ?? 1
        },
        conversion: {
          mode: rawParam.conversion?.mode ?? 'direct',
          formula: rawParam.conversion?.formula ?? ''
        }
      });
    } else {
      setParamForm(null);
    }
    setIsEditingParameter(true);
  };

  const handleSaveParamEdit = () => {
    if (!editedProfile || editingParamIndex === null || !paramForm) return;
    const updatedParams = [...editedProfile.parameters];
    updatedParams[editingParamIndex] = paramForm;
    setEditedProfile({
      ...editedProfile,
      parameters: updatedParams
    });
    setIsEditingParameter(false);
    setEditingParamIndex(null);
    setParamForm(null);
  };

  const handleAddNewParam = () => {
    if (!editedProfile) return;
    const newParam: GearProfileParameter = {
      displayName: 'New Parameter',
      canonicalName: 'new_parameter',
      aliases: [],
      visual: { min: 0, max: 10, unit: '' },
      export: { name: 'new_parameter', min: 0, max: 1 },
      conversion: { mode: 'direct', formula: '' },
      validationStatus: 'PARTIAL'
    };
    setEditedProfile({
      ...editedProfile,
      parameters: [...editedProfile.parameters, newParam]
    });
    handleStartEditParam(editedProfile.parameters.length);
  };

  const handleRemoveParam = (index: number) => {
    if (!editedProfile) return;
    const updatedParams = [...editedProfile.parameters];
    updatedParams.splice(index, 1);
    setEditedProfile({
      ...editedProfile,
      parameters: updatedParams
    });
  };

  // Write selected gear changes back to Firestore
  const handleSaveProfile = async () => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    if (!editedProfile) return;

    setIsSaving(true);
    try {
      // 1. Save using merged profile service writebacks
      await gearProfileService.saveGearProfile(editedProfile);
      
      // 2. Perform validation rebuild instantly
      const updatedList = await gearProfileService.getGearProfiles();
      setProfiles(updatedList);

      const saved = updatedList.find(p => p.displayName === editedProfile.displayName);
      if (saved) {
        setSelectedProfile(saved);
        setEditedProfile(JSON.parse(JSON.stringify(saved)));
      }

      setImportFeedback(`Successfully updated Gear Profile for ${editedProfile.displayName}!`);
      setTimeout(() => setImportFeedback(null), 4000);

      if (onRefreshChain) {
        onRefreshChain();
      }
    } catch (err: any) {
      console.error('Failed to save profile changes:', err);
      setImportErrors([`Save failed: ${err.message || err}`]);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * IKMPAK Candidate Event and State Handlers
   */
  const handleCandidateFileUpload = async (file: File) => {
    setCandidateFileError(null);
    setCandidateFileFeedback(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let candidates: IKMPAKCandidate[] = [];
        if (file.name.endsWith('.csv')) {
          candidates = parseCSV(text);
        } else if (file.name.endsWith('.json')) {
          candidates = parseJSON(text);
        } else {
          throw new Error("Unsupported file format. Please upload a .csv or .json file.");
        }
        
        if (candidates.length === 0) {
          throw new Error("No valid candidates found in the uploaded file.");
        }
        
        setLocalFileCandidates(candidates);
        setCandidateFileFeedback(`Parsed ${candidates.length} candidates from ${file.name}. Review them below, then click "Commit to Staging" to save them.`);
      } catch (err: any) {
        console.error(err);
        setCandidateFileError(`Failed to parse file: ${err.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveCandidatesToStaging = async () => {
    if (!user) {
      setCandidateFileError("Must be signed in to commit to firestore staging");
      return;
    }
    if (localFileCandidates.length === 0) return;
    setIsCandidatesLoading(true);
    try {
      await at5DatabaseService.saveDiscoveryCandidates(localFileCandidates);
      setCandidateFileFeedback(`Successfully added ${localFileCandidates.length} candidates to Staging Area.`);
      setLocalFileCandidates([]);
      await loadStagedCandidates();
    } catch (err: any) {
      console.error(err);
      setCandidateFileError(`Failed to save candidates: ${err.message || err}`);
    } finally {
      setIsCandidatesLoading(false);
    }
  };

  const handleClearStaging = async () => {
    if (!user) {
      setCandidateFileError("Must be signed in to clear staging");
      return;
    }
    setIsCandidatesLoading(true);
    try {
      await at5DatabaseService.clearAllDiscoveryCandidates();
      setStagedCandidates([]);
      setSelectedCandidate(null);
      setCandidateFileFeedback("Cleared all candidates from staging database.");
    } catch (err: any) {
      console.error(err);
      setCandidateFileError(`Failed to clear staging: ${err.message || err}`);
    } finally {
      setIsCandidatesLoading(false);
    }
  };

  const findMatchedProfile = (candidate: IKMPAKCandidate, profilesList: GearProfile[]) => {
    return profilesList.find(p => checkProfileMatch(candidate, p)) || null;
  };

  const isCandidateAlreadyQueued = (candidate: IKMPAKCandidate): boolean => {
    const queuedProfiles = profiles.filter(p => p.validationStatus === "awaiting_at5p_validation" || p.validation?.validationStatus === "awaiting_at5p_validation");
    const queuedCandidates = stagedCandidates.filter(c => c.discoveryStatus === "awaiting_at5p_validation" && c.id !== candidate.id);

    const hasGuid = !!candidate.guid;
    const candGuid = candidate.guid ? candidate.guid.toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim() : "";
    const candNormName = (candidate.name || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    const candType = candidate.candidateGearType;

    // Check matching queued profiles
    const matchedProfile = queuedProfiles.find(p => {
      if (p.type !== candType) return false;
      if (hasGuid && p.guid) {
        return p.guid.toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim() === candGuid;
      }
      return (p.displayName || "").toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim() === candNormName;
    });

    if (matchedProfile) return true;

    // Check matching queued candidates
    const matchedCandidate = queuedCandidates.find(c => {
      if (c.candidateGearType !== candType) return false;
      if (hasGuid && c.guid) {
        return c.guid.toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim() === candGuid;
      }
      return (c.name || "").toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim() === candNormName;
    });

    if (matchedCandidate) return true;

    return false;
  };

  const getValidationQueueStatus = (candidate: IKMPAKCandidate | null) => {
    if (!candidate) return "not_queued";
    
    const matched = findMatchedProfile(candidate, profiles);
    if (matched) {
      if (matched.validationStatus === "verified_at5p" || matched.validationStatus === "at5p_validated") {
        return "validated";
      }
      if (matched.validationStatus === "awaiting_at5p_validation" || candidate.discoveryStatus === "awaiting_at5p_validation") {
        return "queued";
      }
    } else if (candidate.discoveryStatus === "awaiting_at5p_validation") {
      return "queued";
    }

    if (isCandidateAlreadyQueued(candidate)) {
      return "queued";
    }

    return "not_queued";
  };

  const getCandidateKey = (candidate: IKMPAKCandidate): string => {
    if (candidate.guid) {
      return `${candidate.guid}_${candidate.candidateGearType}`;
    }
    return `${candidate.importBatchId}_${candidate.name}_${candidate.candidateGearType}`;
  };

  const handleManualRefresh = async () => {
    setIsCandidatesLoading(true);
    try {
      const key = selectedCandidate ? getCandidateKey(selectedCandidate) : null;
      await loadProfiles();
      await loadStagedCandidates(key);
    } finally {
      setIsCandidatesLoading(false);
    }
  };

  const handleDeleteStagedCandidate = async (candidateId: string) => {
    if (!user) {
      setCandidateFileError("Must be signed in to delete candidate");
      return;
    }
    setIsCandidatesLoading(true);
    try {
      await at5DatabaseService.deleteDiscoveryCandidate(candidateId);
      setStagedCandidates(prev => prev.filter(c => c.id !== candidateId));
      if (selectedCandidate?.id === candidateId) {
        setSelectedCandidate(null);
      }
      setCandidateFileFeedback("Deleted candidate from staging.");
    } catch (err: any) {
      console.error(err);
      setCandidateFileError(`Failed to delete candidate: ${err.message || err}`);
    } finally {
      setIsCandidatesLoading(false);
    }
  };

  const handlePromoteCandidate = async (
    candidate: IKMPAKCandidate,
    targetType: string,
    selectedAliases: string[],
    finalConfidence: string,
    forceCreateNew: boolean = false
  ) => {
    if (!user) {
      setIkmpakActionFeedback({ text: "Must be signed in to promote candidates", type: 'error' });
      return;
    }
    
    // Set action loading based on confidence or context
    let actionType: 'merging' | 'applying' | 'sending_queue' = 'applying';
    const evaluation = evaluateCandidate(candidate, profiles);
    const hasExistingMatch = !!evaluation.matchedProfileId;
    
    if (finalConfidence === "awaiting_at5p_validation") {
      actionType = 'sending_queue';
    } else if (hasExistingMatch && !forceCreateNew) {
      actionType = 'merging';
    } else {
      actionType = 'applying';
    }

    setIkmpakActionLoading(actionType);
    setIkmpakActionFeedback(null);
    setIsLoading(true);

    try {
      let targetProfile: GearProfile | null = null;
      if (evaluation.matchedProfileId && !forceCreateNew) {
        targetProfile = profiles.find(p => p.id === evaluation.matchedProfileId) || null;
      }
      
      const slot = targetType === "rack" ? "Rack" : targetType === "amp" ? "Amplifier" : targetType === "cab" ? "CabA" : "Slot";
      const isValid = isSlotTypeValid(targetType, slot);
      if (!isValid) {
        throw new Error(`Slot type lock mismatch: cannot place gear type '${targetType}' into slot '${slot}'.`);
      }

      let successMsg = "";
      if (targetProfile) {
        // MERGE into existing profile
        const updatedAliases = Array.from(new Set([
          ...targetProfile.aliases,
          ...selectedAliases
        ]));
        
        // Find left-unchecked suggested aliases
        const currentSuggested = evaluation.suggestedAliases || [];
        const ignoredRecords = currentSuggested
          .filter(alias => !selectedAliases.includes(alias))
          .map(alias => ({
            alias: alias,
            normalizedAlias: normalizeAliasComparison(alias),
            gearProfileId: targetProfile!.id,
            guid: targetProfile!.guid || "",
            reason: "unselected_during_merge",
            source: "ikmpak_staging",
            timestamp: new Date().toISOString()
          }));

        const existingIgnored = targetProfile.ignoredAliasSuggestions || [];
        const updatedIgnored = [...existingIgnored];
        ignoredRecords.forEach(rec => {
          if (!updatedIgnored.some(x => normalizeAliasComparison(x.alias) === rec.normalizedAlias)) {
            updatedIgnored.push(rec);
          }
        });
        
        const mergedProfile: GearProfile = {
          ...targetProfile,
          displayName: targetProfile.displayName,
          type: targetType,
          slot: targetProfile.slot || slot,
          aliases: updatedAliases,
          validationStatus: finalConfidence, // "awaiting_at5p_validation" or "discovered_unverified"
          ignoredAliasSuggestions: updatedIgnored,
          discovery: {
            ...targetProfile.discovery,
            importHistory: Array.from(new Set([...(targetProfile.discovery?.importHistory || []), candidate.importBatchId])),
            isDraft: false,
            detectedAt: new Date().toISOString()
          },
          validation: {
            ...targetProfile.validation,
            status: finalConfidence === "awaiting_at5p_validation" ? "CHECK" : (targetProfile.validation?.status || "CHECK"),
            reason: `Promoted from IKMPAK candidate with confidence: ${finalConfidence}.`,
            validationStatus: finalConfidence
          }
        };
        
        await gearProfileService.saveGearProfile(mergedProfile);
        
        if (actionType === 'sending_queue') {
          successMsg = "Added to .AT5P validation queue.";
        } else {
          successMsg = `Merged selected keywords/aliases into existing profile "${targetProfile.displayName}".`;
        }
      } else {
        // CREATE a new profile as a Draft
        const normG = normalizeGuid(candidate.guid);
        const currentSuggested = evaluation.suggestedAliases || [];
        const ignoredRecords = currentSuggested
          .filter(alias => !selectedAliases.includes(alias))
          .map(alias => ({
            alias: alias,
            normalizedAlias: normalizeAliasComparison(alias),
            reason: "unselected_during_create",
            source: "ikmpak_staging",
            timestamp: new Date().toISOString()
          }));

        const newProfile: GearProfile = {
          id: normG ? `gear-${normG}` : `gear-${normalizeName(candidate.name)}-${targetType}`,
          displayName: candidate.name,
          type: targetType,
          guid: candidate.guid,
          slot: slot,
          aliases: selectedAliases,
          parameters: [],
          validationStatus: finalConfidence as any,
          ignoredAliasSuggestions: ignoredRecords,
          discovery: {
            isDraft: true,
            detectedAt: new Date().toISOString(),
            importHistory: [candidate.importBatchId],
            discoverySources: [
              {
                sourceType: "ikmpak",
                confidence: "medium",
                notes: "Imported from IKMPAK GearInfo. Requires .at5p validation before export-safe use."
              }
            ]
          },
          validation: {
            status: 'CHECK',
            gaps: ['Needs .at5p parameter verification'],
            reason: finalConfidence === "awaiting_at5p_validation" 
              ? 'Created via IKMPAK and sent to validation queue.' 
              : 'Created via IKMPAK Discovery Accelerator. Staged unverified.',
            validationStatus: finalConfidence
          },
          rawSources: {
            catalog: {
              group: targetType,
              guid: candidate.guid,
              slot: slot,
              displayName: candidate.name,
              otherNames: selectedAliases
            },
            verified: null
          }
        };
        
        await gearProfileService.saveGearProfile(newProfile);
        
        if (finalConfidence === "awaiting_at5p_validation") {
          successMsg = "Added to .AT5P validation queue.";
        } else {
          successMsg = `Created unverified Gear Profile. .at5p validation still required.`;
        }
      }

      // Update candidate status in local state and Firestore database
      const determinedStatus = finalConfidence === "awaiting_at5p_validation" 
        ? "awaiting_at5p_validation" 
        : (actionType === 'merging' ? "merged" : "applied_unverified");

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const updatedCandidate: IKMPAKCandidate = {
        ...candidate,
        discoveryStatus: determinedStatus,
        lastActionType: determinedStatus as any,
        lastActionTime: nowTime
      };

      // Save to database (in-place candidate status update, do NOT delete!)
      await at5DatabaseService.saveDiscoveryCandidate(updatedCandidate);

      // Refresh profiles so lookups can detect the updated/new profile validationStatus
      await loadProfiles();

      // Update in local candidates state array in-place
      // Update in local candidates state arrays in-place
      setStagedCandidates(prev => prev.map(c => c.id === candidate.id ? updatedCandidate : c));
      setLocalFileCandidates(prev => prev.map(c => c.id === candidate.id ? updatedCandidate : c));
      setSelectedCandidate(updatedCandidate);

      setIkmpakActionFeedback({ text: successMsg, type: 'success' });
      setCandidateFileFeedback(successMsg);

    } catch (err: any) {
      console.error(err);
      const errMsg = `Failed to promote candidate: ${err.message || err}`;
      setIkmpakActionFeedback({ text: errMsg, type: 'error' });
      setCandidateFileError(errMsg);
    } finally {
      setIsLoading(false);
      setIkmpakActionLoading(null);
    }
  };

  const handleRejectCandidate = async (candidate: IKMPAKCandidate) => {
    if (!user) {
      setIkmpakActionFeedback({ text: "Must be signed in to reject candidates", type: 'error' });
      return;
    }
    
    setIkmpakActionLoading('rejecting');
    setIkmpakActionFeedback(null);
    setIsLoading(true);

    try {
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const updatedCand: IKMPAKCandidate = {
        ...candidate,
        discoveryStatus: "rejected",
        lastActionType: "rejected",
        lastActionTime: nowTime
      };
      
      await at5DatabaseService.saveDiscoveryCandidate(updatedCand);
      
      // Update in local candidates state arrays in-place
      setStagedCandidates(prev => prev.map(c => c.id === candidate.id ? updatedCand : c));
      setLocalFileCandidates(prev => prev.map(c => c.id === candidate.id ? updatedCand : c));
      setSelectedCandidate(updatedCand);

      const successMsg = `Candidate rejected from this staging batch.`;
      setIkmpakActionFeedback({ text: successMsg, type: 'success' });
      setCandidateFileFeedback(successMsg);

    } catch (err: any) {
      console.error(err);
      const errMsg = `Failed to reject candidate: ${err.message || err}`;
      setIkmpakActionFeedback({ text: errMsg, type: 'error' });
      setCandidateFileError(errMsg);
    } finally {
      setIsLoading(false);
      setIkmpakActionLoading(null);
    }
  };

  const handleIgnoreAliases = async (candidate: IKMPAKCandidate, aliasesToIgnore: string[]) => {
    if (!user) {
      setIkmpakActionFeedback({ text: "Must be signed in to ignore aliases", type: 'error' });
      return;
    }
    const evaluation = evaluateCandidate(candidate, profiles);
    const targetProfile = profiles.find(p => p.id === evaluation.matchedProfileId);
    if (!targetProfile) {
      setIkmpakActionFeedback({ text: "No matched profile to ignore aliases for", type: 'error' });
      return;
    }
    setIsLoading(true);
    setIkmpakActionLoading('merging' as any);
    try {
      const ignoredRecords = aliasesToIgnore.map(alias => ({
        alias: alias,
        normalizedAlias: normalizeAliasComparison(alias),
        gearProfileId: targetProfile.id,
        guid: targetProfile.guid,
        reason: "user_ignored",
        source: "ikmpak_staging",
        timestamp: new Date().toISOString()
      }));

      const existingIgnored = targetProfile.ignoredAliasSuggestions || [];
      const updatedIgnored = [...existingIgnored];
      ignoredRecords.forEach(rec => {
        if (!updatedIgnored.some(x => normalizeAliasComparison(x.alias) === rec.normalizedAlias)) {
          updatedIgnored.push(rec);
        }
      });

      const updatedProfile: GearProfile = {
        ...targetProfile,
        ignoredAliasSuggestions: updatedIgnored
      };

      await gearProfileService.saveGearProfile(updatedProfile);

      const successMsg = `Successfully ignored ${aliasesToIgnore.length} suggested alias(es) on profile "${targetProfile.displayName}".`;
      setIkmpakActionFeedback({ text: successMsg, type: 'success' });
      
      // Refresh
      await loadProfiles();
      
      // Keep state sync
      const updatedCandidate = { ...candidate };
      setStagedCandidates(prev => prev.map(c => c.id === candidate.id ? updatedCandidate : c));
      setLocalFileCandidates(prev => prev.map(c => c.id === candidate.id ? updatedCandidate : c));
      setSelectedCandidate(updatedCandidate);
    } catch (err: any) {
      console.error(err);
      setIkmpakActionFeedback({ text: `Failed to ignore aliases: ${err.message || err}`, type: 'error' });
    } finally {
      setIsLoading(false);
      setIkmpakActionLoading(null);
    }
  };

  const handleSendToValidationQueue = async (candidate: IKMPAKCandidate) => {
    // Treat as applying/merging with finalConfidence = 'awaiting_at5p_validation'
    // This will update/create the corresponding profile with "awaiting_at5p_validation" validationStatus,
    // and correctly set the candidate discoveryStatus and badges
    if (isCandidateAlreadyQueued(candidate) || getValidationQueueStatus(candidate) === "queued") {
      const msg = "Already in .AT5P validation queue.";
      setIkmpakActionFeedback({ text: msg, type: 'success' });
      setCandidateFileFeedback(msg);
      return;
    }
    await handlePromoteCandidate(candidate, promotionType, promotionAliases, "awaiting_at5p_validation", false);
  };

  const normalizeName = (name: string): string => {
    if (!name) return "";
    return name.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  };

  const handleSelectCandidate = (candidate: IKMPAKCandidate) => {
    setSelectedCandidate(candidate);
    const evaluation = evaluateCandidate(candidate, profiles);
    setPromotionAliases(evaluation.suggestedAliases);
    setPromotionType(candidate.candidateGearType);
    setPromotionNotes(candidate.notes || '');
    setSelectedConfidence(candidate.validationStatus || 'discovered_unverified');
  };

  // Gaps statistics calculation
  const gapsDashboard = useMemo(() => {
    const list: { profile: GearProfile; gapType: string; desc: string }[] = [];
    for (const p of profiles) {
      if (p.validation.gaps && p.validation.gaps.length > 0) {
        for (const g of p.validation.gaps) {
          list.push({
            profile: p,
            gapType: g.includes('GUID') ? 'Missing GUID' :
                     g.includes('aliases') ? 'Missing aliases' :
                     g.includes('parameters') ? 'No parameters' :
                     g.includes('Estimated') ? 'Estimated conversion' : 'Partial export',
            desc: g
          });
        }
      }
    }
    return list;
  }, [profiles]);

  // Drag and drop preset importing
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processUploadedFile(e.target.files[0]);
    }
  };

  const processUploadedFile = async (file: File) => {
    setIsLoading(true);
    setImportWarnings([]);
    setImportErrors([]);
    setImportFeedback(null);
    setImportedPresetName(file.name);

    try {
      const results = await parseAt5pPreset(file);
      if (results.errors && results.errors.length > 0) {
        setImportErrors(results.errors);
        setIsLoading(false);
        return;
      }

      setImportWarnings(results.warnings || []);

      // Translate detected assets into gear profile matches on-the-fly!
      const enrichedDetected = (results.detectedGear || []).map(dg => {
        // Darrell 100 on-the-fly normalization
        let incomingName = dg.displayName || '';
        const cleanDgName = incomingName.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
        if (cleanDgName === "darrell100" || cleanDgName === "darrell 100" || incomingName === "Darrell 100") {
          dg.displayName = "Darrell 100";
          dg.gearType = "amp";
        }

        // Match by GUID first
        const nGuid = dg.modelGuid ? dg.modelGuid.toLowerCase().replace(/-/g, '').trim() : '';
        let matched = profiles.find(p => p.guid && p.guid.toLowerCase().replace(/-/g, '').trim() === nGuid);

        // Match by alias/name second
        if (!matched && dg.displayName) {
          const lName = dg.displayName.toLowerCase().trim();
          matched = profiles.find(p => 
            p.id === "amp_darrell_100" ||
            p.displayName.toLowerCase().trim() === lName ||
            p.aliases.some(a => a.toLowerCase().trim() === lName)
          );
        }

        if (!matched && (cleanDgName === "darrell100" || cleanDgName === "darrell 100")) {
          matched = profiles.find(p => p.id === "amp_darrell_100");
        }

        let childGears: any[] = [];
        if (dg.gearType === 'cab') {
          const childSpecsMap = new Map<string, {
            type: "speaker" | "mic" | "room" | "room_mic";
            guid: string;
            sourceFields: string[];
          }>();

          if (dg.parameters && Array.isArray(dg.parameters)) {
            for (const param of dg.parameters) {
              const fieldType = getChildGearType(param.name);
              if (fieldType && isGuidValid(param.value)) {
                const guidVal = String(param.value);
                const key = `${fieldType}_${guidVal.toLowerCase().replace(/[^a-z0-9]/g, '').trim()}`;
                const existing = childSpecsMap.get(key);
                if (existing) {
                  if (!existing.sourceFields.includes(param.name)) {
                    existing.sourceFields.push(param.name);
                  }
                } else {
                  childSpecsMap.set(key, {
                    type: fieldType,
                    guid: guidVal,
                    sourceFields: [param.name]
                  });
                }
              }
            }
          }

          const currentCatalog = getAt5Catalog() || [];
          childGears = Array.from(childSpecsMap.values()).map(spec => {
            const resolved = resolveChildGear(
              spec.type,
              spec.guid,
              profiles,
              stagedCandidates,
              currentCatalog
            );

            const isAlreadyValidated = resolved.matchedProfile?.validationStatus === "at5p_validated" || resolved.matchedProfile?.validationStatus === "verified_at5p";

            return {
              ...spec,
              displayName: resolved.displayName,
              matchedProfile: resolved.matchedProfile,
              matchedCandidate: resolved.matchedCandidate,
              matchedCatalog: resolved.matchedCatalog,
              updatesExisting: !!resolved.matchedProfile,
              isAlreadyValidated,
              statusLabel: resolved.matchedProfile 
                ? (isAlreadyValidated ? ".AT5P VALIDATED" : `CHECK / Unverified Profile Found`) 
                : "Profile Not Found (Awaiting Identity Resolution)"
            };
          });
        }

        return {
          ...dg,
          sourcePresetFilename: file.name,
          matchedProfile: matched || null,
          updatesExisting: !!matched,
          statusLabel: matched ? `Updates existing profile (${matched.displayName})` : 'Creates new draft Profile',
          childGears
        };
      });

      setDiscoveredGears(enrichedDetected);
      setDiscoveredProtocols(results.detectedProtocols || []);
      setViewMode('discovery');
    } catch (err: any) {
      console.error(err);
      setImportErrors([`Failed to parse .at5p preset: ${err.message || err}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyDiscovered = (dg: any) => {
    // Present the Review Summary Modal before applying
    setReviewingDiscovery(dg);
  };

  const handleApplyDiscoveredConfirmed = async (dg: any) => {
    const key = dg.modelGuid || dg.displayName;
    setUpdatingGears(prev => [...prev, key]);
    setIsLoading(true);
    try {
      // 1. Keep track of status before
      const valStatusBefore = dg.matchedProfile?.validationStatus || dg.matchedProfile?.validation?.status || 'unverified';
      
      const fieldsUpdated: string[] = ['guid', 'validationStatus'];
      if (!dg.matchedProfile?.slot && dg.slotType) fieldsUpdated.push('slot');

      // Construct merged alias lists
      const combinedAliases = Array.from(new Set([
        ...(dg.matchedProfile?.aliases || []),
        dg.displayName,
        ...(dg.existingAliases || [])
      ]));
      if (combinedAliases.length > (dg.matchedProfile?.aliases || []).length) {
        fieldsUpdated.push('aliases');
      }

      // Construct parameters check
      const parametersUpdate = dg.matchedProfile ? [...dg.matchedProfile.parameters] : [];
      let paramsAddedCode = 0;
      for (const p of dg.parameters) {
        const key = p.name.toLowerCase().trim();
        const existing = parametersUpdate.find(param => param.displayName.toLowerCase().trim() === key);
        if (!existing) {
          parametersUpdate.push({
            displayName: p.name,
            canonicalName: p.name,
            aliases: [],
            visual: { min: Number(p.min || 0), max: Number(p.max || 10), unit: '' },
            export: { name: p.name, min: Number(p.min || 0), max: Number(p.max || 1) },
            conversion: { mode: 'direct', formula: '' },
            validationStatus: 'PARTIAL'
          });
          paramsAddedCode++;
        }
      }
      if (paramsAddedCode > 0) {
        fieldsUpdated.push('parameters');
      }

      // Determine correct profile identification
      let profileId = dg.matchedProfile?.id;
      let displayName = dg.matchedProfile?.displayName || dg.displayName;
      let type = dg.matchedProfile?.type || dg.gearType || 'amp';

      const cleanName = displayName.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      if (cleanName === "darrell100" || cleanName === "darrell 100" || displayName === "Darrell 100") {
        profileId = "amp_darrell_100";
        displayName = "Darrell 100";
        type = "amp";
      } else if (!profileId) {
        profileId = dg.modelGuid ? `gear-${dg.modelGuid.toLowerCase().replace(/-/g, '').trim()}` : `gear-${displayName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${type}`;
      }

      const presetFilename = dg.sourcePresetFilename || 'PARAM__BRIT8000__DEFAULT.AT5P';

      // Create the merged profile object
      const mergedProfile: GearProfile = {
        id: profileId,
        displayName: displayName,
        type: type,
        guid: dg.modelGuid || dg.matchedProfile?.guid || '',
        slot: dg.matchedProfile?.slot || dg.slotType || 'Slot',
        aliases: combinedAliases,
        parameters: parametersUpdate,
        validationStatus: 'at5p_validated',
        profileStatus: 'PASS',
        parameterSource: 'at5p_discovery',
        guidSource: 'at5p_discovery',
        lastValidatedAt: new Date().toISOString(),
        lastValidatedFromPreset: presetFilename,
        confirmedGuid: dg.modelGuid || dg.matchedProfile?.guid || '',
        confirmedGearType: type,
        discoveredParameters: dg.parameters || [],
        parameterDefinitions: (dg.parameters || []).map((p: any) => ({
          displayName: p.name,
          canonicalName: p.name,
          min: p.min,
          max: p.max
        })),
        sourceHistory: [
          ...(dg.matchedProfile?.sourceHistory || []),
          { presetFilename, timestamp: new Date().toISOString(), action: 'at5p_discovery_validation' }
        ],
        validationQueueStatus: 'validated',
        discovery: {
          isDraft: false,
          importHistory: Array.from(new Set([...(dg.matchedProfile?.discovery?.importHistory || []), presetFilename])),
          detectedAt: new Date().toISOString(),
          sourcePresetFilename: presetFilename,
          dateApplied: new Date().toLocaleDateString(),
          discoverySources: [
            ...(dg.matchedProfile?.discovery?.discoverySources || []),
            { sourceType: '.at5p', confidence: '100%', notes: `Discovered from preset file: ${presetFilename}` }
          ]
        },
        validation: {
          status: 'PASS',
          gaps: [],
          reason: 'Verified and matched via .at5p preset import'
        },
        rawSources: {
          catalog: {
            guid: dg.modelGuid || '',
            displayName: displayName,
            group: type as any,
            slot: dg.matchedProfile?.slot || dg.slotType || 'Slot',
            otherNames: combinedAliases,
            paramSuffix: dg.matchedProfile?.rawSources?.catalog?.paramSuffix || ''
          },
          mappings: []
        }
      };

      // 2. Apply and save
      await gearProfileService.saveGearProfile(mergedProfile);

      // 3. Post-Apply Verification Check
      const updatedProfiles = await gearProfileService.getGearProfiles();
      const verifiedProfile = updatedProfiles.find(p => p.id === profileId);

      if (!verifiedProfile) {
        throw new Error(`Post-Apply Verification Failed: Profile for "${displayName}" (${profileId}) does not exist in the catalog after saving.`);
      }
      if (!verifiedProfile.guid || verifiedProfile.guid.toLowerCase().replace(/-/g, '').trim() !== (dg.modelGuid || '').toLowerCase().replace(/-/g, '').trim()) {
        throw new Error(`Profile update failed because GUID was missing or mismatched. Expected "${dg.modelGuid}", got "${verifiedProfile.guid}"`);
      }
      if (!verifiedProfile.parameters || verifiedProfile.parameters.length === 0) {
        throw new Error(`Post-Apply Verification Failed: Profile was saved but has no parameters configured.`);
      }
      if (verifiedProfile.validationStatus !== 'at5p_validated' && verifiedProfile.validationStatus !== 'verified_at5p') {
        throw new Error(`Post-Apply Verification Failed: validationStatus was not updated to "at5p_validated"`);
      }

      // Check if it's searchable
      const searchable = updatedProfiles.some(p => p.id === profileId && (
        p.displayName.toLowerCase().includes(displayName.toLowerCase()) ||
        p.aliases.some(a => a.toLowerCase().includes(displayName.toLowerCase()))
      ));
      if (!searchable) {
        throw new Error(`Post-Apply Verification Failed: Profile was saved but is not searchable in catalog.`);
      }

      // 4. Debug output format for Point 7
      const debugOutput = {
        action: "apply_at5p_discovery",
        discovered_name: dg.displayName,
        normalized_discovered_name: dg.displayName.toLowerCase().replace(/[^a-z0-9]/g, "").trim(),
        matched_profile_id: profileId,
        matched_profile_name: displayName,
        fields_updated: fieldsUpdated,
        validation_status_before: valStatusBefore,
        validation_status_after: "at5p_validated",
        apply_result: "success"
      };

      // Set feedback & status on applied item
      const appliedItem = {
        ...dg,
        applied: true,
        appliedAt: new Date().toLocaleTimeString(),
        debugOutput: debugOutput,
        matchedProfileId: profileId
      };

      setAppliedDiscoveries(prev => [appliedItem, ...prev]);

      // 5. Update validation queue candidates (stagedCandidates and localFileCandidates)
      const updateQueueCandidates = async (cList: IKMPAKCandidate[]) => {
        let updated = [...cList];
        for (let i = 0; i < updated.length; i++) {
          const c = updated[i];
          const matchesGuid = c.guid && dg.modelGuid && c.guid.toLowerCase().replace(/[^a-z0-9]/g, '') === dg.modelGuid.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchesName = c.name && c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === dg.displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (matchesGuid || matchesName) {
            const updatedCand = {
              ...c,
              discoveryStatus: 'at5p_validated',
              validationStatus: 'at5p_validated' as any,
              lastActionType: 'validated' as any,
              lastActionTime: new Date().toLocaleTimeString()
            };
            await at5DatabaseService.saveDiscoveryCandidate(updatedCand);
            updated[i] = updatedCand;
          }
        }
        return updated;
      };

      const nextStaged = await updateQueueCandidates(stagedCandidates);
      const nextLocal = await updateQueueCandidates(localFileCandidates);
      setStagedCandidates(nextStaged);
      setLocalFileCandidates(nextLocal);

      // Keep the item in discoveredGears but mark it as applied so that we can render the "After update" card in-place!
      setDiscoveredGears(prev => prev.map(g => {
        const matchesGuid = g.modelGuid && dg.modelGuid && g.modelGuid === dg.modelGuid;
        const matchesName = g.displayName === dg.displayName;
        if (matchesGuid || matchesName) {
          return {
            ...g,
            applied: true,
            success: true,
            error: false,
            errorMsg: null,
            successMsg: `${displayName} profile updated from .at5p discovery.`,
            confirmedGuid: dg.modelGuid || dg.matchedProfile?.guid || '',
            importedParamsCount: dg.parameters.length,
            lastValidatedAt_time: new Date().toLocaleTimeString(),
            sourcePresetFilename: presetFilename
          };
        }
        return g;
      }));

      // Trigger loadProfiles to populate updated items with verified_at5p
      await loadProfiles();

      // Automatically select the profile
      const finalProfile = updatedProfiles.find(p => p.id === profileId);
      if (finalProfile) {
        setSelectedProfile(finalProfile);
        setEditedProfile({ ...finalProfile });
        setProfileTab('overview');
      }

      setImportFeedback(`Applied discovered parameters and verified ${displayName}!`);

      // Update reviewingDiscovery so the open modal displays the in-place success summary
      setReviewingDiscovery(prev => prev ? {
        ...prev,
        applied: true,
        success: true,
        error: false,
        errorMsg: null,
        successMsg: `${displayName} profile updated from .at5p discovery.`,
        confirmedGuid: dg.modelGuid || dg.matchedProfile?.guid || '',
        importedParamsCount: dg.parameters.length,
        lastValidatedAt_time: new Date().toLocaleTimeString(),
        sourcePresetFilename: presetFilename
      } : null);

    } catch (err: any) {
      console.error("Profile update failed:", err);
      const errorMsg = err.message || err.toString();
      
      // Update discoveredGears with error state
      setDiscoveredGears(prev => prev.map(g => {
        const matchesGuid = g.modelGuid && dg.modelGuid && g.modelGuid === dg.modelGuid;
        const matchesName = g.displayName === dg.displayName;
        if (matchesGuid || matchesName) {
          return {
            ...g,
            error: true,
            errorMsg: `Profile update failed: ${errorMsg}`
          };
        }
        return g;
      }));

      // Update modal with error state too
      setReviewingDiscovery(prev => prev ? {
        ...prev,
        error: true,
        errorMsg: `Profile update failed: ${errorMsg}`
      } : null);

      console.error(`Save Failed: ${errorMsg}`);
    } finally {
      setIsLoading(false);
      setUpdatingGears(prev => prev.filter(k => k !== key));
    }
  };

  const handleApplyChildValidation = (parentCab: any, child: any) => {
    setReviewingDiscovery({
      isChildValidation: true,
      childType: child.type,
      modelGuid: child.guid,
      displayName: child.displayName,
      gearType: child.type,
      matchedProfile: child.matchedProfile,
      parentCabName: parentCab.displayName || 'Unknown Cab',
      parentCabGuid: parentCab.modelGuid || '',
      sourcePresetFilename: parentCab.sourcePresetFilename || '',
      sourceFields: child.sourceFields || [],
      parameters: [],
      importedParamsCount: 0
    });
  };

  const handleApplyChildValidationConfirmed = async (childConfirm: any) => {
    const key = childConfirm.modelGuid || childConfirm.displayName;
    setUpdatingGears(prev => [...prev, key]);
    setIsLoading(true);
    try {
      const type = childConfirm.childType;
      const guid = childConfirm.modelGuid;
      const displayName = childConfirm.displayName;
      const presetFilename = childConfirm.sourcePresetFilename || 'PARAM__BRIT8000__DEFAULT.AT5P';
      const parentCabName = childConfirm.parentCabName;
      const parentCabGuid = childConfirm.parentCabGuid;
      const sourceFields = childConfirm.sourceFields.join(", ");

      const valStatusBefore = childConfirm.matchedProfile?.validationStatus || childConfirm.matchedProfile?.validation?.status || 'unverified';

      let profileId = childConfirm.matchedProfile?.id;
      if (!profileId) {
        profileId = `gear-${guid.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      }

      const combinedAliases = Array.from(new Set([
        ...(childConfirm.matchedProfile?.aliases || []),
        displayName
      ]));

      const parametersUpdate = childConfirm.matchedProfile ? [...childConfirm.matchedProfile.parameters] : [];

      const mergedProfile: GearProfile = {
        id: profileId,
        displayName: displayName,
        type: type,
        guid: guid,
        slot: childConfirm.matchedProfile?.slot || (type === 'speaker' ? 'Speaker' : type === 'mic' ? 'Mic' : type === 'room' ? 'Room' : 'Room Mic'),
        aliases: combinedAliases,
        parameters: parametersUpdate,
        validationStatus: 'at5p_validated',
        profileStatus: 'PASS',
        parameterSource: 'cab_container_discovery',
        guidSource: 'at5p_discovery',
        lastValidatedAt: new Date().toISOString(),
        lastValidatedFromPreset: presetFilename,
        confirmedGuid: guid,
        confirmedGearType: type,
        discoveredParameters: [],
        parameterDefinitions: [],
        discoveredFromParentCab: `${parentCabName} [${parentCabGuid}]`,
        discoveredFromField: sourceFields,
        validationMethod: 'cab_container_discovery',
        sourceHistory: [
          ...(childConfirm.matchedProfile?.sourceHistory || []),
          { presetFilename, timestamp: new Date().toISOString(), action: 'cab_child_discovery_validation' }
        ],
        validationQueueStatus: 'validated',
        discovery: {
          isDraft: false,
          importHistory: Array.from(new Set([...(childConfirm.matchedProfile?.discovery?.importHistory || []), presetFilename])),
          detectedAt: new Date().toISOString(),
          sourcePresetFilename: presetFilename,
          dateApplied: new Date().toLocaleDateString(),
          discoverySources: [
            ...(childConfirm.matchedProfile?.discovery?.discoverySources || []),
            { sourceType: '.at5p', confidence: '100%', notes: `Validated from cab discovery: ${parentCabName}` }
          ]
        },
        validation: {
          status: 'PASS',
          gaps: [],
          reason: `Verified and validated as a child on the ${parentCabName} cabinet`
        },
        rawSources: {
          catalog: {
            guid: guid,
            displayName: displayName,
            group: type as any,
            slot: childConfirm.matchedProfile?.slot || (type === 'speaker' ? 'Speaker' : type === 'mic' ? 'Mic' : type === 'room' ? 'Room' : 'Room Mic'),
            otherNames: combinedAliases,
            paramSuffix: childConfirm.matchedProfile?.rawSources?.catalog?.paramSuffix || ''
          },
          mappings: []
        }
      };

      await gearProfileService.saveGearProfile(mergedProfile);
      await loadProfiles();

      const updateQueueCandidates = async (cList: IKMPAKCandidate[]) => {
        let updated = [...cList];
        for (let i = 0; i < updated.length; i++) {
          const c = updated[i];
          const matchesGuid = c.guid && guid && c.guid.toLowerCase().replace(/[^a-z0-9]/g, '') === guid.toLowerCase().replace(/[^a-z0-9]/g, '');
          const matchesName = c.name && c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === displayName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (matchesGuid || matchesName) {
            const updatedCand = {
              ...c,
              discoveryStatus: 'at5p_validated',
              validationStatus: 'at5p_validated' as any,
              lastActionType: 'validated' as any,
              lastActionTime: new Date().toLocaleTimeString()
            };
            await at5DatabaseService.saveDiscoveryCandidate(updatedCand);
            updated[i] = updatedCand;
          }
        }
        return updated;
      };

      const nextStaged = await updateQueueCandidates(stagedCandidates);
      const nextLocal = await updateQueueCandidates(localFileCandidates);
      setStagedCandidates(nextStaged);
      setLocalFileCandidates(nextLocal);

      setDiscoveredGears(prev => prev.map(parent => {
        if (parent.gearType === 'cab' && parent.childGears) {
          const updatedChildren = parent.childGears.map((childItem: any) => {
            if (childItem.guid.toLowerCase() === guid.toLowerCase() && childItem.type === type) {
              return {
                ...childItem,
                isAlreadyValidated: true,
                statusLabel: ".AT5P VALIDATED",
                matchedProfile: mergedProfile
              };
            }
            return childItem;
          });
          return { ...parent, childGears: updatedChildren };
        }
        return parent;
      }));

      setImportFeedback(`Successfully validated child gear profile "${displayName}" (${type})!`);

      setReviewingDiscovery(prev => prev ? {
        ...prev,
        applied: true,
        success: true,
        error: false,
        errorMsg: null,
        successMsg: `${displayName} child profile validated successfully.`,
        confirmedGuid: guid,
        importedParamsCount: 0,
        lastValidatedAt_time: new Date().toLocaleTimeString(),
        sourcePresetFilename: presetFilename
      } : null);

    } catch (err: any) {
      console.error("Child profile validation failed:", err);
      const errorMsg = err.message || err.toString();
      setReviewingDiscovery(prev => prev ? {
        ...prev,
        error: true,
        errorMsg: `Child profile validation failed: ${errorMsg}`
      } : null);
    } finally {
      setIsLoading(false);
      setUpdatingGears(prev => prev.filter(k => k !== key));
    }
  };

  const handleApplyDiscoveredProtocol = async (dp: any) => {
    setIsLoading(true);
    try {
      const dbType = dp.type === 'mic' ? 'mics' : dp.type === 'speaker' ? 'speakers' : 'cabs';
      await at5DatabaseService.saveVerifiedMapping(dbType, {
        guid: dp.guid,
        aliases: dp.existingAliases || [dp.suggestedName],
        brand: dp.type === 'speaker' ? 'Celestion' : undefined
      });

      setImportFeedback(`Saved discovered protocol ${dp.suggestedName} mapped to GUID: ${dp.guid}!`);
      setDiscoveredProtocols(prev => prev.filter(p => p.guid !== dp.guid));
      await loadProfiles();
    } catch (err: any) {
      console.error(err);
      setImportErrors([`Failed to save protocol: ${err.message || err}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'WARN': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'PARTIAL_WITH_FALLBACK': return 'bg-amber-500/15 text-amber-400 border-amber-500/30 font-bold';
      case 'PARTIAL': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'CHECK': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'FAIL': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="bg-[#0e0e11] border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 text-white relative overflow-hidden">
      
      {/* 1. Header block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl font-display font-black tracking-tight uppercase bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
            Gear Management
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1 tracking-widest uppercase">
            Unified catalog identities, hardware parameters, conversions & discovery
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setViewMode('profiles')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all tracking-wider flex items-center gap-2 ${viewMode === 'profiles' ? 'bg-gear-accent text-black font-semibold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            Gear Profiles
          </button>
          
          <button
            onClick={() => setViewMode('discovery')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all tracking-wider flex items-center gap-2 ${viewMode === 'discovery' ? 'bg-gear-accent text-black font-semibold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
          >
            <Upload className="w-3.5 h-3.5" />
            Import / Discovery
            {(discoveredGears.length > 0 || discoveredProtocols.length > 0) && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse ml-1" />
            )}
          </button>

          <button
            onClick={() => setViewMode('gaps')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all tracking-wider flex items-center gap-2 ${viewMode === 'gaps' ? 'bg-gear-accent text-black font-semibold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Mapping Gaps
            {gapsDashboard.length > 0 && (
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded-full ml-1 scale-90">
                {gapsDashboard.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('ikmpak')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all tracking-wider flex items-center gap-2 ${viewMode === 'ikmpak' ? 'bg-gear-accent text-black font-semibold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
          >
            <Zap className="w-3.5 h-3.5" />
            IKMPAK Accelerator
            {stagedCandidates.length > 0 && (
              <span className="bg-gear-accent/20 text-gear-accent border border-gear-accent/20 text-[10px] px-2 py-0.5 rounded-full ml-1 scale-90 animate-pulse">
                {stagedCandidates.length}
              </span>
            )}
          </button>

          <button
            onClick={loadProfiles}
            disabled={isLoading}
            className="p-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-all disabled:opacity-40"
            title="Refresh database collections on-the-fly"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-gear-accent' : ''}`} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {importFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-mono"
        >
          <CheckCircle2 className="w-5 h-5 animate-pulse" />
          <span>{importFeedback}</span>
        </motion.div>
      )}

      {/* 2. MAIN ACTIVE VIEWPORT */}
      {viewMode === 'profiles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* PROFILE SELECTION SIDEBAR */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search gear..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-gear-accent/30 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-white/5 pb-3">
              {['all', 'amp', 'stomp', 'cab', 'speaker', 'mic', 'rack'].map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`text-[9px] font-mono uppercase px-2.5 py-1 rounded-md border transition-all ${selectedType === t ? 'bg-white/10 text-white border-white/20' : 'text-gray-600 hover:text-gray-400 border-transparent'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 border-b border-white/5 pb-3">
              {['all', 'PASS', 'WARN', 'PARTIAL', 'CHECK', 'FAIL'].map(s => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`text-[9px] font-mono px-2.5 py-1 rounded-md border transition-all ${selectedStatus === s ? 'bg-white/10 text-white border-white/20' : 'text-gray-600 hover:text-gray-400 border-transparent'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="max-h-[500px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
              {filteredProfiles.length === 0 ? (
                <p className="text-xs font-mono text-gray-600 text-center py-10 uppercase">
                  No matching Gear Profiles
                </p>
              ) : (
                filteredProfiles.map(p => {
                  const isSelected = selectedProfile?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProfile(p)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${isSelected ? 'bg-white/[0.04] border-gear-accent/30 shadow-lg' : 'bg-[#121215] border-white/5 hover:border-white/10'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-gear-accent transition-colors truncate">
                          {p.displayName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{p.type}</span>
                          {p.guid ? (
                            <span className="text-[8px] font-mono text-gray-600 truncate max-w-[120px]">{p.guid}</span>
                          ) : (
                            <span className="text-[8.5px] font-mono text-yellow-600/70 font-semibold italic">GUID Missing</span>
                          )}
                        </div>
                      </div>

                      <div className={`text-[8.5px] font-mono px-2 py-0.5 rounded border ${getStatusColor(p.validation.status)}`}>
                        {p.validation.status}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* MAIN PROFILE DETAILED VIEWPORT */}
          <div className="lg:col-span-8">
            {selectedProfile && editedProfile ? (
              <div className="bg-[#121215] border border-white/5 rounded-3xl p-6 space-y-6 animate-in fade-in duration-300">
                
                {/* Profile header */}
                <div className="flex items-start justify-between gap-6 border-b border-white/5 pb-5">
                  <div>
                    <h3 className="text-xl font-bold text-white font-display">
                      {editedProfile.displayName || "Un-named Gear"}
                    </h3>
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mt-1">
                      {editedProfile.type} &bull; {editedProfile.guid || "No GUID assigned"}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${getStatusColor(editedProfile.validation.status)}`} title="Gear Profile Health">
                        Profile: {editedProfile.validation.status}
                      </div>
                      {(editedProfile.validationStatus === "at5p_validated" || editedProfile.validationStatus === "verified_at5p") && (
                        <>
                          <div className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold uppercase tracking-wider" title="AT5P Presets Discovery Status">
                            Validation: .AT5P VALIDATED
                          </div>
                          {editedProfile.validationMethod === "cab_container_discovery" && (
                            <>
                              <div className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold uppercase tracking-wider" title="Verified Provenance">
                                VERIFIED PROVENANCE
                              </div>
                              <div className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase tracking-wider" title="Validation Method">
                                Method: Cab Container Discovery
                              </div>
                            </>
                          )}
                        </>
                      )}
                      {activeInstance ? (
                        <div className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${getStatusColor(activeInstance.final_status || 'PASS')}`} title="Current Export Status">
                          Export: {activeInstance.final_status === 'PASS_WITH_WARNING' ? 'WARN' : (activeInstance.final_status || 'PASS')}
                        </div>
                      ) : (
                        <div className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-dashed border-white/10 text-gray-500">
                          Export: N/A
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-4 py-1.5 bg-gear-accent hover:bg-gear-accent/80 text-black text-[10px] font-mono font-bold uppercase rounded-xl transition-all shadow-lg flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center"
                    >
                      {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
                      Save Profile
                    </button>
                  </div>
                </div>

                {/* Instance active warning alert */}
                {activeInstance && activeInstance.final_status !== 'PASS' && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs font-mono">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <div className="font-bold text-amber-500 uppercase tracking-wide">
                        Current Export Status: {activeInstance.final_status === 'PASS_WITH_WARNING' ? 'WARN' : activeInstance.final_status}
                      </div>
                      <div className="text-gray-300 leading-relaxed">
                        {activeInstance.reason || "This gear item has unexported parameters or placement mappings in the current tone generation."}
                      </div>
                      
                      {/* Cab custom placement warning checklist */}
                      {editedProfile.type === "cab" && (
                        <div className="text-[11px] text-gray-400 space-y-1 bg-black/20 p-2 rounded-lg border border-white/5">
                          <p className="font-bold text-gray-300">Cabinet has unexported settings that must be verified:</p>
                          {(() => {
                            const entries = Object.entries(activeInstance.normalized_settings || {});
                            const placements = entries.filter(([k]) => k.toLowerCase().includes("placement"));
                            if (placements.length > 0) {
                              return (
                                <ul className="list-disc pl-4 space-y-0.5">
                                  {placements.map(([k, v]) => (
                                    <li key={k}>
                                      <span className="text-cyan-400">{k}</span>: <span className="text-white font-bold">{String(v)}</span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                            return <p className="italic text-gray-500">No mic placement settings found in tone request.</p>;
                          })()}
                        </div>
                      )}

                      {/* Other mismatches details list */}
                      {activeInstance.mismatched_parameters && activeInstance.mismatched_parameters.length > 0 && (
                        <div className="text-[11px] text-gray-400 space-y-1">
                          <p className="font-bold text-gray-300">Mismatched parameters:</p>
                          <ul className="list-disc pl-4 space-y-0.5">
                            {activeInstance.mismatched_parameters.map((p: any, i: number) => (
                              <li key={i}>{String(p)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Standard troubleshooting advice for cab mic placements */}
                      {editedProfile.type === "cab" && activeInstance.final_status === "PARTIAL" && (
                        <div className="mt-3 p-2 bg-black/30 rounded-xl border border-white/5 text-[10.5px]">
                          <span className="text-cyan-400 font-bold block mb-1">Suggested action:</span>
                          Import an AT5 preset containing the desired cab/mic placement, compare the AT5 XML values, and save a friendly mic placement mapping.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Profile Tabs Navigation */}
                <div className="flex flex-wrap gap-1 border-b border-white/5 pb-2 scrollbar-none overflow-x-auto">
                  {([
                    { k: 'overview', l: 'Overview' },
                    { k: 'aliases', l: 'Aliases' },
                    { k: 'parameters', l: 'Parameters' },
                    { k: 'export', l: 'Export Mapping' },
                    { k: 'conversion', l: 'Conversion Rules' },
                    { k: 'discovery', l: 'Discovery Hist.' },
                    { k: 'validation', l: 'Compliance Status' },
                    { k: 'compare', l: 'AT5 Compare/Import' },
                    { k: 'raw', l: 'Raw Sources' }
                  ] as const).map(tab => (
                    <button
                      key={tab.k}
                      onClick={() => setProfileTab(tab.k)}
                      className={`text-[9.5px] font-mono px-3 py-1.5 rounded-lg border transition-all ${profileTab === tab.k ? 'bg-white/10 text-white border-white/15 shadow' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
                    >
                      {tab.l}
                    </button>
                  ))}
                </div>

                {/* Tabs Views */}
                <div className="min-h-[250px]">
                  
                  {/* OVERVIEW TAB */}
                  {profileTab === 'overview' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Display Name</label>
                          <input
                            type="text"
                            value={editedProfile.displayName}
                            onChange={(e) => handleProfileFieldChange('displayName', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-gear-accent/30"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">GUID</label>
                          <input
                            type="text"
                            value={editedProfile.guid}
                            placeholder="e.g. 8fe96936-5178-4950-9b80-d89c32534bad"
                            onChange={(e) => handleProfileFieldChange('guid', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-gear-accent/30"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Group / Type</label>
                          <select
                            value={editedProfile.type}
                            onChange={(e) => handleProfileFieldChange('type', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-gear-accent/30"
                          >
                            <option value="amp">amp</option>
                            <option value="stomp">stomp</option>
                            <option value="cab">cab</option>
                            <option value="speaker">speaker</option>
                            <option value="mic">mic</option>
                            <option value="rack">rack</option>
                            <option value="room">room</option>
                            <option value="tonex">tonex</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">Slot / Section Preference</label>
                          <input
                            type="text"
                            value={editedProfile.slot}
                            placeholder="e.g. AmpA, StompB1"
                            onChange={(e) => handleProfileFieldChange('slot', e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-gear-accent/30"
                          />
                        </div>
                      </div>

                      {/* AT5P DISCOVERY VALIDATION META CARD */}
                      <div className="bg-[#161619] border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-2.5 gap-2">
                          <h4 className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                            .AT5P Discovery Provenance
                          </h4>
                          { (editedProfile.validationStatus === "at5p_validated" || editedProfile.validationStatus === "verified_at5p") ? (
                            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-black tracking-wider">
                              Verified Provenance
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-yellow-500/5 text-yellow-500/90 border border-yellow-500/10 uppercase font-semibold tracking-wider">
                              Unverified / Manual Entry
                            </span>
                          ) }
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono text-gray-300">
                          <div className="space-y-1.5 p-3 bg-black/20 rounded-xl border border-white/5 col-span-1 sm:col-span-2">
                            {editedProfile.discoveredFromParentCab && (
                              <div className="mb-2 pb-2 border-b border-white/[0.05] space-y-1.5 text-[11px]">
                                <p className="flex justify-between items-center">
                                  <span className="text-gray-500">Validation Method:</span>
                                  <span className="text-emerald-400 font-bold">Cab Container Discovery</span>
                                </p>
                                <p className="flex justify-between items-center">
                                  <span className="text-gray-500">Discovered From Cab:</span>
                                  <span className="text-white font-bold">{editedProfile.discoveredFromParentCab}</span>
                                </p>
                                <p className="flex justify-between items-center">
                                  <span className="text-gray-500">Source Field:</span>
                                  <span className="text-cyan-300 font-mono text-[10px]">{editedProfile.discoveredFromField || "(unknown)"}</span>
                                </p>
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <p className="flex justify-between items-center">
                                <span className="text-gray-500 font-mono">GUID Source:</span>
                                <span className="text-white font-bold">{editedProfile.guidSource === "at5p_discovery" ? ".AT5P Discovery" : (editedProfile.guidSource || "Manual Entry")}</span>
                              </p>
                              <p className="flex justify-between items-center sm:pl-4">
                                <span className="text-gray-500 font-mono">Last validated preset:</span>
                                <span className="text-cyan-400 font-bold truncate block max-w-[140px]" title={editedProfile.lastValidatedFromPreset}>
                                  {editedProfile.lastValidatedFromPreset || "(None)"}
                                </span>
                              </p>
                              <p className="flex justify-between items-center pt-1 border-t border-white/[0.03]">
                                <span className="text-gray-500 font-mono">Parameter Source:</span>
                                <span className="text-white font-bold">{editedProfile.parameterSource === "at5p_discovery" || editedProfile.parameterSource === "cab_container_discovery" ? "Cab Container Discovery" : (editedProfile.parameterSource || "Manual_Checks")}</span>
                              </p>
                              <p className="flex justify-between items-center pt-1 border-t border-white/[0.03] sm:pl-4">
                                <span className="text-gray-500 font-mono">Validated At:</span>
                                <span className="text-white font-bold">{editedProfile.lastValidatedAt ? new Date(editedProfile.lastValidatedAt).toLocaleString() : "(Never)"}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {editedProfile.validation.gaps.length > 0 && (
                        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-2">
                          <div className="flex items-center gap-2 text-amber-400 font-mono text-[10px] uppercase font-bold">
                            <AlertTriangle className="w-4 h-4" />
                            Gaps Detected
                          </div>
                          <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                            {editedProfile.validation.gaps.map((g, idx) => (
                              <li key={idx}>{g}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ALIASES TAB */}
                  {profileTab === 'aliases' && (
                    <div className="space-y-4">
                      <p className="text-[11px] text-gray-600 font-mono uppercase">
                        Other names parsed during AI transcription or XML detection
                      </p>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add alias..."
                          value={newAlias}
                          onChange={(e) => setNewAlias(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-gear-accent/20"
                        />
                        <button
                          onClick={handleAddAlias}
                          className="px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-200 rounded-xl transition-all"
                        >
                          Add
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {editedProfile.aliases.length === 0 ? (
                          <p className="text-xs text-gray-600 italic font-mono uppercase py-4">No aliases defined yet</p>
                        ) : (
                          editedProfile.aliases.map((alias, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-gray-300 hover:border-red-500/30 transition-all"
                            >
                              <span>{alias}</span>
                              <button
                                onClick={() => handleRemoveAlias(idx)}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                              >
                                &times;
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* PARAMETERS TAB */}
                  {profileTab === 'parameters' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-[11px] text-gray-500 font-mono uppercase">
                          Visualization ranges (Min / Max / Unit)
                        </p>
                        <button
                          onClick={handleAddNewParam}
                          className="flex items-center gap-1 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-mono uppercase px-2 py-1 rounded-lg transition-all"
                        >
                          <Plus className="w-3 h-3" /> Add Parameter
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {editedProfile.parameters.length === 0 ? (
                          <p className="text-xs text-gray-600 italic font-mono uppercase text-center py-10">No parameters identified yet</p>
                        ) : (
                          editedProfile.parameters.map((p, idx) => (
                            <div
                              key={idx}
                              className="flex flex-wrap items-center justify-between gap-3 bg-[#111114] border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold font-mono text-white">{p.displayName}</span>
                                <div className="text-[10px] font-mono text-gray-500 mt-0.5 flex gap-2">
                                  <span>Visual: {p.visual?.min ?? 0} to {p.visual?.max ?? 10} {p.visual?.unit || '(direct)'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleStartEditParam(idx)}
                                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-mono border border-white/15 text-gray-300 rounded"
                                >
                                  Edit Range
                                </button>
                                <button
                                  onClick={() => handleRemoveParam(idx)}
                                  className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* EXPORT MAPPING TAB */}
                  {profileTab === 'export' && (
                    <div className="space-y-4">
                      <p className="text-[11px] text-gray-500 font-mono uppercase">
                        AmpliTube Target XML names and parameter float ranges
                      </p>

                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {editedProfile.parameters.filter(p => p.export?.name).length === 0 ? (
                          <p className="text-xs text-gray-600 italic font-mono uppercase text-center py-10">No export coordinates set yet</p>
                        ) : (
                          editedProfile.parameters.map((p, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 bg-[#111114] border border-white/5 ... text-xs font-mono rounded-xl p-3"
                            >
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-gray-300">{p.displayName}</span>
                                <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                                  <span>XML ID: <span className="text-cyan-400 font-bold">{p.export?.name || p.canonicalName}</span></span>
                                  <span>&bull;</span>
                                  <span>XML Float Range: [{p.export?.min ?? 0} .. {p.export?.max ?? 1}]</span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleStartEditParam(idx)}
                                className="p-1 px-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-mono border border-white/15 text-gray-300 rounded"
                              >
                                Config
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* CONVERSION RULES TAB */}
                  {profileTab === 'conversion' && (
                    <div className="space-y-4">
                      <p className="text-[11px] text-gray-500 font-mono uppercase">
                        Formulas to transform human values into AmpliTube ranges
                      </p>

                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {editedProfile.parameters.map((p, idx) => (
                          <div
                            key={idx}
                            className="bg-[#111114] border border-white/5 rounded-xl p-3.5 space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold font-mono text-white">{p.displayName}</span>
                              <span className="text-[10px] font-mono text-[cyan] capitalize bg-cyan-950/20 border border-cyan-900/40 px-2 py-0.5 rounded">
                                {p.conversion?.mode || 'direct'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              <div className="text-[10.5px] text-gray-400">
                                Transformation: <span className="text-gray-300">{p.conversion?.formula || 'Default direct offset'}</span>
                              </div>
                              <div className="text-right">
                                <button
                                  onClick={() => handleStartEditParam(idx)}
                                  className="text-[10px] text-gear-accent hover:underline uppercase"
                                >
                                  Modify Rule
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DISCOVERY TAB */}
                  {profileTab === 'discovery' && (
                    <div className="space-y-5">
                      <p className="text-[11px] text-gray-500 font-mono uppercase">
                        History of physical detections & imported .at5p presets
                      </p>

                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4 text-gray-400 text-xs">
                        <History className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-mono text-gray-300 font-bold uppercase">Preset Auto-Detections Logger</p>
                          <p className="font-mono text-[10px] text-gray-500 mt-1 uppercase">
                            No imported preset logs found. Run .at5p imports under "Import / Discovery" to bootstrap history.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VALIDATION TAB */}
                  {profileTab === 'validation' && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${editedProfile.validation.status === 'PASS' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-sm font-mono font-bold uppercase text-white">Compliance Status &amp; Requirements</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/20 p-4 border border-white/5 rounded-2xl space-y-1.5">
                          <p className="text-[9.5px] font-mono text-gray-500 uppercase">Audit Target</p>
                          <p className="text-xs font-bold font-mono">DisplayName Matcher: OK</p>
                          <p className="text-xs font-bold font-mono">GUID Verification: {editedProfile.guid ? 'OK' : 'Missing'}</p>
                        </div>
                        <div className="bg-black/20 p-4 border border-white/5 rounded-2xl space-y-1.5">
                          <p className="text-[9.5px] font-mono text-gray-500 uppercase">Parameter Coverage</p>
                          <p className="text-xs font-bold font-mono">Defined Parameters: {editedProfile.parameters.length}</p>
                          <p className="text-xs font-bold font-mono">Unmapped Parameters: {editedProfile.parameters.filter(p => p.validationStatus !== 'PASS').length}</p>
                        </div>
                      </div>

                      {/* Live Export Calibration Audit */}
                      <div className="border-t border-white/5 pt-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider">Live Export Calibration Audit</h5>
                          {activeInstance ? (
                            <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider ${
                              activeInstance.final_status === "PASS"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : activeInstance.final_status === "PASS_WITH_WARNING"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {activeInstance.final_status}
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded uppercase">No Live Session</span>
                          )}
                        </div>

                        {activeInstance ? (
                          <div className="space-y-4">
                            {/* Audit Summary Card */}
                            <div className="bg-[#111114] border border-white/5 p-4 rounded-2xl space-y-2">
                              <div className="text-[10px] font-mono text-gray-500 uppercase">Audit Verdict & Reasoning</div>
                              <div className="text-[11px] font-mono text-gray-300">
                                {activeInstance.reason || (activeInstance.final_status === "PASS" ? "Validated successfully." : "Pending review.")}
                              </div>

                              {activeInstance.suggested_action && (
                                <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                                  <div className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider">Suggested Action</div>
                                  <div className="text-[11px] font-mono text-gray-400">
                                    {activeInstance.suggested_action}
                                  </div>
                                </div>
                              )}
                              
                              {/* Mismatched parameters list */}
                              {activeInstance.mismatched_parameters && activeInstance.mismatched_parameters.length > 0 && (
                                <div className="mt-3 p-3 bg-red-400/5 border border-red-500/10 rounded-xl space-y-1">
                                  <div className="text-[9px] text-red-400 uppercase font-mono font-bold">Mismatched Coordinates ({activeInstance.mismatched_parameters.length})</div>
                                  <ul className="list-disc pl-4 text-[10px] font-mono text-red-300 space-y-0.5">
                                    {activeInstance.mismatched_parameters.map((p: string, i: number) => (
                                      <li key={i}>{p}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Dropped parameters list */}
                              {activeInstance.dropped_parameters && activeInstance.dropped_parameters.length > 0 && (
                                <div className="mt-3 p-3 bg-amber-400/5 border border-amber-500/10 rounded-xl space-y-1">
                                  <div className="text-[9px] text-amber-400 uppercase font-mono font-bold">Dropped from Export ({activeInstance.dropped_parameters.length})</div>
                                  <div className="text-[10px] font-mono text-amber-300">
                                    The following settings were in the user's request but are dropped because the gear doesn't support them:
                                  </div>
                                  <ul className="list-disc pl-4 text-[10px] font-mono text-amber-300/80 space-y-0.5">
                                    {activeInstance.dropped_parameters.map((p: string, i: number) => (
                                      <li key={i}>{p}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Verification Parameter Grid */}
                            {activeInstance.parameter_details && activeInstance.parameter_details.length > 0 && (
                              <div className="space-y-2">
                                <div className="text-[10px] font-mono text-gray-500 uppercase">Parameter Conversion & Comparison Grid</div>
                                
                                <div className="border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                                  {activeInstance.parameter_details.map((detail: any, idx: number) => {
                                    const isMicPlacement = detail.parameter === "Mic 1 Placement" || detail.parameter === "Mic 2 Placement";
                                    if (isMicPlacement) {
                                      const isMic1 = detail.parameter === "Mic 1 Placement";
                                      const isFallback = detail.mapping_status === "FALLBACK_USED" || detail.mapping_status === "PARTIAL_WITH_FALLBACK" || !detail.resolved_profile_found;
                                      
                                      // Friendly source label
                                      let sourceLabel = "Cabinet Default Coordinates";
                                      if (detail.placement_source === "calibrated_profile") sourceLabel = "Calibrated Profile";
                                      else if (detail.placement_source === "at5p_discovery_profile") sourceLabel = "Imported AT5 Preset Profile";
                                      else if (detail.placement_source === "fallback_default") sourceLabel = "Fallback Default Coordinates";
                                      else if (detail.placement_source === "imported_existing_value") sourceLabel = "Imported AT5 Value";
                                      else if (detail.placement_source === "cab_default") sourceLabel = "Cabinet Default Coordinates";

                                      // Styled status badge
                                      let badgeStyle = "bg-slate-900/60 text-slate-400 border border-slate-800";
                                      let badgeText = "DEFAULT USED";
                                      if (detail.mapping_status === "RESOLVED_FROM_PROFILE") {
                                        badgeStyle = "bg-emerald-950/40 text-emerald-400 border border-emerald-500/20";
                                        badgeText = "RESOLVED FROM PROFILE";
                                      } else if (detail.mapping_status === "FALLBACK_USED") {
                                        badgeStyle = "bg-amber-950/40 text-amber-400 border border-amber-500/20";
                                        badgeText = "FALLBACK USED";
                                      } else if (detail.mapping_status === "NOT_SPECIFIED") {
                                        badgeStyle = "bg-blue-950/20 text-blue-400 border border-blue-500/20";
                                        badgeText = "DEFAULT USED";
                                      }

                                      return (
                                        <div key={idx} className="bg-black/15 p-4 space-y-3 font-mono text-xs border-b border-white/5 last:border-0">
                                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5">
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-200 font-bold">{detail.parameter}</span>
                                              <span className="text-[10px] text-cyan-400">
                                                ({isMic1 ? "TT Mic_1 → AT5 Mic0" : "TT Mic_2 → AT5 Mic1"})
                                              </span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider self-start md:self-auto ${badgeStyle}`}>
                                              {badgeText}
                                            </span>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10.5px]">
                                            <div>
                                              <div className="text-[8.5px] text-gray-500 uppercase tracking-wider mb-0.5">Intended Semantic Placement</div>
                                              <div className="text-gray-300 font-bold">{detail.display_value}</div>
                                              {detail.display_value !== "Not specified" && (
                                                <span className="text-[9px] text-gray-500 block mt-0.5">
                                                  Provided by signal chain
                                                </span>
                                              )}
                                            </div>
                                            
                                            <div>
                                              <div className="text-[8.5px] text-gray-500 uppercase tracking-wider mb-0.5">Placement Source</div>
                                              <div className="flex flex-col gap-1 mt-0.5">
                                                <span className={detail.resolved_profile_found ? "text-emerald-400 font-semibold" : isFallback ? "text-amber-400 font-semibold" : "text-blue-400 font-semibold"}>
                                                  {sourceLabel}
                                                </span>
                                                {detail.resolved_profile_found && detail.placement_profile_source && (
                                                  <span className="text-[8.5px] text-gray-500">
                                                    Profile ID: {detail.placement_profile_id ? detail.placement_profile_id.substring(0, 8) : "N/A"}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div>
                                              <div className="text-[8.5px] text-gray-500 uppercase tracking-wider mb-0.5">
                                                {isFallback ? "Fallback Exported (XML)" : "Exported (XML)"}
                                              </div>
                                              <div className="bg-black/40 p-2.5 rounded-xl border border-white/5 mt-1 space-y-1 text-gray-300 text-[10px]">
                                                {detail.exported_internal_value.split(", ").map((coord: string, cIdx: number) => (
                                                  <div key={cIdx} className="flex justify-between">
                                                    <span className="text-gray-500">{coord.split(":")[0]}:</span>
                                                    <span className="text-cyan-400 font-semibold">{coord.split(":")[1]}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>

                                          {detail.conversion_note && (
                                            <div className="text-[9.5px] text-gray-500 italic leading-normal border-t border-white/5 pt-2">
                                              Note: {detail.conversion_note}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }

                                    return (
                                      <div key={idx} className="bg-black/10 p-3.5 space-y-2 font-mono text-xs">
                                        <div className="flex items-center justify-between">
                                          <div className="text-gray-300 font-bold">
                                            {detail.parameter} 
                                            {detail.normalized_parameter && (
                                              <span className="text-[10px] text-gray-500 font-normal ml-1">
                                                (as {detail.normalized_parameter})
                                              </span>
                                            )}
                                          </div>
                                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                                            detail.mapping_status === "SUCCESS" || detail.mapping_status === "SUCCESS_NEAREST_BAND"
                                              ? "bg-emerald-500/10 text-emerald-400"
                                              : detail.mapping_status === "FALLBACK_USED" || detail.mapping_status === "PARTIAL_WITH_FALLBACK" || detail.mapping_status === "DROPPED"
                                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                                              : "bg-red-500/10 text-red-400"
                                          }`}>
                                            {detail.mapping_status === "SUCCESS_NEAREST_BAND" ? "CALIBRATED_BAND" : detail.mapping_status}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-[10.5px]">
                                          <div>
                                            <div className="text-[8.5px] text-gray-500 uppercase">Intended Input</div>
                                            <div className="text-gray-300 truncate">{detail.input_value ?? "N/A"}</div>
                                          </div>
                                          <div>
                                            <div className="text-[8.5px] text-gray-500 uppercase">Required Visual</div>
                                            <div className="text-gray-300 truncate">{detail.display_value}</div>
                                          </div>
                                          <div>
                                            <div className="text-[8.5px] text-gray-500 uppercase">Expected Export</div>
                                            <div className="text-gray-400 truncate">{detail.expected_export_value ?? "N/A"}</div>
                                          </div>
                                          <div>
                                            <div className="text-[8.5px] text-gray-500 uppercase">Actual Exported (XML)</div>
                                            <div className={`font-mono font-bold truncate ${detail.mapping_status === "FAIL" ? "text-red-400" : "text-emerald-400"}`}>
                                              {detail.exported_internal_value}
                                            </div>
                                          </div>
                                        </div>

                                        {detail.reverse_converted_display_value && detail.mapping_status !== "DROPPED" && (
                                          <div className="text-[10px] bg-black/20 p-2 rounded-lg flex items-center justify-between">
                                            <div className="text-gray-500">
                                              Loads as: <span className="text-white font-bold">{detail.reverse_converted_display_value}</span> inside AT5
                                            </div>
                                            {detail.reason && (
                                              <div className="text-red-400 text-[9px]">{detail.reason}</div>
                                            )}
                                          </div>
                                        )}

                                        {detail.conversion_note && (
                                          <div className="text-[9.5px] text-gray-500 italic mt-1 leading-normal">
                                            Note: {detail.conversion_note}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-[10.5px] font-mono text-gray-500 text-center uppercase">
                            No active translator session logs for this gear. Run a Tone Translation request with this gear in the signal chain to view real-time conversion results.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* RAW DATASOURCES TAB */}
                  {profileTab === 'raw' && (
                    <div className="space-y-4">
                      <p className="text-[11px] text-gray-500 font-mono uppercase">
                        Matched underlying catalog items, verifying indices, overrides
                      </p>
                      
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">Underlying Catalog Object</span>
                        <pre className="text-[10px] font-mono text-gray-400 bg-black/40 p-4 rounded-xl overflow-x-auto max-h-[150px]">
                          {JSON.stringify(editedProfile.rawSources.catalog, null, 2)}
                        </pre>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-gray-500 uppercase">Parameter Mappings DB Doc</span>
                        <pre className="text-[10px] font-mono text-gray-400 bg-black/40 p-4 rounded-xl overflow-x-auto max-h-[150px]">
                          {JSON.stringify(editedProfile.rawSources.mappings, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* AT5 COMPARE & IMPORT TAB */}
                  {profileTab === 'compare' && (() => {
                    const modelGuidClean = (g: string) => String(g || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const currentGuid = modelGuidClean(editedProfile.guid || '');
                    
                    const presetMatchingGear = tabPresetImportResult ? tabPresetImportResult.detectedGear.find((g: any) => {
                      if (currentGuid && modelGuidClean(g.modelGuid) === currentGuid) return true;
                      const cleanDetectName = g.displayName.toLowerCase().trim();
                      const cleanSelectedName = editedProfile.displayName.toLowerCase().trim();
                      if (cleanDetectName === cleanSelectedName) return true;
                      return editedProfile.aliases && editedProfile.aliases.some(a => a.toLowerCase().trim() === cleanDetectName);
                    }) : null;

                    return (
                      <div className="space-y-6">
                        <div className="border-b border-white/5 pb-4">
                          <h4 className="text-sm font-bold text-white font-display">AmpliTube 5 XML Preset Compare & Import</h4>
                          <p className="text-[11px] text-gray-400 font-mono mt-1">
                            Load an actual .at5p preset file to inspect real AmpliTube 5 XML parameter values, compare coordinates, and directly align your Gear Profile or save friendly mic placements.
                          </p>
                        </div>

                        {compareError && (
                          <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-xs text-red-400 font-mono">
                            {compareError}
                          </div>
                        )}

                        {compareSuccessMessage && (
                          <div className="p-3 bg-emerald-400/10 border border-emerald-400/20 rounded-xl text-xs text-emerald-400 font-mono">
                            {compareSuccessMessage}
                          </div>
                        )}

                        {/* Drag and Drop / Browse Component */}
                        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-white/10 rounded-2xl bg-black/10 hover:bg-black/20 hover:border-white/20 transition-all text-center space-y-4">
                          <div className="p-3 bg-white/5 rounded-full text-gray-400">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold font-mono text-white">
                              {tabPresetFile ? `Loaded Preset: ${tabPresetFile.name}` : "Upload AmpliTube 5 Preset File"}
                            </p>
                            <p className="text-[10px] text-gray-500 font-mono mt-1">
                              Supported file extensions: .at5p
                            </p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const el = document.createElement('input');
                                el.type = 'file';
                                el.accept = '.at5p';
                                el.onchange = async (e: any) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setTabPresetFile(file);
                                    setCompareLoading(true);
                                    setCompareError(null);
                                    setCompareSuccessMessage(null);
                                    try {
                                      const res = await parseAt5pPreset(file);
                                      if (res.errors && res.errors.length > 0) {
                                        setCompareError(res.errors.join(", "));
                                      } else {
                                        setTabPresetImportResult(res);
                                      }
                                    } catch (err: any) {
                                      setCompareError(err.message || 'Error parsing XML preset');
                                    } finally {
                                      setCompareLoading(false);
                                    }
                                  }
                                };
                                el.click();
                              }}
                              disabled={compareLoading}
                              className="px-4 py-1.5 bg-white/5 hover:bg-white/15 text-white text-[10px] font-mono font-bold uppercase rounded-xl transition-all"
                            >
                              Browse File
                            </button>
                            {tabPresetFile && (
                              <button
                                onClick={() => {
                                  setTabPresetFile(null);
                                  setTabPresetImportResult(null);
                                  setCompareError(null);
                                  setCompareSuccessMessage(null);
                                }}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-mono font-bold uppercase rounded-xl transition-all"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {tabPresetImportResult && (
                          <div className="space-y-6">
                            {!presetMatchingGear ? (
                              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl text-xs text-amber-500 font-mono leading-relaxed">
                                No matching gear for &quot;{editedProfile.displayName}&quot; found inside preset &quot;{tabPresetFile?.name}&quot;. 
                                This preset contains these gear elements:
                                <ul className="list-disc pl-4 mt-2 space-y-1">
                                  {tabPresetImportResult.detectedGear.map((ig: any, i: number) => (
                                    <li key={i}>
                                      <span className="text-white font-bold">{ig.displayName}</span> ({ig.gearType}) &bull; GUID: <span className="text-gray-400">{ig.modelGuid}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-400 font-mono flex items-center justify-between flex-wrap gap-2">
                                  <div>
                                    Matched preset gear: <span className="font-bold text-white">{presetMatchingGear.displayName}</span> ({presetMatchingGear.gearType})
                                  </div>
                                  <button
                                    onClick={async () => {
                                      setCompareLoading(true);
                                      try {
                                        const updatedProfile = { ...editedProfile };
                                        let changed = false;

                                        if (updatedProfile.guid !== presetMatchingGear.modelGuid) {
                                          updatedProfile.guid = presetMatchingGear.modelGuid;
                                          changed = true;
                                        }

                                        const presetParams = presetMatchingGear.parameters || [];
                                        for (const pp of presetParams) {
                                          const existingIndex = updatedProfile.parameters.findIndex((p: any) => p.canonicalName === pp.name || p.export?.name === pp.name);
                                          if (existingIndex >= 0) {
                                            const existing = updatedProfile.parameters[existingIndex];
                                            if (existing.defaultValue !== pp.value) {
                                              updatedProfile.parameters[existingIndex] = {
                                                ...existing,
                                                defaultValue: pp.value
                                              };
                                              changed = true;
                                            }
                                          } else {
                                            updatedProfile.parameters.push({
                                              displayName: pp.name,
                                              canonicalName: pp.name,
                                              aliases: [],
                                              visual: {
                                                min: 0,
                                                max: 10,
                                                unit: ""
                                              },
                                              export: {
                                                name: pp.name,
                                                min: 0,
                                                max: 10
                                              },
                                              conversion: {
                                                mode: "direct",
                                                formula: "x"
                                              },
                                              defaultValue: pp.value,
                                              validationStatus: "PASS"
                                            });
                                            changed = true;
                                          }
                                        }

                                        setEditedProfile(updatedProfile);
                                        await gearProfileService.saveGearProfile(updatedProfile);
                                        if (onRefreshChain) onRefreshChain();

                                        setCompareSuccessMessage("All aligned updates applied! Saved updated profile parameters.");
                                      } catch (err: any) {
                                        setCompareError(`Apply failed: ${err.message}`);
                                      } finally {
                                        setCompareLoading(false);
                                      }
                                    }}
                                    disabled={compareLoading}
                                    className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-500 text-black text-[10px] font-mono font-bold uppercase rounded-lg transition-all"
                                  >
                                    Apply Updates
                                  </button>
                                </div>

                                {/* Cabinet categorized view */}
                                {editedProfile.type === "cab" ? (
                                  <div className="space-y-4">
                                    {(() => {
                                      const presetParamsMapCopy = new Map<string, string | number>();
                                      presetMatchingGear.parameters.forEach((p: any) => {
                                        presetParamsMapCopy.set(p.name, p.value);
                                      });

                                      const getCurrentProfileParamVal = (attr: string): string => {
                                        const match = editedProfile.parameters.find(p => p.canonicalName === attr || p.export?.name === attr);
                                        if (match) return String(match.defaultValue ?? "N/A");
                                        return "N/A";
                                      };

                                      const categories = [
                                        {
                                          title: "Cabinet & Speaker Assets",
                                          attrs: ["CabModel", "SpeakerModel0", "SpeakerModel1", "SpeakerModel2", "SpeakerModel3"]
                                        },
                                        {
                                          title: "Microphones & Room Ambience",
                                          attrs: ["Mic0Model", "Mic1Model", "RoomType", "RoomMicType"]
                                        },
                                        {
                                          title: "Mic 1 Placement Settings",
                                          attrs: ["Mic0Angle", "Mic0XAxis", "Mic0YAxis", "Mic0Distance", "Mic0Speaker"]
                                        },
                                        {
                                          title: "Mic 2 Placement Settings",
                                          attrs: ["Mic1Angle", "Mic1XAxis", "Mic1YAxis", "Mic1Distance", "Mic1Speaker"]
                                        }
                                      ];

                                      return (
                                        <div className="space-y-6">
                                          {categories.map((cat, ci) => (
                                            <div key={ci} className="bg-black/10 border border-white/5 rounded-2xl p-4 space-y-3">
                                              <h5 className="text-[11px] font-bold font-mono text-cyan-400 uppercase tracking-widest">{cat.title}</h5>
                                              <div className="divide-y divide-white/5">
                                                {cat.attrs.map(attr => {
                                                  const currVal = getCurrentProfileParamVal(attr);
                                                  const presetVal = String(presetParamsMapCopy.get(attr) ?? "N/A");
                                                  const diff = currVal !== presetVal && currVal !== "N/A" && presetVal !== "N/A";

                                                  return (
                                                    <div key={attr} className="flex items-center justify-between py-2 text-xs font-mono">
                                                      <div className="text-gray-400">{attr}</div>
                                                      <div className="flex items-center gap-4">
                                                        <div className="text-[11px]">
                                                          <span className="text-gray-500 mr-1.5 uppercase text-[9px]">Profile:</span>
                                                          <span className="text-gray-300">{currVal}</span>
                                                        </div>
                                                        <div className="text-[11px]">
                                                          <span className="text-gray-500 mr-1.5 uppercase text-[9px]">Preset:</span>
                                                          <span className={diff ? "text-amber-400 font-bold" : "text-white"}>{presetVal}</span>
                                                        </div>
                                                        {diff && (
                                                          <span className="text-[8.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase tracking-wider">
                                                            Diff
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                ) : (
                                  /* General Non-Cab item simple table */
                                  <div className="bg-black/10 border border-white/5 rounded-2xl p-4 space-y-3">
                                    <h5 className="text-[11.5px] font-bold font-mono text-cyan-400 uppercase tracking-widest">Parameters Comparison</h5>
                                    <div className="divide-y divide-white/5">
                                      {presetMatchingGear.parameters.map((p: any) => {
                                        const match = editedProfile.parameters.find(ep => ep.canonicalName === p.name || ep.export?.name === p.name);
                                        const currVal = match ? String(match.defaultValue ?? "N/A") : "N/A";
                                        const presetVal = String(p.value);
                                        const diff = currVal !== presetVal && currVal !== "N/A";

                                        return (
                                          <div key={p.name} className="flex items-center justify-between py-2 text-xs font-mono">
                                            <div className="text-gray-400">{p.name}</div>
                                            <div className="flex items-center gap-4">
                                              <div className="text-[11px]">
                                                <span className="text-gray-500 mr-1 uppercase text-[9px]">Profile:</span>
                                                <span className="text-gray-300">{currVal}</span>
                                              </div>
                                              <div className="text-[11px]">
                                                <span className="text-gray-500 mr-1 uppercase text-[9px]">Preset:</span>
                                                <span className={diff ? "text-amber-400 font-bold" : "text-white"}>{presetVal}</span>
                                              </div>
                                              {diff && (
                                                <span className="text-[8.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 uppercase tracking-wider">
                                                  Diff
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Mic placement Mapping Discoverer & Creator form (Task 10/11) */}
                                {editedProfile.type === "cab" && (
                                  <div className="bg-gradient-to-br from-amber-500/5 to-transparent p-5 border border-amber-500/10 rounded-2xl space-y-4">
                                    <div className="space-y-1">
                                      <span className="text-amber-500 font-mono text-[9px] uppercase font-bold tracking-widest">Mic Placement Calibration</span>
                                      <h4 className="text-sm font-bold text-white font-display">Mic Placement Calibration & Profile Creator</h4>
                                      <p className="text-[11px] text-gray-400 leading-relaxed">
                                        Found active mic coordinates inside this cabinet preset! Calibrate semantic placement labels to map automatically to these precise AT5 preset values.
                                      </p>
                                    </div>

                                    {/* Mic 0 and Mic 1 Calibration Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* MIC 0 CALIBRATION CARD */}
                                      <div className="bg-black/30 p-4 border border-white/5 rounded-xl space-y-4 flex flex-col justify-between">
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Mic 0 (Mic 1 Slot) Settings</span>
                                            <span className="text-[8.5px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 uppercase">Input Slot</span>
                                          </div>
                                          
                                          {/* Discovered numeric values */}
                                          <div className="grid grid-cols-5 gap-2 bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                                            {(() => {
                                              const prefix = "Mic0";
                                              const fields = [`${prefix}Angle`, `${prefix}XAxis`, `${prefix}YAxis`, `${prefix}Distance`, `${prefix}Speaker`];
                                              const presetParamsMapCopy = new Map<string, string | number>();
                                              presetMatchingGear.parameters.forEach((p: any) => {
                                                presetParamsMapCopy.set(p.name, p.value);
                                              });

                                              return fields.map(f => {
                                                const val = presetParamsMapCopy.get(f) ?? "0";
                                                return (
                                                  <div key={f}>
                                                    <span className="text-[8px] font-mono text-gray-500 block truncate">{f.replace(prefix, '')}</span>
                                                    <span className="text-[11px] font-mono font-bold text-white mt-0.5 block truncate">{String(val)}</span>
                                                  </div>
                                                );
                                              });
                                            })()}
                                          </div>

                                          {/* Input friendly name */}
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Semantic Name / Label</label>
                                            <input
                                              type="text"
                                              placeholder="e.g. Cap Edge, Close"
                                              value={mic0CalibrateLabel}
                                              onChange={(e) => setMic0CalibrateLabel(e.target.value)}
                                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none placeholder:text-gray-600"
                                            />
                                          </div>
                                        </div>

                                        <button
                                          onClick={async () => {
                                            if (!mic0CalibrateLabel.trim()) {
                                              setCompareError("Please enter a semantic label (e.g. Cap Edge, Close) to save Mic 0 mapping.");
                                              return;
                                            }
                                            setCompareLoading(true);
                                            setCompareError(null);
                                            setCompareSuccessMessage(null);

                                            try {
                                              const prefix = "Mic0";
                                              const fields = [`${prefix}Angle`, `${prefix}XAxis`, `${prefix}YAxis`, `${prefix}Distance`, `${prefix}Speaker`];
                                              const presetParamsMapCopy = new Map<string, string | number>();
                                              presetMatchingGear.parameters.forEach((p: any) => {
                                                presetParamsMapCopy.set(p.name, p.value);
                                              });

                                              const xmlValuesToSave: any = {};
                                              fields.forEach(f => {
                                                xmlValuesToSave[f] = presetParamsMapCopy.get(f) ?? "0";
                                              });

                                              const labelStr = mic0CalibrateLabel.trim();
                                              let placement = labelStr;
                                              let distance = "Close";
                                              if (labelStr.includes(",")) {
                                                const parts = labelStr.split(",");
                                                placement = parts[0].trim();
                                                distance = parts[1].trim();
                                              }

                                              await at5DatabaseService.saveMicPlacementMapping({
                                                gear: editedProfile.displayName,
                                                friendly_setting: "Mic_1_Placement",
                                                friendly_value: labelStr,
                                                friendly_placement: placement || undefined,
                                                friendly_distance: distance || undefined,
                                                maps_to: xmlValuesToSave,
                                                status: "validated"
                                              });

                                              await refreshDbParameterMappings();
                                              if (onRefreshChain) onRefreshChain();

                                              setCompareSuccessMessage(`Successfully registered Mic 0 placement mapping "${labelStr}" for "${editedProfile.displayName}"!`);
                                              setMic0CalibrateLabel("");
                                            } catch (err: any) {
                                              setCompareError(`Failed to save mapping: ${err.message}`);
                                            } finally {
                                              setCompareLoading(false);
                                            }
                                          }}
                                          disabled={compareLoading}
                                          className="w-full py-2 mt-2 bg-cyan-500 hover:bg-cyan-600 text-black text-[10px] font-mono font-bold uppercase rounded-lg transition-all shadow"
                                        >
                                          Save Mic 0 Placement Profile
                                        </button>
                                      </div>

                                      {/* MIC 1 CALIBRATION CARD */}
                                      <div className="bg-black/30 p-4 border border-white/5 rounded-xl space-y-4 flex flex-col justify-between">
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">Mic 1 (Mic 2 Slot) Settings</span>
                                            <span className="text-[8.5px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase">Input Slot</span>
                                          </div>
                                          
                                          {/* Discovered numeric values */}
                                          <div className="grid grid-cols-5 gap-2 bg-white/5 p-2 rounded-lg border border-white/5 text-center">
                                            {(() => {
                                              const prefix = "Mic1";
                                              const fields = [`${prefix}Angle`, `${prefix}XAxis`, `${prefix}YAxis`, `${prefix}Distance`, `${prefix}Speaker`];
                                              const presetParamsMapCopy = new Map<string, string | number>();
                                              presetMatchingGear.parameters.forEach((p: any) => {
                                                presetParamsMapCopy.set(p.name, p.value);
                                              });

                                              return fields.map(f => {
                                                const val = presetParamsMapCopy.get(f) ?? "0";
                                                return (
                                                  <div key={f}>
                                                    <span className="text-[8px] font-mono text-gray-500 block truncate">{f.replace(prefix, '')}</span>
                                                    <span className="text-[11px] font-mono font-bold text-white mt-0.5 block truncate">{String(val)}</span>
                                                  </div>
                                                );
                                              });
                                            })()}
                                          </div>

                                          {/* Input friendly name */}
                                          <div className="space-y-1.5">
                                            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block">Semantic Name / Label</label>
                                            <input
                                              type="text"
                                              placeholder="e.g. Cone Edge, Close"
                                              value={mic1CalibrateLabel}
                                              onChange={(e) => setMic1CalibrateLabel(e.target.value)}
                                              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none placeholder:text-gray-600"
                                            />
                                          </div>
                                        </div>

                                        <button
                                          onClick={async () => {
                                            if (!mic1CalibrateLabel.trim()) {
                                              setCompareError("Please enter a semantic label (e.g. Cone Edge, Close) to save Mic 1 mapping.");
                                              return;
                                            }
                                            setCompareLoading(true);
                                            setCompareError(null);
                                            setCompareSuccessMessage(null);

                                            try {
                                              const prefix = "Mic1";
                                              const fields = [`${prefix}Angle`, `${prefix}XAxis`, `${prefix}YAxis`, `${prefix}Distance`, `${prefix}Speaker`];
                                              const presetParamsMapCopy = new Map<string, string | number>();
                                              presetMatchingGear.parameters.forEach((p: any) => {
                                                presetParamsMapCopy.set(p.name, p.value);
                                              });

                                              const xmlValuesToSave: any = {};
                                              fields.forEach(f => {
                                                xmlValuesToSave[f] = presetParamsMapCopy.get(f) ?? "0";
                                              });

                                              const labelStr = mic1CalibrateLabel.trim();
                                              let placement = labelStr;
                                              let distance = "Close";
                                              if (labelStr.includes(",")) {
                                                const parts = labelStr.split(",");
                                                placement = parts[0].trim();
                                                distance = parts[1].trim();
                                              }

                                              await at5DatabaseService.saveMicPlacementMapping({
                                                gear: editedProfile.displayName,
                                                friendly_setting: "Mic_2_Placement",
                                                friendly_value: labelStr,
                                                friendly_placement: placement || undefined,
                                                friendly_distance: distance || undefined,
                                                maps_to: xmlValuesToSave,
                                                status: "validated"
                                              });

                                              await refreshDbParameterMappings();
                                              if (onRefreshChain) onRefreshChain();

                                              setCompareSuccessMessage(`Successfully registered Mic 1 placement mapping "${labelStr}" for "${editedProfile.displayName}"!`);
                                              setMic1CalibrateLabel("");
                                            } catch (err: any) {
                                              setCompareError(`Failed to save mapping: ${err.message}`);
                                            } finally {
                                              setCompareLoading(false);
                                            }
                                          }}
                                          disabled={compareLoading}
                                          className="w-full py-2 mt-2 bg-amber-400 hover:bg-amber-500 text-black text-[10px] font-mono font-bold uppercase rounded-lg transition-all shadow"
                                        >
                                          Save Mic 1 Placement Profile
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                </div>

              </div>
            ) : (
              <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-12 text-center h-full flex flex-col items-center justify-center space-y-4">
                <Database className="w-12 h-12 text-gray-700 animate-pulse" />
                <div>
                  <h4 className="text-sm font-bold font-display uppercase tracking-widest text-gray-400">No Profile Selected</h4>
                  <p className="text-xs text-gray-600 font-mono uppercase mt-1">Select a gear item from the left bar or do an AT5 import</p>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3. IMPORT / DISCOVERY VIEWPORT */}
      {viewMode === 'discovery' && (
        <div className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer relative ${dragActive ? 'border-gear-accent bg-gear-accent/[0.05]' : 'border-white/10 hover:border-white/20 bg-white/[0.01]'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".at5p"
              className="hidden"
              onChange={handleFileSelect}
            />

            <Upload className="w-10 h-10 text-gray-500 mx-auto mb-4 animate-bounce" />
            <p className="text-sm font-display font-bold uppercase text-white">Drag and drop your .at5p file here</p>
            <p className="text-xs text-gray-500 font-mono mt-1 uppercase">or click to browse your storage</p>
          </div>

          {importErrors.length > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs uppercase font-bold">
                <AlertCircle className="w-4 h-4" /> Import Failed
              </div>
              <ul className="text-xs space-y-1 list-disc list-inside">
                {importErrors.map((e, idx) => <li key={idx}>{e}</li>)}
              </ul>
            </div>
          )}

          {importedPresetName && (
            <div className="bg-[#121215] border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <span className="text-sm font-bold font-mono text-gear-accent uppercase">Preset File: {importedPresetName}</span>
                <button
                  onClick={() => {
                    setImportedPresetName('');
                    setDiscoveredGears([]);
                    setDiscoveredProtocols([]);
                  }}
                  className="p-1 hover:bg-white/10 rounded-md transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500 hover:text-white" />
                </button>
              </div>

              {/* Detected Gear list */}
              {discoveredGears.length === 0 && discoveredProtocols.length === 0 && appliedDiscoveries.length === 0 ? (
                <p className="text-xs text-gray-500 font-mono uppercase text-center py-6">All detected gear is already fully updated</p>
              ) : (
                <div className="space-y-6">
                  
                  {discoveredGears.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest">Discovered Active Gear</h4>
                      <div className="space-y-3">
                        {discoveredGears.map((dg, idx) => {
                          const isUpdating = updatingGears.includes(dg.modelGuid || dg.displayName);
                          const isApplied = !!dg.applied;
                          const showSuccess = isApplied && dg.success;
                          const showError = dg.error && dg.errorMsg;

                          return (
                            <div
                              key={idx}
                              className={`bg-[#18181c] border rounded-2xl p-5 flex flex-col gap-4 ${isApplied ? 'border-emerald-500/20 bg-emerald-950/5' : 'border-white/5'}`}
                            >
                              {/* SUCCESS STATE */}
                              {showSuccess ? (
                                <div className="space-y-4">
                                  {/* Badges row */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase">
                                      .AT5P VALIDATED
                                    </span>
                                    <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                                      {dg.updatesExisting ? "EXISTING PROFILE UPDATED" : "NEW PROFILE CREATED"}
                                    </span>
                                    <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 uppercase">
                                      PASS
                                    </span>
                                  </div>

                                  {/* Inline Success Message */}
                                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs uppercase font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>{dg.successMsg || `${dg.displayName} profile updated from .at5p discovery.`}</span>
                                  </div>

                                  {/* Small summary details */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-black/20 p-3.5 rounded-xl border border-white/5 text-[11px] font-mono text-gray-300">
                                    <div className="space-y-1">
                                      <p><span className="text-gray-500 uppercase">Updated Profile:</span> <span className="text-white font-bold">{dg.displayName}</span></p>
                                      <p><span className="text-gray-500 uppercase">Confirmed GUID:</span> <span className="text-yellow-500">{dg.confirmedGuid}</span></p>
                                    </div>
                                    <div className="space-y-1">
                                      <p><span className="text-gray-500 uppercase">Parameters Imported:</span> <span className="text-cyan-400 font-bold">{dg.importedParamsCount}</span></p>
                                      <p><span className="text-gray-500 uppercase">Source File:</span> <span className="text-white">{dg.sourcePresetFilename}</span></p>
                                    </div>
                                  </div>

                                  {/* Final Review Area */}
                                  <div className="text-[10.5px] font-mono bg-[#1c1c22] border border-white/5 rounded-xl p-3.5 space-y-1.5 gray-300">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1">Final Review / Status Details</p>
                                    <p><span className="text-gray-400">Match Result:</span> <span className="text-emerald-400 font-bold">{dg.updatesExisting ? "Existing Profile Updated" : "New Profile Created"}</span></p>
                                    <p><span className="text-gray-400">Target profile:</span> <span className="text-white font-bold">{dg.displayName}</span></p>
                                    <p><span className="text-gray-400">Validation status:</span> <span className="text-sky-400 font-bold">.AT5P VALIDATED</span></p>
                                    <p><span className="text-gray-400">Last action:</span> <span className="text-gray-300">Updated from .at5p discovery at <span className="text-white">{dg.lastValidatedAt_time}</span></span></p>
                                    <p><span className="text-gray-400">Source preset:</span> <span className="text-cyan-400">{dg.sourcePresetFilename}</span></p>
                                  </div>

                                  {/* Nested Child Component Discovery for Cabinet (Validated Block) */}
                                  {dg.gearType === 'cab' && dg.childGears && dg.childGears.length > 0 && (
                                    <div className="bg-[#111114] border border-emerald-500/10 rounded-xl p-4 space-y-3.5 mt-3">
                                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest flex items-center gap-1.5 font-bold">
                                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                          Cabinet Nested Components Discovery
                                        </span>
                                        <span className="text-[9px] font-mono text-gray-400">
                                          {dg.childGears.length} components parsed from Cab
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 gap-2">
                                        {dg.childGears.map((child: any, childIdx: number) => {
                                          const isChildValidating = updatingGears.includes(child.guid);
                                          return (
                                            <div 
                                              key={childIdx}
                                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-lg text-xs"
                                            >
                                              <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-white">{child.displayName}</span>
                                                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-purple-500/20 text-purple-400 uppercase">
                                                    {child.type}
                                                  </span>
                                                  <span className="text-[10px] font-mono text-gray-500">{child.guid}</span>
                                                </div>
                                                <div className="text-[10.5px] font-mono text-gray-400 flex flex-wrap gap-x-2.5">
                                                  <span><span className="text-gray-500">Source fields:</span> {child.sourceFields.join(", ")}</span>
                                                  <span>•</span>
                                                  <span>
                                                    <span className="text-gray-500">Match:</span>{' '}
                                                    <span className={child.matchedProfile ? "text-emerald-400 font-semibold" : "text-amber-500"}>
                                                      {child.matchedProfile ? (
                                                        (child.type === 'room' || child.type === 'room_mic' || child.type === 'roomMic') ? (
                                                          `Existing ${child.type === 'room' ? 'Room' : 'Room Mic'} Profile Found: ${child.matchedProfile.displayName}`
                                                        ) : (
                                                          `Profile found: ${child.matchedProfile.displayName}`
                                                        )
                                                      ) : "Awaiting Identity Resolution"}
                                                    </span>
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                                                  child.isAlreadyValidated
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                                }`}>
                                                  {child.statusLabel}
                                                </span>

                                                <button
                                                  onClick={() => {
                                                    if (child.isAlreadyValidated && child.matchedProfile) {
                                                      handleSelectProfile(child.matchedProfile);
                                                    } else {
                                                      handleApplyChildValidation(dg, child);
                                                    }
                                                  }}
                                                  disabled={isChildValidating}
                                                  className={`px-2.5 py-1 text-[9.5px] font-mono font-bold uppercase rounded-lg transition-all ${
                                                    child.isAlreadyValidated
                                                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-pointer'
                                                      : 'bg-cyan-500 hover:bg-cyan-600 text-black'
                                                  }`}
                                                >
                                                  {child.isAlreadyValidated ? "already validated / view profile" : "Validate Child"}
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                /* BEFORE / ACTIVE STATE */
                                <div className="space-y-4">
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-white">{dg.displayName}</span>
                                        <span className="text-[8px] font-mono px-2 py-0.5 rounded border border-cyan-500/10 text-cyan-400 capitalize">
                                          {dg.gearType}
                                        </span>
                                        <span className="text-[10px] font-mono text-gray-500 truncate max-w-[120px]">{dg.modelGuid}</span>
                                      </div>
                                      <p className="text-[10.5px] font-mono text-yellow-500 uppercase">
                                        Match Result: {dg.updatesExisting ? "Updates Existing Profile" : "No existing profile found (Creates new profile)"}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {isUpdating && (
                                        <div className="flex items-center gap-1.5 text-[10px] text-amber-500 font-mono animate-pulse uppercase mr-2">
                                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                          <span>Processing update...</span>
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleApplyDiscovered(dg)}
                                        disabled={isUpdating}
                                        className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-xl transition-all shadow-md flex items-center gap-1.5 ${
                                          isUpdating 
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5' 
                                            : 'bg-gear-accent hover:bg-gear-accent/80 text-black'
                                        }`}
                                      >
                                        {isUpdating ? (
                                          <>
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            <span>Updating Gear Profile...</span>
                                          </>
                                        ) : (
                                          dg.updatesExisting 
                                            ? 'Update Gear Profile From .at5p Discovery'
                                            : 'Create Unverified Profile From .at5p Discovery'
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Discovered Parameters list classified dynamically for Cabinets */}
                                  {dg.gearType === 'cab' ? (() => {
                                    const { numeric, references, selectors } = categorizeParams(dg.parameters);
                                    return (
                                      <div className="space-y-3.5 border-t border-white/5 pt-3">
                                        <p className="text-[9px] font-mono text-gray-500 uppercase font-bold tracking-wider">Discovered Cab Data</p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                          {/* Numeric Parameters */}
                                          <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
                                            <p className="text-[8px] font-mono text-yellow-500 uppercase font-bold">Numeric Parameters ({numeric.length})</p>
                                            <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                                              {numeric.map((p: any, idx: number) => (
                                                <span key={idx} className="text-[8.5px] font-mono bg-white/[0.03] border border-white/5 text-gray-400 px-1.5 py-0.5 rounded">
                                                  {p.name}: {p.value}
                                                </span>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Gear References */}
                                          <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
                                            <p className="text-[8px] font-mono text-purple-400 uppercase font-bold">Gear References ({references.length})</p>
                                            <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                                              {references.map((p: any, idx: number) => (
                                                <span key={idx} className="text-[8.5px] font-mono bg-purple-950/20 border border-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded select-all">
                                                  {p.name}: {p.value}
                                                </span>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Selector/Enum Values */}
                                          <div className="bg-black/20 p-2.5 rounded-xl border border-white/5 space-y-1">
                                            <p className="text-[8px] font-mono text-cyan-400 uppercase font-bold">Selector/Enum Values ({selectors.length})</p>
                                            <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                                              {selectors.map((p: any, idx: number) => (
                                                <span key={idx} className="text-[8.5px] font-mono bg-cyan-950/20 border border-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded">
                                                  {p.name}: {p.value}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })() : (
                                    /* Standard parameter flat list */
                                    <div>
                                      <p className="text-[9px] font-mono text-gray-500 uppercase font-bold mb-1.5">Discovered Parameters</p>
                                      <div className="flex flex-wrap gap-2">
                                        {dg.parameters.map((p: any, pIdx: number) => (
                                          <span key={pIdx} className="text-[8.5px] font-mono bg-white/[0.03] border border-white/5 text-gray-400 px-2 py-0.5 rounded">
                                            {p.name} [{p.value}]
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Discovered Child Component validation triggers for Cabinet */}
                                  {dg.gearType === 'cab' && dg.childGears && dg.childGears.length > 0 && (
                                    <div className="bg-[#111114] border border-white/10 rounded-xl p-4 space-y-3.5 mt-2">
                                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest flex items-center gap-1.5 font-bold">
                                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                          Cabinet Nested Components Discovery
                                        </span>
                                        <span className="text-[9px] font-mono text-gray-500">
                                          {dg.childGears.length} components parsed from Cab
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 gap-2">
                                        {dg.childGears.map((child: any, childIdx: number) => {
                                          const isChildValidating = updatingGears.includes(child.guid);
                                          return (
                                            <div 
                                              key={childIdx}
                                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg text-xs"
                                            >
                                              <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-bold text-white">{child.displayName}</span>
                                                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-purple-500/20 text-purple-400 uppercase">
                                                    {child.type}
                                                  </span>
                                                  <span className="text-[10px] font-mono text-gray-500">{child.guid}</span>
                                                </div>
                                                <div className="text-[10.5px] font-mono text-gray-400 flex flex-wrap gap-x-2.5">
                                                  <span><span className="text-gray-500">Source fields:</span> {child.sourceFields.join(", ")}</span>
                                                  <span>•</span>
                                                  <span>
                                                    <span className="text-gray-500">Match:</span>{' '}
                                                    <span className={child.matchedProfile ? "text-emerald-400 font-semibold" : "text-amber-500"}>
                                                      {child.matchedProfile ? (
                                                        (child.type === 'room' || child.type === 'room_mic' || child.type === 'roomMic') ? (
                                                          `Existing ${child.type === 'room' ? 'Room' : 'Room Mic'} Profile Found: ${child.matchedProfile.displayName}`
                                                        ) : (
                                                          `Profile found: ${child.matchedProfile.displayName}`
                                                        )
                                                      ) : "Awaiting Identity Resolution"}
                                                    </span>
                                                  </span>
                                                </div>
                                              </div>

                                              <div className="flex items-center gap-2 shrink-0">
                                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                                                  child.isAlreadyValidated
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                                                }`}>
                                                  {child.statusLabel}
                                                </span>

                                                <button
                                                  onClick={() => {
                                                    if (child.isAlreadyValidated && child.matchedProfile) {
                                                      handleSelectProfile(child.matchedProfile);
                                                    } else {
                                                      handleApplyChildValidation(dg, child);
                                                    }
                                                  }}
                                                  disabled={isChildValidating}
                                                  className={`px-2.5 py-1 text-[9.5px] font-mono font-bold uppercase rounded-lg transition-all ${
                                                    child.isAlreadyValidated
                                                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-pointer'
                                                      : 'bg-cyan-500 hover:bg-cyan-600 text-black'
                                                  }`}
                                                >
                                                  {child.isAlreadyValidated ? "already validated / view profile" : "Validate Child"}
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Before Update Review Summary Area */}
                                  <div className="text-[10.5px] font-mono bg-black/10 border border-white/5 rounded-xl p-3.5 space-y-1 text-gray-400">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1">Status Summary</p>
                                    <p><span className="text-gray-500">Match Result:</span> <span className="text-yellow-500 font-bold">{dg.updatesExisting ? "Updates Existing Profile" : "No existing profile found (Creates new profile)"}</span></p>
                                    <p><span className="text-gray-500">Target profile:</span> <span className="text-white font-bold">{dg.updatesExisting ? (dg.matchedProfile?.displayName || dg.displayName) : "(none) - A new draft profile will be initialized"}</span></p>
                                    <p><span className="text-gray-500">Validation status:</span> <span className={`${(dg.matchedProfile?.validationStatus === "verified_at5p" || dg.matchedProfile?.validationStatus === "at5p_validated") ? "text-emerald-400" : "text-blue-400"} font-bold`}>{(dg.matchedProfile?.validationStatus === "verified_at5p" || dg.matchedProfile?.validationStatus === "at5p_validated") ? ".AT5P VALIDATED" : (dg.matchedProfile?.validationStatus === "awaiting_at5p_validation" ? "Awaiting .AT5P Validation" : "Awaiting .AT5P Validation / Unverified")}</span></p>
                                    <p><span className="text-gray-500">Action available:</span> <span className="text-emerald-400">{dg.updatesExisting ? "Update Gear Profile From .at5p Discovery" : "Create Unverified Profile From .at5p Discovery"}</span></p>
                                  </div>

                                  {/* Failure feedback */}
                                  {showError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400/90 font-mono text-[11px] rounded-xl flex items-start gap-2">
                                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="font-bold uppercase block text-red-400 text-xs">Profile Update Failed</span>
                                        {dg.errorMsg}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {discoveredProtocols.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest">Discovered Cabinet Protocols (Mics/Speakers)</h4>
                      <div className="space-y-3">
                        {discoveredProtocols.map((dp, idx) => (
                          <div
                            key={idx}
                            className="bg-[#18181c] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-white">{dp.suggestedName}</span>
                                <span className="text-[8px] font-mono px-2 py-0.5 rounded border border-purple-500/10 text-purple-400 capitalize">
                                  {dp.type}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500">{dp.guid}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleApplyDiscoveredProtocol(dp)}
                              className="px-3 py-1.5 bg-gear-accent hover:bg-gear-accent/80 text-black text-[10px] font-mono font-bold uppercase rounded-xl transition-all shadow-md"
                            >
                              Verify Protocol Match
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Applied / History Section */}
                  {appliedDiscoveries.length > 0 && (
                    <div className="space-y-3 pt-6 border-t border-white/5">
                      <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-emerald-400" />
                        Applied / Discovery History
                      </h4>
                      <div className="space-y-3">
                        {appliedDiscoveries.map((ad, idx) => (
                          <div
                            key={idx}
                            className="bg-[#111411] border border-emerald-500/10 rounded-2xl p-5 space-y-4"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                              <div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-white">{ad.displayName}</span>
                                  <span className="text-[8px] font-mono px-2 py-0.5 rounded border border-emerald-500/20 text-emerald-400 uppercase font-bold">
                                    APPLIED
                                  </span>
                                  <span className="text-[10px] font-mono text-gray-500 truncate max-w-[124px]">{ad.modelGuid}</span>
                                </div>
                                <p className="text-[10px] font-mono text-emerald-400/80 mt-1 uppercase">
                                  Successfully updated brand identity &amp; parameters
                                </p>
                              </div>

                              <button
                                onClick={() => {
                                  const found = profiles.find(p => p.id === ad.matchedProfileId);
                                  if (found) {
                                    setSelectedProfile(found);
                                    setEditedProfile({ ...found });
                                    setProfileTab('overview');
                                    setViewMode('profiles');
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] font-mono font-bold uppercase rounded-xl transition-all shadow-md self-start sm:self-auto"
                              >
                                View Updated Gear Profile
                              </button>
                            </div>

                            {/* Confirmation Summary fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-gray-300">
                              <div className="space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                                <p className="text-[9px] text-gray-500 uppercase">Profile Details</p>
                                <p><span className="text-gray-400">Target Identity ID:</span> <span className="text-cyan-400 font-bold">{ad.matchedProfileId}</span></p>
                                <p><span className="text-gray-400">Target Name:</span> {ad.displayName === "Darrell 100" || ad.matchedProfileId === "amp_darrell_100" ? "Darrell 100" : ad.displayName}</p>
                                <p><span className="text-gray-400">Normalized Name:</span> {ad.displayName.toLowerCase().replace(/[^a-z0-9]/g, "").trim()}</p>
                                <p><span className="text-gray-400">Gear Type:</span> {ad.gearType}</p>
                              </div>
                              <div className="space-y-1 bg-black/20 p-3 rounded-xl border border-white/5">
                                <p className="text-[9px] text-gray-500 uppercase">Apply Metadata &amp; Status</p>
                                <p><span className="text-gray-400">Validation Status:</span> <span className="text-emerald-400 font-bold">at5p_validated</span></p>
                                <p><span className="text-gray-400">Discovery Source:</span> .at5p Preset</p>
                                <p><span className="text-gray-400">Time Applied:</span> {ad.appliedAt}</p>
                              </div>
                            </div>

                            {/* Debug output JSON */}
                            <div className="space-y-1.5 bg-[#0a0a0c] p-4 rounded-xl border border-white/10">
                              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Apply Action JSON Debug Log</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(JSON.stringify(ad.debugOutput, null, 2));
                                    setCopiedIndex(idx);
                                    setTimeout(() => setCopiedIndex(null), 1500);
                                  }}
                                  className="text-[9px] font-mono text-cyan-400 hover:underline hover:text-cyan-300 uppercase"
                                >
                                  {copiedIndex === idx ? "✓ Copied!" : "Copy Debug Object"}
                                </button>
                              </div>
                              <pre className="text-[9px] font-mono text-cyan-400/95 overflow-x-auto whitespace-pre leading-relaxed p-1 scrollbar-thin">
                                {JSON.stringify(ad.debugOutput, null, 2)}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. MAPPING GAPS DASHBOARD */}
      {viewMode === 'gaps' && (
        <div className="space-y-6">
          <div className="bg-[#121215] border border-white/5 rounded-2xl p-4 flex items-center gap-3 text-amber-400 text-xs font-mono">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-bold uppercase block">Curation Hub For Incomplete Mappings</span>
              <span className="text-gray-400 text-[10.5px]">
                The following gear items have missing GUID metadata, unverified physical parameters, or lack appropriate conversions.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gapsDashboard.length === 0 ? (
              <p className="text-xs font-mono text-gray-500 text-center uppercase py-12 col-span-3">No pending mapping gaps found!</p>
            ) : (
              gapsDashboard.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectProfile(item.profile)}
                  className="bg-[#111114] border border-white/5 rounded-2xl p-4 hover:border-gear-accent/30 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-white leading-tight">{item.profile.displayName}</span>
                      <span className="text-[8.5px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase">
                        {item.gapType}
                      </span>
                    </div>
                    
                    <p className="text-[10px] font-mono text-gray-500 mt-2 line-clamp-2 uppercase leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-[9.5px] font-mono font-bold text-gear-accent uppercase">
                    Fix coordinates <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* IKMPAK DISCOVERY ACCELERATOR VIEWPORT */}
      {viewMode === 'ikmpak' && (
        <div className="space-y-8">
          {/* Notifications / feedback */}
          {candidateFileError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-3 relative">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-xs uppercase block font-mono">Error Occurred</span>
                <span className="text-xs text-gray-400 font-mono block">{candidateFileError}</span>
              </div>
              <button onClick={() => setCandidateFileError(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {candidateFileFeedback && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-start gap-3 relative">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-xs uppercase block font-mono">Accelerator Status</span>
                <span className="text-xs text-gray-400 font-mono block">{candidateFileFeedback}</span>
              </div>
              <button onClick={() => setCandidateFileFeedback(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#121215] border border-white/5 rounded-2xl p-6">
            <div className="space-y-1.5 md:max-w-md">
              <h3 className="text-sm font-bold font-mono text-white uppercase flex items-center gap-2">
                <Zap className="w-4 h-4 text-gear-accent" /> IKMPAK Candidate Importer (Staging Area)
              </h3>
              <p className="text-[10.5px] text-gray-500 uppercase leading-relaxed">
                Import candidates from AmpliTube 5 .pak and verify them into real Gear Profiles without automatically overwriting active parameter maps.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={candFileInputRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleCandidateFileUpload(e.target.files[0]);
                  }
                }}
              />
              <button
                onClick={() => candFileInputRef.current?.click()}
                className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-mono font-bold uppercase rounded-xl transition-all"
              >
                Upload CSV / JSON
              </button>

              {localFileCandidates.length > 0 && (
                <>
                  <button
                    onClick={handleSaveCandidatesToStaging}
                    className="px-4 py-2 bg-gear-accent hover:bg-gear-accent/80 text-black text-xs font-mono font-bold uppercase rounded-xl transition-all shadow-md animate-pulse"
                  >
                    Commit {localFileCandidates.length} to Staging
                  </button>
                  <button
                    onClick={() => {
                      setLocalFileCandidates([]);
                      setCandidateFileFeedback(null);
                    }}
                    className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-mono font-bold uppercase rounded-xl transition-all"
                  >
                    Clear Import
                  </button>
                </>
              )}

              {stagedCandidates.length > 0 && (
                <button
                  onClick={() => {
                    if (!clearStagingConfirmOpen) {
                      setClearStagingConfirmOpen(true);
                      setTimeout(() => setClearStagingConfirmOpen(false), 3000);
                    } else {
                      handleClearStaging();
                      setClearStagingConfirmOpen(false);
                    }
                  }}
                  className={`px-4 py-2 text-xs font-mono font-bold uppercase rounded-xl transition-all ${
                    clearStagingConfirmOpen 
                      ? "bg-red-600 text-white animate-pulse" 
                      : "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
                  }`}
                >
                  {clearStagingConfirmOpen ? "Confirm Clear Staging Area!" : "Clear Staging Area"}
                </button>
              )}
            </div>
          </div>

          {/* Master Detail Split */}
          {stagedCandidates.length === 0 && localFileCandidates.length === 0 ? (
            <div className="border border-white/5 bg-[#121215] rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
              <UploadCloud className="w-12 h-12 text-gray-600 mx-auto animate-bounce" />
              <h3 className="text-md font-bold uppercase tracking-wide">No candidates staged yet</h3>
              <p className="text-xs text-gray-500 uppercase leading-relaxed">
                Upload a cleaned IKMPAK gear candidates JSON or CSV file containing source metadata, names, GUID candidates, and keywords to begin accelerating.
              </p>
              <button
                id="upload-button-empty"
                onClick={() => candFileInputRef.current?.click()}
                className="px-5 py-2.5 bg-gear-accent hover:bg-gear-accent/80 text-black text-xs font-mono font-bold uppercase rounded-xl transition-all shadow-md ml-2 animate-bounce"
              >
                Choose Candidate File
              </button>
            </div>
          ) : (() => {
            const itemsToDisplay = localFileCandidates.length > 0 ? localFileCandidates : stagedCandidates;

            // Precompute filtered and sorted candidates so both columns have sync access
            const filteredCandidates = itemsToDisplay.filter(c => {
              // Determine if Hide Actioned is active (ignored for 'queued', 'validated', 'actioned' filters)
              let activeHideActioned = hideActioned;
              if (['queued', 'validated', 'actioned'].includes(ikmpakFilter)) {
                activeHideActioned = false;
              }

              const evalOutcome = evaluateCandidate(c, profiles);
              const matchedProf = findMatchedProfile(c, profiles);
              const isStaged = stagedCandidates.some(sc => sc.id === c.id);

              // Build cardBadges representation for search
              const searchBadges: string[] = [];
              if (!isStaged) {
                searchBadges.push("LOCAL FILE UNSAVED");
              }
              
              const currentStatus = c.discoveryStatus;
              const qStatus = getValidationQueueStatus(c);
              const isQueued = qStatus === "queued" || currentStatus === "awaiting_at5p_validation" || (c as any).validationQueueStatus === "awaiting_at5p_validation" || matchedProf?.validationStatus === "awaiting_at5p_validation";
              const isValidated = qStatus === "validated" || matchedProf?.validationStatus === "verified_at5p" || matchedProf?.validationStatus === "at5p_validated" || currentStatus === "at5p_validated";

              if (currentStatus === "rejected") {
                searchBadges.push("REJECTED");
              } else if (currentStatus === "merged") {
                searchBadges.push("MERGED");
              } else if (isValidated) {
                searchBadges.push(".AT5P VALIDATED");
              } else if (isQueued) {
                searchBadges.push("AWAITING .AT5P VALIDATION");
              } else if (matchedProf?.validationStatus === "discovered_unverified" || currentStatus === "applied_unverified") {
                searchBadges.push("APPLIED UNVERIFIED");
              }

              if (evalOutcome.statuses.includes("Alias collision")) {
                searchBadges.push("ALIAS COLLISION");
              }
              if (evalOutcome.statuses.includes("Existing gear match")) {
                searchBadges.push("EXISTING GEAR MATCH");
              }

              // Check isActioned (for activeHideActioned filter)
              const isActioned = ['merged', 'applied_unverified', 'awaiting_at5p_validation', 'rejected', 'at5p_validated'].includes(currentStatus || '') ||
                                 matchedProf?.validationStatus === "verified_at5p" ||
                                 matchedProf?.validationStatus === "at5p_validated" ||
                                 matchedProf?.validationStatus === "awaiting_at5p_validation" ||
                                 isQueued || isValidated;

              if (activeHideActioned && isActioned) return false;

              // Compile searchable fields
              const searchSegments = [
                c.name,
                c.candidateGearType || "",
                c.guid || "",
                c.shortName || "",
                c.importBatchId || "",
                ...searchBadges,
                ...evalOutcome.statuses,
                c.lastActionType || "",
                c.discoveryStatus || "",
                matchedProf?.validationStatus || ""
              ].map(s => (s || "").toLowerCase());

              const query = ikmpakSearch.toLowerCase().trim();
              const matchesSearch = query === "" || searchSegments.some(segment => segment.includes(query));
              
              if (!matchesSearch) return false;

              // Filter Match mappings
              // NEW: LOCAL FILE UNSAVED or no action taken yet
              const isNew = (!isStaged || ['new_candidate', 'missing_keywords', 'missing_collection_tags', ''].includes(currentStatus || '')) &&
                            !['merged', 'applied_unverified', 'awaiting_at5p_validation', 'rejected'].includes(currentStatus || '') &&
                            !isQueued && !isValidated;

              // MATCHES: EXISTING GEAR MATCH or matchedProf exists
              const isMatch = evalOutcome.statuses.includes('Existing gear match') || !!matchedProf;

              // ISSUES: ALIAS COLLISION, GUID MISMATCH, TYPE MISMATCH, PARAMETER WARNING or general issue
              const isIssue = evalOutcome.statuses.some(s => [
                'Type mismatch', 'GUID mismatch', 'Alias collision', 'Possible duplicate', 'Parameter warning'
              ].includes(s));

              // ACTIONED: merged, applied unverified, awaiting validation, .at5p validated, rejected
              const hasActioned = isActioned;

              if (ikmpakFilter === 'new') return isNew;
              if (ikmpakFilter === 'matches') return isMatch;
              if (ikmpakFilter === 'issues') return isIssue;
              if (ikmpakFilter === 'queued') return isQueued;
              if (ikmpakFilter === 'validated') return isValidated;
              if (ikmpakFilter === 'actioned') return hasActioned;

              return true;
            });

            // Sort items stably based on user preference
            const sortedCandidates = [...filteredCandidates].sort((a, b) => {
              if (ikmpakSortBy === 'name') {
                return a.name.localeCompare(b.name);
              }
              if (ikmpakSortBy === 'status') {
                return (a.discoveryStatus || '').localeCompare(b.discoveryStatus || '');
              }
              // Default: Original Import Order (importIndex)
              const idxA = a.importIndex !== undefined ? a.importIndex : 99999;
              const idxB = b.importIndex !== undefined ? b.importIndex : 99999;
              if (idxA !== idxB) return idxA - idxB;
              return a.name.localeCompare(b.name);
            });

            const isSelectedCandidateVisible = selectedCandidate 
              ? sortedCandidates.some(c => getCandidateKey(c) === getCandidateKey(selectedCandidate))
              : false;

            return (
              <div className="grid grid-cols-12 gap-6 items-start">
                {/* Left Side: Candidates list */}
                <div className="col-span-12 lg:col-span-7 space-y-4">
                  <div className="bg-[#121215] border border-white/5 p-4 rounded-2xl flex flex-col gap-4">
                    {/* Row 1: Search & Sort */}
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          className="w-full bg-[#16161a] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs font-mono placeholder:text-gray-600 text-white uppercase focus:outline-none focus:border-gear-accent/50"
                          placeholder="Search staged items..."
                          value={ikmpakSearch}
                          onChange={(e) => setIkmpakSearch(e.target.value)}
                        />
                      </div>
                      
                      {/* Sort Order dropdown */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Sort:</span>
                        <select
                          value={ikmpakSortBy}
                          onChange={(e) => setIkmpakSortBy(e.target.value as any)}
                          className="bg-[#16161a] border border-white/5 rounded-xl py-2 px-3 text-[10px] font-mono text-white focus:outline-none uppercase"
                        >
                          <option value="import">Original Import Order</option>
                          <option value="name">Name (A-Z)</option>
                          <option value="status">Status</option>
                        </select>
                      </div>
                    </div>

                    {/* Divider line */}
                    <div className="h-px bg-white/5 w-full" />

                    {/* Row 2: Wrapping Filters together with checkbox and reload */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between w-full overflow-hidden">
                      <div className="flex items-center gap-1.5 justify-start overflow-x-auto max-w-full pb-1 -mb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
                        {['all', 'new', 'matches', 'issues', 'queued', 'validated', 'actioned'].map((f) => (
                          <button
                            key={f}
                            onClick={() => setIkmpakFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all border shrink-0 ${ikmpakFilter === f ? 'bg-gear-accent text-black border-gear-accent' : 'bg-[#16161a] border-white/5 text-gray-400 hover:text-white hover:border-white/15'}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>

                      {/* Refresh and Hide Checkbox */}
                      <div className="flex items-center gap-2.5">
                        <label className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 uppercase cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-white/10 bg-[#16161a] text-gear-accent focus:ring-0 focus:ring-offset-0"
                            checked={hideActioned}
                            onChange={(e) => setHideActioned(e.target.checked)}
                          />
                          Hide Actioned
                        </label>

                        <button
                          onClick={handleManualRefresh}
                          disabled={isCandidatesLoading}
                          className="p-1.5 bg-[#16161a] border border-white/5 hover:border-white/10 text-gray-400 hover:text-white rounded-xl transition-all"
                          title="Manual Reload"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isCandidatesLoading ? 'animate-spin text-gear-accent' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Note message for Queued status ignoring Hide Actioned */}
                  {ikmpakFilter === 'queued' && hideActioned && (
                    <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 rounded-xl text-[10.5px] font-mono text-blue-400 uppercase select-none flex items-center gap-2 animate-pulse">
                      <Info className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Queued filter is showing actioned validation items.</span>
                    </div>
                  )}

                  <div ref={candidateListRef} className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                    {sortedCandidates.length === 0 ? (
                      <div className="text-center py-12 text-xs font-mono text-gray-500 uppercase">
                        No matching candidates found inside filters.
                      </div>
                    ) : (
                      sortedCandidates.map((c, index) => {
                        const details = evaluateCandidate(c, profiles);
                        const isStaged = stagedCandidates.some(sc => sc.id === c.id);
                        const isSelected = selectedCandidate && getCandidateKey(selectedCandidate) === getCandidateKey(c);
                        const matchedProf = findMatchedProfile(c, profiles);

                        // Build the badge list dynamically to ensure accurate status representation
                        const cardBadges: { label: string; style: string }[] = [];

                        if (!isStaged) {
                          cardBadges.push({ label: "LOCAL FILE UNSAVED", style: "bg-amber-500/10 text-amber-400 border border-amber-500/20" });
                        }
                        
                        const currentStatus = c.discoveryStatus;
                        
                        if (currentStatus === "rejected") {
                          cardBadges.push({ label: "REJECTED", style: "bg-rose-500/15 text-rose-400 border border-rose-500/20" });
                        } else if (currentStatus === "merged") {
                          cardBadges.push({ label: "MERGED", style: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" });
                        } else if (matchedProf?.validationStatus === "verified_at5p" || matchedProf?.validationStatus === "at5p_validated" || currentStatus === "at5p_validated") {
                          cardBadges.push({ label: ".AT5P VALIDATED", style: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold" });
                        } else if (matchedProf?.validationStatus === "awaiting_at5p_validation" || currentStatus === "awaiting_at5p_validation") {
                          cardBadges.push({ label: "AWAITING .AT5P VALIDATION", style: "bg-blue-500/15 text-blue-400 border border-blue-500/20" });
                        } else if (matchedProf?.validationStatus === "discovered_unverified" || currentStatus === "applied_unverified") {
                          cardBadges.push({ label: "APPLIED UNVERIFIED", style: "bg-teal-500/10 text-teal-400 border border-teal-500/20" });
                        }

                        if (details.statuses.includes("Alias collision")) {
                          cardBadges.push({ label: "ALIAS COLLISION", style: "bg-red-500/15 text-red-400 border border-red-500/20 font-bold" });
                        }
                        if (details.statuses.includes("Existing gear match")) {
                          cardBadges.push({ label: "EXISTING GEAR MATCH", style: "bg-green-500/10 text-green-400 border border-green-500/20 font-bold" });
                        }

                        return (
                          <div
                            key={c.id || index}
                            onClick={() => handleSelectCandidate(c)}
                            className={`border rounded-2xl p-4 transition-all cursor-pointer relative ${isSelected ? 'border-gear-accent bg-gear-accent/[0.03]' : 'border-white/5 hover:border-white/10 bg-[#121215]'}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-bold text-white leading-tight block truncate uppercase">{c.name}</span>
                                  <span className={`text-[8.5px] font-mono px-2 py-0.5 rounded capitalize font-semibold tracking-wider ${
                                    c.candidateGearType === 'stomp' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                    c.candidateGearType === 'rack' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                    c.candidateGearType === 'amp' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                    'bg-green-500/10 text-green-400 border border-green-500/20'
                                  }`}>
                                    {c.candidateGearType}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-wider text-gray-500">
                                  <span>Batch: {c.importBatchId}</span>
                                  {c.guid && <span>ID: {c.guid.slice(0, 8)}...</span>}
                                  {c.collectionTags && c.collectionTags.length > 0 && <span>Coll: {c.collectionTags.join(", ")}</span>}
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-1 items-end justify-end max-w-[200px]" style={{ alignSelf: 'center' }}>
                                {cardBadges.map((b, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${b.style}`}
                                  >
                                    {b.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Side: Curation details */}
                <div className="col-span-12 lg:col-span-5">
                  {!selectedCandidate ? (
                    <div className="border border-white/5 bg-[#121215] rounded-3xl p-12 text-center text-gray-500 space-y-3">
                      <Activity className="w-10 h-10 text-gray-600 mx-auto" />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400">Review Desk Active</h4>
                      <p className="text-[10.5px] uppercase leading-relaxed max-w-xs mx-auto">
                        Select any candidate on the left grid list to inspect validation reports, map safe keywords, enforce slot-type locks, and promote as active Gear Profiles.
                      </p>
                    </div>
                  ) : !isSelectedCandidateVisible ? (
                    <div className="border border-white/5 bg-[#121215] rounded-3xl p-12 text-center text-gray-500 space-y-3">
                      <EyeOff className="w-10 h-10 text-gray-600 mx-auto" />
                      <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-gray-400">Selected item hidden</h4>
                      <p className="text-[10.5px] uppercase leading-relaxed max-w-xs mx-auto text-amber-500 font-bold">
                        Selected item hidden by current filter.
                      </p>
                    </div>
                  ) : (
                  <div className="border border-white/10 bg-[#121215] rounded-3xl p-6 md:p-8 space-y-6">
                    {/* Header */}
                    <div className="space-y-2 border-b border-white/5 pb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gear-accent uppercase tracking-widest font-bold">Staging Review Block</span>
                        <button
                          onClick={() => handleDeleteStagedCandidate(selectedCandidate.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Delete from list"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="text-xl font-display font-black uppercase text-white">{selectedCandidate.name}</h4>
                      <p className="text-[10px] font-mono text-gray-500 uppercase">GUID: {selectedCandidate.guid || 'None specified'}</p>
                      
                      {/* Last Action status line */}
                      <div className="mt-2 text-[9px] font-mono uppercase bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg flex items-center gap-2">
                        <span className="text-gray-500">Last Action:</span>
                        {(() => {
                          const typeVal = selectedCandidate.lastActionType || selectedCandidate.discoveryStatus;
                          const timeVal = selectedCandidate.lastActionTime;
                          
                          if (typeVal === "merged") {
                            return (
                              <span className="text-emerald-400 font-bold">
                                Merged selected keywords / aliases{timeVal ? ` at ${timeVal}` : ''}
                              </span>
                            );
                          }
                          if (typeVal === "applied_unverified") {
                            return (
                              <span className="text-teal-400 font-bold">
                                Applied as unverified profile{timeVal ? ` at ${timeVal}` : ''}
                              </span>
                            );
                          }
                          if (typeVal === "awaiting_at5p_validation") {
                            return (
                              <span className="text-blue-400 font-bold">
                                Sent to validation queue{timeVal ? ` at ${timeVal}` : ''}
                              </span>
                            );
                          }
                          if (typeVal === "rejected") {
                            return (
                              <span className="text-rose-400 font-bold">
                                Rejected{timeVal ? ` at ${timeVal}` : ''}
                              </span>
                            );
                          }
                          return <span className="text-gray-400 text-[8.5px]">None</span>;
                        })()}
                      </div>
                    </div>

                    {/* Action Feedback success / error alerts inside Staging Review Block */}
                    {ikmpakActionFeedback && (
                      <div className={`p-3 rounded-xl border font-mono text-[10.5px] uppercase ${
                        ikmpakActionFeedback.type === 'success' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        {ikmpakActionFeedback.text}
                      </div>
                    )}

                    {/* Compare Report */}
                    {(() => {
                      const evaluation = evaluateCandidate(selectedCandidate, profiles);
                      const matchedProf = findMatchedProfile(selectedCandidate, profiles);

                      return (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <span className="text-[9.5px] font-mono text-gray-400 uppercase tracking-wider block">Comparison Report:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {evaluation.statuses.map((stat, idx) => (
                                <span
                                  key={idx}
                                  className={`text-[9px] font-mono font-bold uppercase px-2 py-1 rounded-md border ${
                                    stat.includes('match') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' :
                                    stat.includes('mismatch') || stat.includes('collision') ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                    'bg-white/5 text-gray-400 border-white/10'
                                  }`}
                                >
                                  {stat}
                                </span>
                              ))}
                            </div>
                          </div>

                          {matchedProf && (
                            <div className="bg-[#16161a] border border-white/5 p-4 rounded-xl space-y-1.5">
                              <span className="text-[8.5px] font-mono text-gray-500 uppercase block">Matched Profile Identity:</span>
                              <span className="text-xs font-bold font-mono text-white block uppercase">{matchedProf.displayName}</span>
                              <span className="text-[9px] font-mono text-gray-500 block uppercase">
                                Type: {matchedProf.type} • GUID: {(matchedProf.guid && !matchedProf.guid.startsWith('gear-')) ? matchedProf.guid : 'None'}
                              </span>
                            </div>
                          )}

                          {/* Interactive Slot Lock */}
                          <div className="space-y-2 border-t border-white/5 pt-4">
                            <div className="flex items-center justify-between">
                              <span className="text-[9.5px] font-mono text-gray-400 uppercase tracking-widest font-bold">Slot Type Lock Selection:</span>
                              <span className="text-[8.5px] font-mono text-gray-500">Source: {selectedCandidate.candidateGearType}</span>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-1 bg-[#16161a] p-1 rounded-xl font-mono text-xs uppercase text-white">
                              {['stomp', 'rack', 'amp', 'cab'].map((typeOption) => {
                                const selected = promotionType === typeOption;
                                return (
                                  <button
                                    key={typeOption}
                                    type="button"
                                    onClick={() => setPromotionType(typeOption)}
                                    className={`py-1.5 text-[9px] font-mono font-bold uppercase rounded-lg transition-all ${selected ? 'bg-gear-accent text-black font-semibold' : 'text-gray-400 hover:text-white'}`}
                                  >
                                    {typeOption}
                                  </button>
                                );
                              })}
                            </div>
                            
                            {/* Validation warning if they place candidate in slot contradicting slotlock */}
                            {(() => {
                              const slot = promotionType === "rack" ? "Rack" : promotionType === "amp" ? "Amplifier" : promotionType === "cab" ? "CabA" : "Slot";
                              const isValid = isSlotTypeValid(promotionType, slot);
                              if (!isValid) {
                                  return (
                                    <p className="text-[9px] font-mono text-rose-400 uppercase select-none">
                                      ⚠️ Type contradiction: Cannot put {promotionType} in a non-matching slot. Correct locked slot is recommended!
                                    </p>
                                  );
                                }
                                return (
                                  <p className="text-[9px] font-mono text-emerald-400 uppercase select-none">
                                    ✓ Slot Match safe: Place {promotionType} into standard "{slot}" slot securely.
                                  </p>
                                );
                              })()}
                            </div>
  
                            {/* Safe Alias review Checklist */}
                            <div className="space-y-3 border-t border-white/5 pt-4">
                              <span className="text-[9.5px] font-mono text-gray-400 uppercase tracking-widest font-bold block">Alias Suggestions Review Checklist:</span>
                              
                              {evaluation.suggestedAliases.length === 0 ? (
                                <div className="bg-[#101014] border border-emerald-500/10 p-3 rounded-xl flex items-center gap-2">
                                  <span className="text-emerald-400 text-sm">✓</span>
                                  <p className="text-[10.5px] font-mono text-emerald-400 uppercase font-bold leading-relaxed select-none">No unresolved alias collisions.</p>
                                </div>
                              ) : (
                                <div className="space-y-2 bg-[#16161a] p-3 rounded-xl max-h-[220px] overflow-y-auto custom-scrollbar">
                                  {evaluation.suggestedAliases.map((alias) => {
                                    const classification = (evaluation.aliasClassifications || []).find(ac => ac.alias === alias);
                                    const safety = evaluateAliasSafety(alias);
                                    const isChecked = promotionAliases.includes(alias);
                                    const isConflict = classification?.status === 'conflicts_with_other_profile';
                                    
                                    return (
                                      <div key={alias} className={`flex items-start gap-2.5 text-xs p-2.5 rounded-xl border ${isConflict ? 'bg-red-500/5 border-red-500/20' : 'bg-[#18181c]/50 border-white/5'}`}>
                                        <input
                                          type="checkbox"
                                          id={`alias-check-${alias}`}
                                          className="mt-1 accent-gear-accent"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setPromotionAliases(prev => [...prev, alias]);
                                            } else {
                                              setPromotionAliases(prev => prev.filter(a => a !== alias));
                                            }
                                          }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <label htmlFor={`alias-check-${alias}`} className="font-mono text-[10.5px] text-white uppercase font-bold cursor-pointer">{alias}</label>
                                            {isConflict && (
                                              <span className="text-[8.5px] font-mono bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded uppercase font-black tracking-wider select-none">CONFLICT</span>
                                            )}
                                          </div>
                                          {isConflict && classification?.conflictProfileName && (
                                            <span className="text-[8.5px] font-mono text-red-400 block uppercase font-medium mt-0.5">⚠️ Conflicts with existing profile: "{classification.conflictProfileName}"</span>
                                          )}
                                          {!isConflict && safety.safe && (
                                            <span className="text-[8.5px] font-mono text-emerald-400 block uppercase font-normal mt-0.5">{safety.reason}</span>
                                          )}
                                          {!safety.safe && (
                                            <span className="text-[8.5px] font-mono text-rose-400 block uppercase font-normal mt-0.5">{safety.reason}</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Secondary collections of non-actionable aliases */}
                              {(() => {
                                const alreadyAssignedList = (evaluation.aliasClassifications || []).filter(ac => ac.status === 'already_on_this_profile' || ac.status === 'accepted_previously');
                                const ignoredList = (evaluation.aliasClassifications || []).filter(ac => ac.status === 'ignored_for_this_profile');
                                const blockedGenericList = (evaluation.aliasClassifications || []).filter(ac => ac.status === 'too_generic_blocked');

                                return (
                                  <div className="space-y-2 mt-4 select-none">
                                    {alreadyAssignedList.length > 0 && (
                                      <details className="group border border-white/5 rounded-xl bg-[#131316] p-2">
                                        <summary className="text-[9.5px] font-mono text-gray-400 uppercase font-bold cursor-pointer select-none flex items-center justify-between outline-none">
                                          <span>Already Assigned Aliases ({alreadyAssignedList.length})</span>
                                          <span className="transition-transform group-open:rotate-180 text-[10px] text-gray-500">▼</span>
                                        </summary>
                                        <div className="mt-2 space-y-1.5 pl-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                                          {alreadyAssignedList.map(item => (
                                            <div key={item.alias} className="text-[10px] font-mono text-gray-500 flex items-center justify-between py-0.5 border-b border-white/[0.02]">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-emerald-500">✓</span>
                                                <span className="uppercase font-bold">{item.alias}</span>
                                              </div>
                                              <span className="text-[8px] text-gray-650 uppercase font-medium">on profile</span>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}

                                    {ignoredList.length > 0 && (
                                      <details className="group border border-white/5 rounded-xl bg-[#131316] p-2">
                                        <summary className="text-[9.5px] font-mono text-gray-400 uppercase font-bold cursor-pointer select-none flex items-center justify-between outline-none">
                                          <span>Ignored Suggestions ({ignoredList.length})</span>
                                          <span className="transition-transform group-open:rotate-180 text-[10px] text-gray-500">▼</span>
                                        </summary>
                                        <div className="mt-2 space-y-1.5 pl-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                                          {ignoredList.map(item => (
                                            <div key={item.alias} className="text-[10px] font-mono text-gray-500 flex items-center justify-between py-0.5 border-b border-white/[0.02]">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-gray-600">⊖</span>
                                                <span className="uppercase font-bold line-through decoration-gray-600">{item.alias}</span>
                                              </div>
                                              <span className="text-[8px] text-gray-650 uppercase font-medium">ignored</span>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}

                                    {blockedGenericList.length > 0 && (
                                      <details className="group border border-white/5 rounded-xl bg-[#131316] p-2">
                                        <summary className="text-[9.5px] font-mono text-gray-400 uppercase font-bold cursor-pointer select-none flex items-center justify-between outline-none">
                                          <span>Blocked Generic Aliases ({blockedGenericList.length})</span>
                                          <span className="transition-transform group-open:rotate-180 text-[10px] text-gray-500">▼</span>
                                        </summary>
                                        <div className="mt-2 space-y-1.5 pl-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                                          {blockedGenericList.map(item => (
                                            <div key={item.alias} className="text-[10px] font-mono text-gray-500 flex flex-col gap-0.5 py-1 border-b border-white/[0.02]">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-rose-500/70">⚠️</span>
                                                <span className="uppercase font-bold text-rose-305/70">{item.alias}</span>
                                              </div>
                                              <span className="text-[8px] text-rose-450/50 uppercase font-normal">{item.safetyReason}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
  
                            {/* Confidence promote picker */}
                            <div className="space-y-2 border-t border-white/5 pt-4">
                              <span className="text-[9.5px] font-mono text-gray-400 uppercase tracking-widest font-bold block">Assigned Confidence Level:</span>
                              <select
                                value={selectedConfidence}
                                onChange={(e) => setSelectedConfidence(e.target.value)}
                                className="w-full bg-[#16161a] border border-white/5 rounded-xl py-2 px-3 text-xs font-mono text-white focus:outline-none uppercase"
                              >
                                <option value="discovered_unverified">discovered_unverified</option>
                                <option value="ikmpak_candidate">ikmpak_candidate</option>
                                <option value="at5p_discovered">at5p_discovered</option>
                                <option value="at5p_verified">at5p_verified</option>
                                <option value="manually_validated">manually_validated</option>
                              </select>
                              <p className="text-[9px] font-mono text-gray-500 uppercase leading-relaxed">
                                * Keep in mind: Promoting an IKMPAK candidate stores keywords, aliases, and name, but leaves real XML structures unverified until actual .at5p validation.
                              </p>
                            </div>
  
                             {/* Submit Actions */}
                             <div className="flex flex-col gap-2.5 border-t border-white/5 pt-6 font-mono">
                               {matchedProf ? (
                                 <>
                                   <button
                                     onClick={() => handlePromoteCandidate(selectedCandidate, promotionType, promotionAliases, selectedConfidence, false)}
                                     disabled={ikmpakActionLoading !== null}
                                     className="w-full px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/20 disabled:text-emerald-400/40 text-black text-xs font-mono font-black uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                   >
                                     {ikmpakActionLoading === 'merging' ? (
                                       <>
                                         <RefreshCw className="w-4 h-4 animate-spin" /> Merging...
                                       </>
                                     ) : (
                                       <>
                                         <Plus className="w-4 h-4" /> Merge Keywords & Tag Aliases
                                       </>
                                     )}
                                   </button>
                                   
                                   {evaluation.suggestedAliases.length > 0 && (
                                     <button
                                       onClick={() => {
                                         // Unselected ones are what we should explicitly ignore
                                         const unselected = evaluation.suggestedAliases.filter(alias => !promotionAliases.includes(alias));
                                         if (unselected.length > 0) {
                                           handleIgnoreAliases(selectedCandidate, unselected);
                                         } else {
                                           setIkmpakActionFeedback({ text: "Checklist is fully selected. Nothing to ignore.", type: 'error' });
                                         }
                                       }}
                                       disabled={ikmpakActionLoading !== null}
                                       className="w-full px-4 py-2.5 bg-yellow-600/20 border border-yellow-500/20 hover:bg-yellow-650/30 text-yellow-400 text-xs font-mono font-bold uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                     >
                                       <EyeOff className="w-4 h-4 text-yellow-405" /> Ignore Unchecked Alias Suggestions
                                     </button>
                                   )}
                                 </>
                               ) : null}
  
                               <button
                                 onClick={() => handlePromoteCandidate(selectedCandidate, promotionType, promotionAliases, selectedConfidence, true)}
                                 disabled={ikmpakActionLoading !== null}
                                 className="w-full px-4 py-2.5 bg-[#40e0d0] hover:bg-[#40e0d0]/90 disabled:bg-[#40e0d0]/20 disabled:text-[#40e0d0]/40 text-black text-xs font-mono font-black uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                 {ikmpakActionLoading === 'applying' ? (
                                   <>
                                     <RefreshCw className="w-4 h-4 animate-spin" /> Applying...
                                   </>
                                 ) : (
                                   <>
                                     <ShieldCheck className="w-4 h-4" /> Apply as Unverified Profile
                                   </>
                                 )}
                               </button>

                               {/* Action Queue Control lookup */}
                               {(() => {
                                 const qStatus = getValidationQueueStatus(selectedCandidate);
                                 if (qStatus === 'validated') {
                                   return (
                                     <button
                                       onClick={() => {
                                         const m = findMatchedProfile(selectedCandidate, profiles);
                                         if (m) {
                                           setSelectedProfile(m);
                                           setViewMode('profiles');
                                         }
                                       }}
                                       className="w-full px-4 py-2.5 bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 text-sky-400 text-xs font-mono font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2"
                                     >
                                       <ShieldCheck className="w-4 h-4 text-sky-400" /> View Profile / .AT5P Validated
                                     </button>
                                   );
                                 }
                                 if (qStatus === 'queued') {
                                   return (
                                     <button
                                       disabled={true}
                                       className="w-full px-4 py-2.5 bg-blue-500/5 border border-blue-500/10 text-blue-400/50 text-xs font-mono font-black uppercase rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                                     >
                                       <Layers className="w-4 h-4" /> Already in .AT5P Queue
                                     </button>
                                   );
                                 }
                                 return (
                                   <button
                                     onClick={() => handleSendToValidationQueue(selectedCandidate)}
                                     disabled={ikmpakActionLoading !== null}
                                     className="w-full px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 disabled:bg-blue-500/5 disabled:border-blue-500/10 disabled:text-blue-500/30 text-blue-400 text-xs font-mono font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2"
                                   >
                                     {ikmpakActionLoading === 'sending_queue' ? (
                                       <>
                                         <RefreshCw className="w-4 h-4 animate-spin" /> Sending to Queue...
                                       </>
                                     ) : (
                                       <>
                                         <Layers className="w-4 h-4" /> Send to .at5p Validation Queue
                                       </>
                                     )}
                                   </button>
                                 );
                               })()}
  
                               <div className="flex items-center gap-2">
                                 <button
                                   onClick={() => handleRejectCandidate(selectedCandidate)}
                                   disabled={ikmpakActionLoading !== null}
                                   className="flex-1 px-3 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 disabled:bg-rose-500/5 disabled:border-rose-500/10 disabled:text-rose-500/30 text-rose-400 text-xs font-mono font-bold uppercase rounded-xl transition-all flex items-center justify-center gap-1.5"
                                 >
                                   {ikmpakActionLoading === 'rejecting' ? (
                                     <>
                                       <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Rejecting...
                                     </>
                                   ) : (
                                     <>
                                       <X className="w-3.5 h-3.5" /> Reject Candidate
                                     </>
                                   )}
                                 </button>
                                 
                                 <button
                                   onClick={() => setSelectedCandidate(null)}
                                   className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-mono font-bold uppercase rounded-xl transition-all"
                                 >
                                   Cancel
                                 </button>
                               </div>
                             </div>
  
                          </div>
                        );
                      })()}

                  </div>
                )}
              </div>
            </div>
          );
        })()}

        </div>
      )}

      {/* 5. EDIT PARAMETER INLINE DIALOG/DRAWER */}
      <AnimatePresence>
        {isEditingParameter && paramForm && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121215] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h4 className="text-lg font-bold font-display uppercase tracking-tight text-white">
                  Parameter Coordination Editor
                </h4>
                <button
                  onClick={() => setIsEditingParameter(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 hover:text-white" />
                </button>
              </div>

              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">Display Parameter Name</label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white"
                      value={paramForm.displayName}
                      onChange={(e) => setParamForm({ ...paramForm, displayName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-gray-500 uppercase">AT5 Target XML Attribute ID</label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white"
                      value={paramForm.export?.name || paramForm.canonicalName}
                      onChange={(e) => setParamForm({
                        ...paramForm,
                        canonicalName: e.target.value,
                        export: { ...paramForm.export, name: e.target.value }
                      })}
                    />
                  </div>
                </div>

                <div className="border border-white/5 p-4 rounded-2xl space-y-3 bg-black/20">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Visualization Interface (Knob View)</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-500">Min</span>
                      <input
                        type="number"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                        value={paramForm.visual.min}
                        onChange={(e) => setParamForm({
                          ...paramForm,
                          visual: { ...paramForm.visual, min: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-500">Max</span>
                      <input
                        type="number"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                        value={paramForm.visual.max}
                        onChange={(e) => setParamForm({
                          ...paramForm,
                          visual: { ...paramForm.visual, max: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-500">Unit (e.g. dB, ms, Hz)</span>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                        value={paramForm.visual.unit}
                        onChange={(e) => setParamForm({
                          ...paramForm,
                          visual: { ...paramForm.visual, unit: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-white/5 p-4 rounded-2xl space-y-3 bg-black/20">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Export Mapping Coordinates</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-500">AmpliTube Float Min</span>
                      <input
                        type="number"
                        step="0.0001"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                        value={paramForm.export.min}
                        onChange={(e) => setParamForm({
                          ...paramForm,
                          export: { ...paramForm.export, min: Number(e.target.value) }
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-500">AmpliTube Float Max</span>
                      <input
                        type="number"
                        step="0.0001"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                        value={paramForm.export.max}
                        onChange={(e) => setParamForm({
                          ...paramForm,
                          export: { ...paramForm.export, max: Number(e.target.value) }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-white/5 p-4 rounded-2xl space-y-3 bg-black/20">
                  <span className="text-[10px] font-mono text-gray-400 uppercase font-bold block">Formula Transformation Mode</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-500">Conversion Mode</span>
                      <select
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                        value={paramForm.conversion.mode}
                        onChange={(e) => setParamForm({
                          ...paramForm,
                          conversion: { ...paramForm.conversion, mode: e.target.value }
                        })}
                      >
                        <option value="direct">direct</option>
                        <option value="dbThresholdToLinear">dbThresholdToLinear</option>
                        <option value="db_to_linear">db_to_linear</option>
                        <option value="linear_to_db">linear_to_db</option>
                        <option value="khzToHzIfNeeded">khzToHzIfNeeded</option>
                        <option value="scaled_range">scaled_range</option>
                        <option value="enum">enum</option>
                        <option value="boolean">boolean</option>
                        <option value="unknown">unknown</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-gray-500">Formula Description</span>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                        value={paramForm.conversion.formula}
                        onChange={(e) => setParamForm({
                          ...paramForm,
                          conversion: { ...paramForm.conversion, formula: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-[10px] font-mono text-gray-500 uppercase">Parameter Validation Status</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white"
                    value={paramForm.validationStatus}
                    onChange={(e) => setParamForm({ ...paramForm, validationStatus: e.target.value as any })}
                  >
                    <option value="PASS">PASS</option>
                    <option value="WARN">WARN</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="CHECK">CHECK</option>
                    <option value="FAIL">FAIL</option>
                  </select>
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsEditingParameter(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-mono uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveParamEdit}
                  className="px-5 py-2 bg-gear-accent hover:bg-gear-accent/80 text-black text-xs font-mono font-bold uppercase rounded-xl transition-all shadow-lg"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REVIEW SUMMARY BEFORE APPLY */}
      <AnimatePresence>
        {reviewingDiscovery && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121215] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-gear-accent" />
                  <h4 className="text-sm font-bold font-display uppercase tracking-tight text-white leading-tight">
                    {reviewingDiscovery.success 
                      ? "Discovery Applied Successfully!" 
                      : reviewingDiscovery.error 
                      ? "Discovery Application Failed" 
                      : "Review summary before applying discovery"}
                  </h4>
                </div>
                <button
                  disabled={isLoading}
                  onClick={() => setReviewingDiscovery(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-5 h-5 text-gray-500 hover:text-white" />
                </button>
              </div>

              {/* SUCCESS VIEW */}
              {reviewingDiscovery.success ? (
                <div className="space-y-5 py-2 font-mono text-xs">
                  <div className="flex flex-col items-center justify-center text-center p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl gap-2.5">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    <h5 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                      {reviewingDiscovery.successMsg || "Updated successfully!"}
                    </h5>
                    <p className="text-[11px] text-gray-400 max-w-md">
                      The active gear profile has been promoted and validated via parsed .at5p preset data.
                    </p>
                  </div>

                  <div className="bg-[#161619] border border-white/5 rounded-2xl p-5 space-y-3">
                    <h6 className="text-[10px] text-gear-accent uppercase font-bold tracking-widest border-b border-white/5 pb-1.5">
                      Applied Configuration Summary
                    </h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300 text-[11px]">
                      <div className="space-y-1.5">
                        <p><span className="text-gray-500 uppercase">Updated profile:</span> <span className="text-white font-bold">{reviewingDiscovery.displayName}</span></p>
                        <p><span className="text-gray-500 uppercase">Confirmed GUID:</span> <span className="text-yellow-500 font-bold">{reviewingDiscovery.confirmedGuid}</span></p>
                        <p><span className="text-gray-500 uppercase">Validation status:</span> <span className="text-emerald-400 font-bold">.AT5P VALIDATED</span></p>
                      </div>
                      <div className="space-y-1.5">
                        <p><span className="text-gray-500 uppercase">Parameters imported:</span> <span className="text-cyan-400 font-bold">{reviewingDiscovery.importedParamsCount}</span></p>
                        <p><span className="text-gray-500 uppercase">Last updated:</span> <span className="text-white">{reviewingDiscovery.lastValidatedAt_time}</span></p>
                        <p><span className="text-gray-500 uppercase">Source Preset:</span> <span className="text-white truncate block max-w-[200px]">{reviewingDiscovery.sourcePresetFilename}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setReviewingDiscovery(null)}
                      className="w-full px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-mono uppercase font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <span>Done / Continue</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* NORMAL & ERROR VIEW */
                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                  {/* Error Notification */}
                  {reviewingDiscovery.error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 font-mono text-[11px] rounded-2xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase block text-red-400 text-xs">Profile Update Failed</span>
                        {reviewingDiscovery.errorMsg}
                      </div>
                    </div>
                  )}

                  {reviewingDiscovery.updatesExisting && (
                    reviewingDiscovery.matchedProfile?.validationStatus === "verified_at5p" ||
                    reviewingDiscovery.matchedProfile?.validation?.status === "PASS"
                  ) && !reviewingDiscovery.error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 font-mono text-[11px] rounded-2xl flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase block text-red-400 text-xs">Replacement Warning</span>
                        This will replace existing verified .at5p data. Continue?
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    {/* Left Column: Discovered Data */}
                    <div className="bg-[#161619] border border-white/5 rounded-2xl p-4 space-y-3">
                      <h5 className="text-[10px] text-gear-accent uppercase font-bold tracking-widest border-b border-white/5 pb-1">Discovered .at5p Data</h5>
                      <div className="space-y-1.5 text-gray-300 text-[11px]">
                        <p><span className="text-gray-500">Discovered Name:</span> <span className="text-white font-bold">{reviewingDiscovery.displayName}</span></p>
                        <p><span className="text-gray-500">Normalized Name:</span> <span className="text-cyan-400 font-bold">{reviewingDiscovery.displayName.toLowerCase().replace(/[^a-z0-9]/g, "").trim()}</span></p>
                        <p><span className="text-gray-500">Gear Type:</span> <span className="text-white capitalize">{reviewingDiscovery.gearType}</span></p>
                        <p><span className="text-gray-500">GUID / realId:</span> <span className="text-[10px] text-yellow-500 font-bold break-all">{reviewingDiscovery.modelGuid}</span></p>
                      </div>

                      {!reviewingDiscovery.isChildValidation ? (() => {
                        const { numeric, references, selectors } = categorizeParams(reviewingDiscovery.parameters);
                        return (
                          <div className="pt-2 space-y-3">
                            <p className="text-[9px] text-gray-500 uppercase font-bold border-b border-white/5 pb-1">Discovered Cab Data</p>
                            
                            {/* Numeric Parameters */}
                            <div>
                              <p className="text-[8.5px] text-yellow-500/80 uppercase font-bold mb-1 font-mono">Numeric Parameters</p>
                              <div className="max-h-[80px] overflow-y-auto space-y-1 bg-black/30 p-1.5 rounded border border-white/5">
                                {numeric.length > 0 ? numeric.map((p: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-[9.5px]">
                                    <span className="text-cyan-400">{p.name}</span>
                                    <span className="text-gray-400 font-mono">val: {p.value} [{p.min ?? 0}..{p.max ?? 10}]</span>
                                  </div>
                                )) : <span className="text-[9px] text-gray-400/60 italic font-mono">None</span>}
                              </div>
                            </div>

                            {/* Gear References */}
                            <div>
                              <p className="text-[8.5px] text-purple-400 uppercase font-bold mb-1 font-mono font-bold">Gear References</p>
                              <div className="max-h-[80px] overflow-y-auto space-y-1 bg-black/30 p-1.5 rounded border border-white/5">
                                {references.length > 0 ? references.map((p: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-[9.5px]">
                                    <span className="text-emerald-400">{p.name}</span>
                                    <span className="text-gray-300 font-mono text-[9px] font-bold select-all">{p.value}</span>
                                  </div>
                                )) : <span className="text-[9px] text-gray-400/60 italic font-mono">None</span>}
                              </div>
                            </div>

                            {/* Selector / Enum Values */}
                            <div>
                              <p className="text-[8.5px] text-cyan-400 uppercase font-bold mb-1 font-mono">Selector / Enum Values</p>
                              <div className="max-h-[80px] overflow-y-auto space-y-1 bg-black/30 p-1.5 rounded border border-white/5">
                                {selectors.length > 0 ? selectors.map((p: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-[9.5px]">
                                    <span className="text-gray-300">{p.name}</span>
                                    <span className="text-amber-400 font-mono">val: {p.value}</span>
                                  </div>
                                )) : <span className="text-[9px] text-gray-400/60 italic font-mono">None</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="pt-2 space-y-1.5 text-[11px] bg-black/20 p-3 rounded-xl border border-white/5">
                          <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Cabinet Containment Source</p>
                          <p><span className="text-gray-500">Parent Cabinet:</span> <span className="text-white font-bold">{reviewingDiscovery.parentCabName}</span></p>
                          <p><span className="text-gray-500">Cabinet GUID:</span> <span className="text-gray-400 font-mono text-[10px]">{reviewingDiscovery.parentCabGuid}</span></p>
                          <p><span className="text-gray-500">Source Fields:</span> <span className="text-cyan-400 font-mono text-[10px]">{reviewingDiscovery.sourceFields.join(", ")}</span></p>
                        </div>
                      )}
                    </div>
 
                     {/* Right Column: Matched Profile Data */}
                     <div className="bg-[#161619] border border-white/5 rounded-2xl p-4 space-y-3">
                       <h5 className="text-[10px] text-gray-400 uppercase font-bold tracking-widest border-b border-white/5 pb-1">Current Gear Profile</h5>
                       {reviewingDiscovery.matchedProfile ? (
                         <div className="space-y-1.5 text-gray-300 text-[11px]">
                           <p><span className="text-gray-500">Matched ID:</span> <span className="text-white break-all">{reviewingDiscovery.matchedProfile.id}</span></p>
                           <p><span className="text-gray-500">Display Name:</span> <span className="text-white font-bold">{reviewingDiscovery.matchedProfile.displayName}</span></p>
                           <p><span className="text-gray-500">Type:</span> <span className="text-white capitalize">{reviewingDiscovery.matchedProfile.type}</span></p>
                           <p><span className="text-gray-500">Status:</span> <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 uppercase text-gray-400">{reviewingDiscovery.matchedProfile.validationStatus || "unverified"}</span></p>
                         </div>
                       ) : (
                         <p className="text-[11px] text-gray-500 italic py-4">
                           {reviewingDiscovery.isChildValidation 
                             ? "No matching child profile exists. This will create a new draft child Profile in Gear Manager catalog."
                             : "No matching profile exists. This will create a brand new draft Profile in Gear Manager catalog."}
                         </p>
                       )}
 
                       {reviewingDiscovery.matchedProfile && !reviewingDiscovery.isChildValidation && (
                         <div className="pt-2">
                           <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">Current Profile Parameters</p>
                           <div className="max-h-[120px] overflow-y-auto space-y-1 bg-black/30 p-2 rounded-lg border border-white/5">
                             {reviewingDiscovery.matchedProfile.parameters.map((p: any, idx: number) => (
                               <div key={idx} className="flex justify-between items-center text-[10px]">
                                 <span className="text-gray-400">{p.displayName}</span>
                                 <span className="text-gray-500">[{p.visual?.min ?? 0} .. {p.visual?.max ?? 10}]</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
 
                   {/* Values that will be changed summary */}
                   <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 space-y-1.5 font-mono text-[11px] text-gray-300">
                     <span className="font-bold text-amber-400 uppercase tracking-wider block text-xs">Values to be updated:</span>
                     <ul className="list-disc pl-4 space-y-1 text-gray-300">
                       {reviewingDiscovery.isChildValidation ? (
                         (() => {
                           const isRoom = reviewingDiscovery.childType === 'room';
                           const isRoomMic = reviewingDiscovery.childType === 'room_mic' || reviewingDiscovery.childType === 'roomMic';
                           if (isRoom) {
                             return (
                               <>
                                 <li>Type: <span className="text-white font-bold">Room</span></li>
                                 <li>Source Field: <span className="text-cyan-400 font-bold">RoomType</span></li>
                                 <li>Source Value: <span className="text-yellow-400 font-bold">{reviewingDiscovery.modelGuid}</span></li>
                                 <li>Identity Method: <span className="text-emerald-400 font-bold">RoomType string</span></li>
                                 <li>GUID: <span className="text-gray-400 font-bold">Not applicable</span></li>
                                 <li>Validation Method: <span className="text-yellow-400 font-bold">Cab Container Discovery</span></li>
                               </>
                             );
                           } else if (isRoomMic) {
                             return (
                               <>
                                 <li>Type: <span className="text-white font-bold">Room Mic</span></li>
                                 <li>Source Field: <span className="text-cyan-400 font-bold">RoomMicType</span></li>
                                 <li>Source Value: <span className="text-yellow-400 font-bold">{reviewingDiscovery.modelGuid}</span></li>
                                 <li>Identity Method: <span className="text-emerald-400 font-bold">RoomMicType string</span></li>
                                 <li>GUID: <span className="text-gray-400 font-bold">Not applicable, unless one is available from IKMPAK/profile data</span></li>
                                 <li>Validation Method: <span className="text-yellow-400 font-bold">Cab Container Discovery</span></li>
                               </>
                             );
                           } else {
                             return reviewingDiscovery.matchedProfile ? (
                               <>
                                 <li>GUID/realId will be confirmed as <span className="text-cyan-400 font-bold break-all">{reviewingDiscovery.modelGuid}</span></li>
                                 <li>Validation status promoted from <span className="text-gray-400">"{reviewingDiscovery.matchedProfile.validationStatus || 'unverified'}"</span> to <span className="text-emerald-400 font-bold">"at5p_validated"</span> (PASS)</li>
                                 <li>Provenance metadata linked: validation method to <span className="text-yellow-400 font-bold">"Cab Container Discovery"</span>, parent cabinet set to <span className="text-white font-bold">{reviewingDiscovery.parentCabName}</span></li>
                               </>
                             ) : (
                               <>
                                 <li>New draft child profile will be initialized with ID: <span className="text-cyan-400 font-mono text-[10px]">"gear-{reviewingDiscovery.modelGuid.toLowerCase().replace(/[^a-z0-9]/g, "")}"</span></li>
                                 <li>GUID/realId set to <span className="text-yellow-400 font-semibold break-all">{reviewingDiscovery.modelGuid}</span></li>
                                 <li>Awaiting identity resolution (no PASS until identity is resolved)</li>
                                 <li>Provenance metadata linked: discovered from Cabinet <span className="text-white font-bold">{reviewingDiscovery.parentCabName}</span></li>
                               </>
                             );
                           }
                         })()
                       ) : (
                         reviewingDiscovery.matchedProfile ? (
                           <>
                             <li>GUID/realId will be set to <span className="text-cyan-400 font-bold break-all">{reviewingDiscovery.modelGuid}</span></li>
                             <li>Validation status promoted from <span className="text-gray-400">"{reviewingDiscovery.matchedProfile.validationStatus || 'unverified'}"</span> to <span className="text-emerald-400 font-bold">"verified_at5p"</span></li>
                             <li>Parameters will merge all newly discovered knobs ({reviewingDiscovery.parameters.length} discovered)</li>
                           </>
                         ) : (
                           <>
                             <li>New physical gear profile will be initialized with ID <span className="text-cyan-400 font-bold">"amp_darrell_100"</span></li>
                             <li>GUID/realId set to <span className="text-cyan-400 font-bold break-all">{reviewingDiscovery.modelGuid}</span></li>
                             <li>All parameters auto-initialized from .at5p parsed preset</li>
                           </>
                         )
                       )}
                     </ul>
                   </div>
 
                   <div className="flex gap-3 pt-4 border-t border-white/5">
                     <button
                       type="button"
                       disabled={isLoading}
                       onClick={() => setReviewingDiscovery(null)}
                       className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-mono uppercase font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       Cancel
                     </button>
                     <button
                       type="button"
                       disabled={isLoading}
                       onClick={() => reviewingDiscovery.isChildValidation ? handleApplyChildValidationConfirmed(reviewingDiscovery) : handleApplyDiscoveredConfirmed(reviewingDiscovery)}
                       className="flex-1 px-5 py-2.5 bg-gear-accent hover:bg-gear-accent/80 text-black text-xs font-mono uppercase font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Applying...
                        </>
                      ) : (
                        <>Confirm &amp; Update</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
