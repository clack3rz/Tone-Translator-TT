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
  UploadCloud
} from 'lucide-react';
import { GearProfile, GearProfileParameter, AT5CatalogItem, ParameterMapping } from '../types';
import { gearProfileService } from '../services/gearProfileService';
import { parseAt5pPreset } from '../services/at5PresetImporter';
import { at5DatabaseService } from '../services/at5DatabaseService';
import { refreshDbParameterMappings } from '../services/at5ParameterManifest';
import { auth, signInWithGoogle } from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

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

  // Active view tab: 'profiles' | 'discovery' | 'gaps'
  const [viewMode, setViewMode] = useState<'profiles' | 'discovery' | 'gaps'>('profiles');

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tabPresetFile, setTabPresetFile] = useState<File | null>(null);
  const [tabPresetImportResult, setTabPresetImportResult] = useState<any | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareSuccessMessage, setCompareSuccessMessage] = useState<string | null>(null);
  const [customMicPlacementFriendlySetting, setCustomMicPlacementFriendlySetting] = useState<"Mic_1_Placement" | "Mic_2_Placement">("Mic_1_Placement");
  const [customMicPlacementFriendlyValue, setCustomMicPlacementFriendlyValue] = useState("");
  const [customMicPlacementFriendlyPlacement, setCustomMicPlacementFriendlyPlacement] = useState("");
  const [customMicPlacementFriendlyDistance, setCustomMicPlacementFriendlyDistance] = useState("");


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

  useEffect(() => {
    loadProfiles();
  }, []);

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
      alert(`Save failed: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
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
        // Match by GUID first
        const nGuid = dg.modelGuid ? dg.modelGuid.toLowerCase().replace(/-/g, '').trim() : '';
        let matched = profiles.find(p => p.guid && p.guid.toLowerCase().replace(/-/g, '').trim() === nGuid);

        // Match by alias/name second
        if (!matched && dg.displayName) {
          const lName = dg.displayName.toLowerCase().trim();
          matched = profiles.find(p => 
            p.displayName.toLowerCase().trim() === lName ||
            p.aliases.some(a => a.toLowerCase().trim() === lName)
          );
        }

        return {
          ...dg,
          matchedProfile: matched || null,
          updatesExisting: !!matched,
          statusLabel: matched ? `Updates existing profile (${matched.displayName})` : 'Creates new draft Profile'
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

  const handleApplyDiscovered = async (dg: any) => {
    setIsLoading(true);
    try {
      if (dg.updatesExisting && dg.matchedProfile) {
        // Construct merged alias lists
        const combinedAliases = Array.from(new Set([
          ...(dg.matchedProfile.aliases || []),
          dg.displayName,
          ...(dg.existingAliases || [])
        ]));

        // Construct parameters check
        const parametersUpdate = [...dg.matchedProfile.parameters];
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
          }
        }

        const mergedProfile: GearProfile = {
          ...dg.matchedProfile,
          aliases: combinedAliases,
          guid: dg.modelGuid || dg.matchedProfile.guid,
          parameters: parametersUpdate
        };

        await gearProfileService.saveGearProfile(mergedProfile);
        setImportFeedback(`Applied discovered parameters to ${dg.matchedProfile.displayName}!`);
      } else {
        // Save as entirely new Draft
        const newDraftCatalog: AT5CatalogItem = {
          guid: dg.modelGuid || '',
          displayName: dg.displayName,
          group: dg.gearType || 'stomp',
          slot: dg.slotType || 'Slot',
          otherNames: dg.existingAliases || [],
          knobs: dg.parameters.map((p: any) => ({
            name: p.name,
            type: 'range',
            min: p.min,
            max: p.max,
            default: String(p.value || '')
          }))
        };
        await at5DatabaseService.saveGearItem(newDraftCatalog);
        setImportFeedback(`Saved ${dg.displayName} as a new Draft Gear in Catalogue!`);
      }

      // Remove from queue
      setDiscoveredGears(prev => prev.filter(g => g.modelGuid !== dg.modelGuid || g.displayName !== dg.displayName));
      await loadProfiles();
    } catch (err: any) {
      console.error(err);
      alert(`Failed to save: ${err.message || err}`);
    } finally {
      setIsLoading(false);
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
      alert(`Failed to save protocol: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'WARN': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
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
                    { k: 'validation', l: 'Validation' },
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
                                  {activeInstance.parameter_details.map((detail: any, idx: number) => (
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
                                            : detail.mapping_status === "DROPPED"
                                            ? "bg-amber-500/10 text-amber-400"
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
                                  ))}
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
                                      <span className="text-amber-500 font-mono text-[9px] uppercase font-bold tracking-widest">Mic Placement Mapping Discoverer & Creator</span>
                                      <h4 className="text-sm font-bold text-white font-display">Create Custom Mic Placement Mapping from Preset</h4>
                                      <p className="text-[11px] text-gray-400 leading-relaxed">
                                        Found active coordinate mappings inside this cabinet preset! Save these coordinates to your persistent <span className="text-cyan-400 font-mono">mic_placement_mappings</span> catalog collection with friendly tags.
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-1.5">
                                        <label className="text-[9.5px] font-mono text-gray-500 uppercase tracking-wider block">Target Mapping Slot</label>
                                        <select
                                          value={customMicPlacementFriendlySetting}
                                          onChange={(e: any) => setCustomMicPlacementFriendlySetting(e.target.value)}
                                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                                        >
                                          <option value="Mic_1_Placement">Mic 1 Placement (Maps Mic0XAxis, Mic0YAxis, Mic0Distance, Mic0Speaker, Mic0Angle)</option>
                                          <option value="Mic_2_Placement">Mic 2 Placement (Maps Mic1XAxis, Mic1YAxis, Mic1Distance, Mic1Speaker, Mic1Angle)</option>
                                        </select>
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[9.5px] font-mono text-gray-500 uppercase tracking-wider block">Friendly Placement Code/Name</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. Cap Edge, Cone Centre, Till-axis"
                                          value={customMicPlacementFriendlyValue}
                                          onChange={(e) => setCustomMicPlacementFriendlyValue(e.target.value)}
                                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[9.5px] font-mono text-gray-500 uppercase tracking-wider block">Friendly Placement Tag (Placement)</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. Cap-Edge, Cone-Edge, Center"
                                          value={customMicPlacementFriendlyPlacement}
                                          onChange={(e) => setCustomMicPlacementFriendlyPlacement(e.target.value)}
                                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[9.5px] font-mono text-gray-500 uppercase tracking-wider block">Friendly Distance Tag (Distance)</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. Close, Medium, Far"
                                          value={customMicPlacementFriendlyDistance}
                                          onChange={(e) => setCustomMicPlacementFriendlyDistance(e.target.value)}
                                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                                        />
                                      </div>
                                    </div>

                                    {/* Coords visual view list */}
                                    <div className="bg-black/30 p-4 border border-white/5 rounded-xl space-y-2">
                                      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Discovered Preset Coords:</span>
                                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        {(() => {
                                          const prefix = customMicPlacementFriendlySetting === "Mic_1_Placement" ? "Mic0" : "Mic1";
                                          const fields = [
                                            `${prefix}Angle`,
                                            `${prefix}XAxis`,
                                            `${prefix}YAxis`,
                                            `${prefix}Distance`,
                                            `${prefix}Speaker`
                                          ];
                                          
                                          const presetParamsMapCopy = new Map<string, string | number>();
                                          presetMatchingGear.parameters.forEach((p: any) => {
                                            presetParamsMapCopy.set(p.name, p.value);
                                          });

                                          return fields.map(f => {
                                            const val = presetParamsMapCopy.get(f) ?? "0";
                                            return (
                                              <div key={f} className="text-center bg-white/5 p-2 rounded-lg border border-white/5">
                                                <span className="text-[9px] font-mono text-gray-500 block">{f.replace(prefix, '')}</span>
                                                <span className="text-xs font-mono font-bold text-cyan-400 mt-0.5 block">{String(val)}</span>
                                              </div>
                                            );
                                          });
                                        })()}
                                      </div>
                                    </div>

                                    <div className="flex justify-end">
                                      <button
                                        onClick={async () => {
                                          if (!customMicPlacementFriendlyValue.trim()) {
                                            setCompareError("Please enter a friendly coordinate name (e.g. Cap Edge) to save your mapping.");
                                            return;
                                          }
                                          setCompareLoading(true);
                                          setCompareError(null);
                                          setCompareSuccessMessage(null);

                                          try {
                                            const prefix = customMicPlacementFriendlySetting === "Mic_1_Placement" ? "Mic0" : "Mic1";
                                            const fields = [
                                              `${prefix}Angle`,
                                              `${prefix}XAxis`,
                                              `${prefix}YAxis`,
                                              `${prefix}Distance`,
                                              `${prefix}Speaker`
                                            ];

                                            const presetParamsMapCopy = new Map<string, string | number>();
                                            presetMatchingGear.parameters.forEach((p: any) => {
                                              presetParamsMapCopy.set(p.name, p.value);
                                            });

                                            const xmlValuesToSave: any = {};
                                            fields.forEach(f => {
                                              xmlValuesToSave[f] = presetParamsMapCopy.get(f) ?? "0";
                                            });

                                            await at5DatabaseService.saveMicPlacementMapping({
                                              gear: editedProfile.displayName,
                                              friendly_setting: customMicPlacementFriendlySetting,
                                              friendly_value: customMicPlacementFriendlyValue.trim(),
                                              friendly_placement: customMicPlacementFriendlyPlacement.trim() || undefined,
                                              friendly_distance: customMicPlacementFriendlyDistance.trim() || undefined,
                                              maps_to: xmlValuesToSave,
                                              status: "validated"
                                            });

                                            await refreshDbParameterMappings();
                                            
                                            if (onRefreshChain) onRefreshChain();

                                            setCompareSuccessMessage(`Successfully registered mic placement mapping for cabinet "${editedProfile.displayName}"! Placements profiles updated.`);
                                            setCustomMicPlacementFriendlyValue("");
                                            setCustomMicPlacementFriendlyPlacement("");
                                            setCustomMicPlacementFriendlyDistance("");
                                          } catch (err: any) {
                                            setCompareError(`Failed to save mapping: ${err.message}`);
                                          } finally {
                                            setCompareLoading(false);
                                          }
                                        }}
                                        disabled={compareLoading}
                                        className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-black text-[10.5px] font-mono font-bold uppercase rounded-lg transition-all shadow"
                                      >
                                        Save Mic Placement Mapping
                                      </button>
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
              {discoveredGears.length === 0 && discoveredProtocols.length === 0 ? (
                <p className="text-xs text-gray-500 font-mono uppercase text-center py-6">All detected gear is already fully updated</p>
              ) : (
                <div className="space-y-6">
                  
                  {discoveredGears.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-mono text-gray-400 uppercase tracking-widest">Discovered Active Gear</h4>
                      <div className="space-y-3">
                        {discoveredGears.map((dg, idx) => (
                          <div
                            key={idx}
                            className="bg-[#18181c] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-white">{dg.displayName}</span>
                                <span className={`text-[8px] font-mono px-2 py-0.5 rounded border border-cyan-500/10 text-cyan-400 capitalize`}>
                                  {dg.gearType}
                                </span>
                                <span className="text-[10px] font-mono text-gray-500 truncate max-w-[120px]">{dg.modelGuid}</span>
                              </div>
                              <p className="text-[10.5px] font-mono text-yellow-500 mt-1 uppercase">
                                Match Result: {dg.statusLabel}
                              </p>
                              
                              <div className="flex flex-wrap gap-2 mt-2">
                                {dg.parameters.map((p: any, pIdx: number) => (
                                  <span key={pIdx} className="text-[8.5px] font-mono bg-white/[0.03] border border-white/5 text-gray-400 px-2 py-0.5 rounded">
                                    {p.name} [{p.value}]
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleApplyDiscovered(dg)}
                                className="px-3 py-1.5 bg-gear-accent hover:bg-gear-accent/80 text-black text-[10px] font-mono font-bold uppercase rounded-xl transition-all shadow-md"
                              >
                                {dg.updatesExisting ? 'Apply Overrides' : 'Save as Draft'}
                              </button>
                            </div>
                          </div>
                        ))}
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

    </div>
  );
};
