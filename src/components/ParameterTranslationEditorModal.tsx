import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Layers,
  FileCode,
  Tags,
  Check,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  FileText,
  Copy,
  Sliders,
  Eye,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { GearProfile, GearProfileParameter, ParameterOptionRow } from '../types';
import { TestTranslationResult } from '../services/at5ParameterManifest';

interface ParameterTranslationEditorModalProps {
  isOpen: boolean;
  paramForm: GearProfileParameter | null;
  setParamForm: React.Dispatch<React.SetStateAction<GearProfileParameter | null>>;
  editingParamIndex: number | null;
  editedProfile: GearProfile | null;
  onClose: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  saveError: string | null;

  // Options and JSON map states
  optionRows: ParameterOptionRow[];
  setOptionRows: React.Dispatch<React.SetStateAction<ParameterOptionRow[]>>;
  valueMapText: string;
  setValueMapText: (val: string) => void;
  reverseValueMapText: string;
  setReverseValueMapText: (val: string) => void;
  valueMapError: string | null;
  setValueMapError: (val: string | null) => void;
  reverseValueMapError: string | null;
  setReverseValueMapError: (val: string | null) => void;
  lockFormulaDesc: boolean;
  setLockFormulaDesc: (val: boolean) => void;

  // Aliases states & helpers
  showBulkParamAliasTextarea: boolean;
  setShowBulkParamAliasTextarea: (val: boolean) => void;
  bulkParamAliasText: string;
  setBulkParamAliasText: (val: string) => void;
  newParamAliasInput: string;
  setNewParamAliasInput: (val: string) => void;
  editingAliasIdx: number | null;
  setEditingAliasIdx: (val: number | null) => void;
  editingAliasVal: string;
  setEditingAliasVal: (val: string) => void;
  aliasGroupTab: 'all' | 'saved' | 'raw_map' | 'auto_gen';
  setAliasGroupTab: (val: 'all' | 'saved' | 'raw_map' | 'auto_gen') => void;
  paramAliasError: string | null;
  setParamAliasError: (val: string | null) => void;

  // Testing & preview
  testInputValue: string;
  setTestInputValue: (val: string) => void;
  testTranslationResult: TestTranslationResult | null;

  // Handlers
  handleAddOptionRow: () => void;
  handleUpdateOptionRow: (index: number, key: keyof ParameterOptionRow, value: any) => void;
  handleSetDefaultRow: (index: number, checked: boolean) => void;
  handleRemoveOptionRow: (index: number) => void;
  handleSyncFromRawJSON: () => void;
  handleAddParamSavedAlias: (alias: string) => void;
  handleUpdateParamSavedAlias: (index: number, val: string) => void;
  handleRemoveParamSavedAlias: (index: number) => void;
  handleApplyBulkParamAliases: () => void;
  handleDeduplicateParamAliases: () => void;
  handleNormalizeParamAliases: () => void;
  checkParamAliasCollisions: (param: GearProfileParameter, profile: GearProfile | null, idx: number | null) => { alias: string; otherParamName: string }[];
  getParamSavedAliases: (param: GearProfileParameter) => string[];
  generateAliasesForXmlParam: (paramName: string) => string[];
}

export const ParameterTranslationEditorModal: React.FC<ParameterTranslationEditorModalProps> = ({
  isOpen,
  paramForm,
  setParamForm,
  editingParamIndex,
  editedProfile,
  onClose,
  onSave,
  isSaving,
  saveError,
  optionRows,
  valueMapText,
  setValueMapText,
  reverseValueMapText,
  setReverseValueMapText,
  valueMapError,
  setValueMapError,
  reverseValueMapError,
  setReverseValueMapError,
  lockFormulaDesc,
  setLockFormulaDesc,
  showBulkParamAliasTextarea,
  setShowBulkParamAliasTextarea,
  bulkParamAliasText,
  setBulkParamAliasText,
  newParamAliasInput,
  setNewParamAliasInput,
  editingAliasIdx,
  setEditingAliasIdx,
  editingAliasVal,
  setEditingAliasVal,
  aliasGroupTab,
  setAliasGroupTab,
  paramAliasError,
  setParamAliasError,
  testInputValue,
  setTestInputValue,
  testTranslationResult,
  handleAddOptionRow,
  handleUpdateOptionRow,
  handleSetDefaultRow,
  handleRemoveOptionRow,
  handleSyncFromRawJSON,
  handleAddParamSavedAlias,
  handleUpdateParamSavedAlias,
  handleRemoveParamSavedAlias,
  handleApplyBulkParamAliases,
  handleDeduplicateParamAliases,
  handleNormalizeParamAliases,
  checkParamAliasCollisions,
  getParamSavedAliases,
  generateAliasesForXmlParam
}) => {
  const [copiedTestXml, setCopiedTestXml] = useState(false);

  if (!isOpen || !paramForm) return null;

  const displayPrecision = paramForm.displayPrecision ?? paramForm.displayDecimalPlaces ?? paramForm.decimalPlaces ?? 2;
  const exportPrecision = paramForm.exportPrecision ?? paramForm.exportDecimalPlaces ?? (paramForm.conversion?.mode?.includes('linear') ? 6 : 5);

  const visualMin = paramForm.visual?.min ?? 0;
  const visualMax = paramForm.visual?.max ?? 10;
  const visualUnit = paramForm.visual?.unit || '';

  const displayMin = paramForm.displayMin ?? visualMin;
  const displayMax = paramForm.displayMax ?? visualMax;
  const displayUnit = paramForm.displayUnit || visualUnit;

  const exportMin = paramForm.export?.min ?? 0;
  const exportMax = paramForm.export?.max ?? 1;
  const exportName = paramForm.export?.name || paramForm.canonicalName || paramForm.displayName || '';

  const savedAliases = getParamSavedAliases(paramForm);
  const rawMapAliases = paramForm.rawMappingAliases || [];
  const autoGenAliases = paramForm.autoGeneratedAliases && paramForm.autoGeneratedAliases.length > 0
    ? paramForm.autoGeneratedAliases
    : generateAliasesForXmlParam(exportName);
  const effectiveAliases = Array.from(new Set([
    ...savedAliases,
    ...rawMapAliases,
    ...autoGenAliases,
    paramForm.displayName,
    paramForm.canonicalName,
    exportName
  ].filter(Boolean)));

  const collisions = checkParamAliasCollisions(paramForm, editedProfile, editingParamIndex);
  const genericAliases = savedAliases.filter(a =>
    ['volume', 'master', 'gain', 'drive', 'tone', 'presence', 'bass', 'mid', 'middle', 'treble', 'level'].includes(a.toLowerCase().trim())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="bg-[#0b0b0d] border border-white/10 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6 my-8"
        >
          {/* MODAL HEADER */}
          <div className="flex justify-between items-start border-b border-white/5 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-gear-accent rounded-full animate-pulse" />
                <h3 className="text-lg font-bold font-display uppercase tracking-wider text-white">
                  AT5 Parameter Translation Editor
                </h3>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Calibrate parameter mapping across AT5 GUI Visual, TT Display, Translation Formulas, and AT5 XML Export.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* DOMAIN WORKFLOW ROADMAP BANNER */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-black/40 p-3 rounded-2xl border border-white/5 text-[11px] font-mono">
            <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/5">
              <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[9px] text-gray-500 uppercase block">1. AT5 GUI</span>
                <span className="text-cyan-300 font-bold">Visual Presentation</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/5">
              <Sliders className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div>
                <span className="text-[9px] text-gray-500 uppercase block">2. TT Display</span>
                <span className="text-blue-300 font-bold">User-Facing Range</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/5">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[9px] text-gray-500 uppercase block">3. Conversion</span>
                <span className="text-amber-300 font-bold">Transform Formula</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-[9px] text-gray-500 uppercase block">4. AT5 XML</span>
                <span className="text-emerald-300 font-bold">Serialized Float</span>
              </div>
            </div>
          </div>

          {/* SCROLLABLE MAIN EDITOR BODY */}
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">

            {/* SECTION 1: PARAMETER IDENTITY */}
            <div className="border border-white/5 p-5 rounded-2xl bg-white/[0.01] space-y-4">
              <div className="border-b border-white/5 pb-2">
                <span className="text-[11px] font-mono text-gear-accent uppercase font-bold tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gear-accent" />
                  1. Parameter Identity
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Core identity keys and GUI interface component classification.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase">Display Parameter Name</label>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.displayName !== undefined ? paramForm.displayName : (paramForm.displayParameterName ?? '')}
                    onChange={(e) => setParamForm({
                      ...paramForm,
                      displayName: e.target.value,
                      displayParameterName: e.target.value
                    })}
                    placeholder="e.g. Drive, Bass, Mid, Master"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase">Canonical Parameter Name</label>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.canonicalParameterName !== undefined ? paramForm.canonicalParameterName : (paramForm.canonicalName ?? '')}
                    onChange={(e) => setParamForm({
                      ...paramForm,
                      canonicalParameterName: e.target.value,
                      canonicalName: e.target.value
                    })}
                    placeholder="e.g. drive, bass, mid, master"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase">Interface Component</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.interfaceType || 'knob'}
                    onChange={(e) => setParamForm({ ...paramForm, interfaceType: e.target.value as any })}
                  >
                    <option value="knob">Continuous Rotary Knob</option>
                    <option value="slider">Linear Slider Control</option>
                    <option value="switch">Binary Switch / Toggle</option>
                    <option value="selector">Rotary Selector</option>
                    <option value="enum">Dropdown List (Enum)</option>
                    <option value="text">Value Entry Textbox</option>
                    <option value="reference">Cross-Referenced Preset</option>
                    <option value="hidden_default">Hidden / Background Default</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase">Parameter Kind</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.parameterKind || 'continuous'}
                    onChange={(e) => setParamForm({ ...paramForm, parameterKind: e.target.value as any })}
                  >
                    <option value="continuous">Continuous Numeric</option>
                    <option value="boolean">Boolean Switch (0/1)</option>
                    <option value="selector">Discrete Selector</option>
                    <option value="enum">Discrete Named List (Enum)</option>
                    <option value="time">Time Parameter (ms, s)</option>
                    <option value="frequency">Frequency Band (Hz, kHz)</option>
                    <option value="gain_db">Gain / Volume Level (dB)</option>
                    <option value="percentage">Percentage (0–100%)</option>
                    <option value="xml_reference">XML Key / Guid Reference</option>
                    <option value="unsupported">Unsupported Parameter</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: VISUAL / DISPLAY CONFIGURATION */}
            <div className="border border-white/5 p-5 rounded-2xl bg-white/[0.01] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                <div>
                  <span className="text-[11px] font-mono text-gear-accent uppercase font-bold tracking-wider flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    2. Visual / Display Configuration
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    AmpliTube 5 GUI presentation values and ToneTwist user-facing display ranges.
                  </p>
                </div>

                {/* Rendered Visual Range Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-[10px] font-mono text-cyan-300">
                    Rendered AT5 GUI: <span className="font-bold text-white">{visualMin.toFixed(displayPrecision)} – {visualMax.toFixed(displayPrecision)} {visualUnit}</span>
                  </div>
                  <div className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-mono text-blue-300">
                    Rendered TT Display: <span className="font-bold text-white">{displayMin.toFixed(displayPrecision)} – {displayMax.toFixed(displayPrecision)} {displayUnit}</span>
                  </div>
                </div>
              </div>

              {/* AT5 Visual GUI Range */}
              <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-3">
                <span className="text-[9.5px] font-mono text-cyan-400 uppercase font-bold tracking-wider block">AmpliTube 5 GUI Visual Boundaries</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 uppercase">AT5 Visual Min</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                      value={paramForm.visual?.min !== undefined ? paramForm.visual.min : 0}
                      onChange={(e) => setParamForm({
                        ...paramForm,
                        visual: { ...paramForm.visual, min: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 uppercase">AT5 Visual Max</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                      value={paramForm.visual?.max !== undefined ? paramForm.visual.max : 10}
                      onChange={(e) => setParamForm({
                        ...paramForm,
                        visual: { ...paramForm.visual, max: parseFloat(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 uppercase">AT5 Visual Unit</label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                      value={paramForm.visual?.unit || ''}
                      onChange={(e) => setParamForm({
                        ...paramForm,
                        visual: { ...paramForm.visual, unit: e.target.value }
                      })}
                      placeholder="e.g. dB, Hz, ms, %"
                    />
                  </div>
                </div>
              </div>

              {/* ToneTwist Display Range & Precision */}
              <div className="bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-3">
                <span className="text-[9.5px] font-mono text-blue-400 uppercase font-bold tracking-wider block">ToneTwist Display Range &amp; Precision</span>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 uppercase">TT Display Min</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                      value={paramForm.displayMin !== undefined ? paramForm.displayMin : ''}
                      onChange={(e) => setParamForm({ ...paramForm, displayMin: e.target.value !== '' ? parseFloat(e.target.value) : undefined })}
                      placeholder="e.g. 0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 uppercase">TT Display Max</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                      value={paramForm.displayMax !== undefined ? paramForm.displayMax : ''}
                      onChange={(e) => setParamForm({ ...paramForm, displayMax: e.target.value !== '' ? parseFloat(e.target.value) : undefined })}
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 uppercase">TT Display Unit</label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                      value={paramForm.displayUnit || ''}
                      onChange={(e) => setParamForm({ ...paramForm, displayUnit: e.target.value })}
                      placeholder="e.g. dB, ms"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 uppercase">Display Decimal Precision</label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                      value={paramForm.displayPrecision !== undefined ? paramForm.displayPrecision : ''}
                      onChange={(e) => {
                        const val = e.target.value !== '' ? parseInt(e.target.value, 10) : undefined;
                        setParamForm({
                          ...paramForm,
                          displayPrecision: val,
                          displayDecimalPlaces: val,
                          decimalPlaces: val
                        });
                      }}
                      placeholder="e.g. 2 (for 3.28)"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono text-gray-400 uppercase">Default Display Value</label>
                    <input
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                      value={paramForm.defaultDisplayValue !== undefined ? paramForm.defaultDisplayValue : ''}
                      onChange={(e) => setParamForm({ ...paramForm, defaultDisplayValue: e.target.value })}
                      placeholder="e.g. 5.0, Off"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[9.5px] font-mono text-gray-400">
                Notice: Display Decimal Precision is formatting metadata for the UI and reverse translation. Underlying numeric values are stored faithfully without artificial offsets.
              </p>
            </div>

            {/* SECTION 3: AT5 EXPORT CONFIGURATION */}
            <div className="border border-white/5 p-5 rounded-2xl bg-white/[0.01] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                <div>
                  <span className="text-[11px] font-mono text-gear-accent uppercase font-bold tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    3. AT5 Export Configuration
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Target AmpliTube 5 XML attribute ID, raw float boundaries, and serialization precision.
                  </p>
                </div>

                {/* Rendered Export Range Badge */}
                <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-mono text-emerald-300">
                  Rendered Export Bounds: <span className="font-bold text-white">{exportMin.toFixed(exportPrecision)} – {exportMax.toFixed(exportPrecision)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[9px] font-mono text-gray-400 uppercase">Target AT5 XML Attribute ID</label>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.export?.name || paramForm.at5XmlAttributeName || ''}
                    onChange={(e) => setParamForm({
                      ...paramForm,
                      at5XmlAttributeName: e.target.value,
                      export: { ...paramForm.export, name: e.target.value }
                    })}
                    placeholder="e.g. Drive, Bass, Mid, Threshold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-gray-400 uppercase">AmpliTube Float Min</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.export?.min !== undefined ? paramForm.export.min : 0}
                    onChange={(e) => setParamForm({
                      ...paramForm,
                      export: { ...paramForm.export, min: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-gray-400 uppercase">AmpliTube Float Max</label>
                  <input
                    type="number"
                    step="any"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.export?.max !== undefined ? paramForm.export.max : 1}
                    onChange={(e) => setParamForm({
                      ...paramForm,
                      export: { ...paramForm.export, max: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-gray-400 uppercase">Export Decimal Precision</label>
                  <input
                    type="number"
                    min="0"
                    max="8"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.exportPrecision !== undefined ? paramForm.exportPrecision : ''}
                    onChange={(e) => {
                      const val = e.target.value !== '' ? parseInt(e.target.value, 10) : undefined;
                      setParamForm({
                        ...paramForm,
                        exportPrecision: val,
                        exportDecimalPlaces: val
                      });
                    }}
                    placeholder="e.g. 5 (for 3.28171)"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-gray-400 uppercase">Default Export Value</label>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.defaultExportValue !== undefined ? paramForm.defaultExportValue : ''}
                    onChange={(e) => setParamForm({ ...paramForm, defaultExportValue: e.target.value })}
                    placeholder="e.g. 0.5, 1.0"
                  />
                </div>
              </div>

              <p className="text-[9.5px] font-mono text-gray-400">
                Notice: Export Decimal Precision determines the exact number of decimal places serialized into AmpliTube 5 preset XML attributes (e.g. 5 decimals produces 3.28171).
              </p>
            </div>

            {/* SECTION 4: CONVERSION / TRANSLATION */}
            <div className="border border-white/5 p-5 rounded-2xl bg-white/[0.01] space-y-4">
              <div className="border-b border-white/5 pb-2">
                <span className="text-[11px] font-mono text-gear-accent uppercase font-bold tracking-wider flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  4. Conversion / Translation
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Transformation rules converting user display values into raw AT5 XML floats and rotary enum options.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-gray-400 uppercase">Formula Conversion Mode</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.conversion?.mode || 'direct'}
                    onChange={(e) => {
                      const newMode = e.target.value;
                      let updatedFormula = paramForm.conversion?.formula || '';

                      if (!lockFormulaDesc) {
                        if (newMode === 'direct') updatedFormula = 'y = x';
                        else if (newMode === 'dbThresholdToLinear') updatedFormula = 'db = min(0, max(-100, x)); y = 10^(db/20)';
                        else if (newMode === 'db_to_linear') updatedFormula = 'y = 10^(x / 20)';
                        else if (newMode === 'linear_to_db') updatedFormula = 'y = 20 * log10(x)';
                        else if (newMode === 'scaled_range') updatedFormula = 'y = min + ((x - vMin) / (vMax - vMin)) * (max - min)';
                        else if (newMode === 'khzToHzIfNeeded') updatedFormula = "if (text contains 'khz') y = x * 1000";
                        else if (newMode === 'enum') updatedFormula = 'Mapped from option list';
                        else if (newMode === 'boolean') updatedFormula = '0.0 if off/0/false, 1.0 if on/1/true';
                      }

                      setParamForm({
                        ...paramForm,
                        conversion: {
                          ...paramForm.conversion,
                          mode: newMode,
                          formula: updatedFormula
                        }
                      });
                    }}
                  >
                    <option value="direct">direct (Linearly Mapped 1:1 or Direct Float)</option>
                    <option value="dbThresholdToLinear">dbThresholdToLinear (Dynamic Thresholds -100 to 0 dB)</option>
                    <option value="db_to_linear">db_to_linear (Decibels to Linear Voltage Float)</option>
                    <option value="linear_to_db">linear_to_db (Float to Decibels)</option>
                    <option value="khzToHzIfNeeded">khzToHzIfNeeded (Dynamic Frequency Units)</option>
                    <option value="scaled_range">scaled_range (Custom Ranges Normalization)</option>
                    <option value="enum">enum (Indexed Dropdowns / Rotary Selectors)</option>
                    <option value="boolean">boolean (0.0 / 1.0 Binary Flags)</option>
                    <option value="unknown">unknown</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono text-gray-400 uppercase">Formula Description / Coefficients</label>
                    <label className="flex items-center gap-1.5 text-[9px] font-mono text-gray-400 hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-3 h-3 rounded border-white/10 bg-white/5 text-gear-accent focus:ring-0 cursor-pointer"
                        checked={lockFormulaDesc}
                        onChange={(e) => setLockFormulaDesc(e.target.checked)}
                      />
                      Lock custom description
                    </label>
                  </div>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={paramForm.conversion?.formula || ''}
                    onChange={(e) => setParamForm({
                      ...paramForm,
                      conversion: { ...paramForm.conversion, formula: e.target.value }
                    })}
                    placeholder="e.g. y = 10^(x / 20)"
                  />
                </div>
              </div>

              {/* STRUCTURED OPTIONS & ENUMS TABLE */}
              <div className="border border-white/5 p-4 rounded-xl bg-black/20 space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div>
                    <span className="text-[10px] font-mono text-gear-accent uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3 h-3" />
                      Structured Option Rows &amp; Selector Values
                    </span>
                    <p className="text-[9px] text-gray-400">
                      Configure rotary switch positions, enum states, or text label mappings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOptionRow}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono bg-gear-accent/15 hover:bg-gear-accent/25 text-gear-accent rounded-lg border border-gear-accent/30 transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                </div>

                {optionRows.length === 0 ? (
                  <div className="py-4 text-center border border-dashed border-white/5 rounded-xl bg-white/[0.01]">
                    <span className="text-[10px] font-mono text-gray-500">No discrete options configured. For continuous knobs, leave empty.</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    <div className="grid grid-cols-12 gap-2 px-2 text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                      <div className="col-span-3">Display Label</div>
                      <div className="col-span-3">Accepted Inputs / Aliases</div>
                      <div className="col-span-3">AT5 Export Value</div>
                      <div className="col-span-1 text-center">Default</div>
                      <div className="col-span-2">Notes</div>
                    </div>

                    <div className="space-y-1.5">
                      {optionRows.map((row, rIdx) => {
                        const isEmptyLabel = !row.displayLabel.trim();
                        const isEmptyExport = !String(row.exportValue).trim();

                        return (
                          <div
                            key={rIdx}
                            className={`grid grid-cols-12 gap-2 items-center bg-white/[0.02] p-2 rounded-xl border transition-all ${
                              isEmptyLabel || isEmptyExport ? 'border-red-500/30' : 'border-white/5 hover:border-white/10'
                            }`}
                          >
                            <div className="col-span-3">
                              <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white focus:border-gear-accent/40"
                                value={row.displayLabel}
                                onChange={(e) => handleUpdateOptionRow(rIdx, 'displayLabel', e.target.value)}
                                placeholder="e.g. Clean, Crunch, Lead"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="text"
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-xs font-mono text-gray-300 focus:border-gear-accent/40"
                                value={row.aliases.join(', ')}
                                onChange={(e) => {
                                  const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                  handleUpdateOptionRow(rIdx, 'aliases', arr);
                                }}
                                placeholder="e.g. ch1, rhythm"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-white focus:border-gear-accent/40"
                                value={row.exportValue !== undefined ? String(row.exportValue) : ''}
                                onChange={(e) => handleUpdateOptionRow(rIdx, 'exportValue', e.target.value)}
                                placeholder="e.g. 0.0, 1.0, 2.0"
                              />
                            </div>
                            <div className="col-span-1 flex justify-center">
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-gear-accent cursor-pointer"
                                checked={row.isDefault || false}
                                onChange={(e) => handleSetDefaultRow(rIdx, e.target.checked)}
                              />
                            </div>
                            <div className="col-span-2 flex items-center gap-1.5">
                              <input
                                type="text"
                                className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-[10px] font-mono text-gray-400 focus:border-gear-accent/40"
                                value={row.notes || ''}
                                onChange={(e) => handleUpdateOptionRow(rIdx, 'notes', e.target.value)}
                                placeholder="Notes"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveOptionRow(rIdx)}
                                className="p-1 text-gray-500 hover:text-red-400 rounded transition-all cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 5: TEST PARAMETER TRANSLATION & XML PREVIEW */}
            <div className="border border-gear-accent/30 p-5 rounded-2xl bg-gradient-to-br from-black/60 to-gear-accent/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2">
                <div>
                  <span className="text-[11px] font-mono text-gear-accent uppercase font-bold tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    5. Test Parameter Translation &amp; XML Preview
                  </span>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Live end-to-end verification across the 3 domains using current editor rules.
                  </p>
                </div>

                {testTranslationResult && testTranslationResult.xmlPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(testTranslationResult.xmlPreview);
                      setCopiedTestXml(true);
                      setTimeout(() => setCopiedTestXml(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono bg-gear-accent/15 hover:bg-gear-accent/25 text-gear-accent border border-gear-accent/30 rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    {copiedTestXml ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied XML!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy XML</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Test Input Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-mono text-gray-400 uppercase flex items-center justify-between">
                    <span>Test Input Value (User Setting / Tone Request)</span>
                    <span className="text-[9px] text-gray-500 font-normal">e.g. 3.28171, 7.5, -6 dB, 440 Hz, Off</span>
                  </label>
                  <input
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                    value={testInputValue}
                    onChange={(e) => setTestInputValue(e.target.value)}
                    placeholder="Enter test value (e.g. 3.28171, 7.5, -6 dB)..."
                  />
                </div>

                <div className="flex gap-2">
                  {paramForm.exampleInput && (
                    <button
                      type="button"
                      onClick={() => setTestInputValue(paramForm.exampleInput!)}
                      className="px-2.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-mono rounded-xl border border-white/10 transition-all truncate"
                    >
                      Use Example ({paramForm.exampleInput})
                    </button>
                  )}
                  {paramForm.defaultDisplayValue !== undefined && (
                    <button
                      type="button"
                      onClick={() => setTestInputValue(String(paramForm.defaultDisplayValue))}
                      className="px-2.5 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-mono rounded-xl border border-white/10 transition-all truncate"
                    >
                      Use Default ({String(paramForm.defaultDisplayValue)})
                    </button>
                  )}
                </div>
              </div>

              {/* 3-Domain Explicit Cards */}
              {testTranslationResult ? (
                <div className="space-y-3 pt-2">
                  {/* The 3 Domains Side-by-Side Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* DOMAIN 1 */}
                    <div className="bg-black/40 border border-white/10 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 uppercase font-bold">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        1. Input / Request
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-mono text-white font-bold truncate">
                          {String(testTranslationResult.inputValue)}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">
                          Parsed: <span className="text-gray-300">{testTranslationResult.parsedNumericValue !== undefined ? String(testTranslationResult.parsedNumericValue) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* DOMAIN 2 */}
                    <div className="bg-black/40 border border-blue-500/20 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400 uppercase font-bold">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        2. AT5 / TT Display Value
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-mono text-blue-300 font-bold truncate">
                          {testTranslationResult.reverseConvertedDisplayValue || String(testTranslationResult.inputValue)}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">
                          Precision: <span className="text-blue-300">{displayPrecision} decimals</span>
                        </div>
                      </div>
                    </div>

                    {/* DOMAIN 3 */}
                    <div className="bg-black/40 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 uppercase font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        3. AT5 XML / Raw Export
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-mono text-emerald-300 font-bold truncate">
                          {String(testTranslationResult.resolvedExportValue)}
                        </div>
                        <div className="text-[10px] font-mono text-gray-500">
                          Precision: <span className="text-emerald-300">{exportPrecision} decimals</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Generated AmpliTube 5 XML Attribute Code Block */}
                  <div className="bg-black/80 border border-gear-accent/40 rounded-xl p-3 space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 uppercase">
                      <span>Generated AmpliTube 5 XML Attribute</span>
                      <span className="text-cyan-400 font-semibold">{testTranslationResult.conversionMode} mode</span>
                    </div>
                    <div className="text-sm font-mono text-gear-accent font-bold tracking-wide select-all">
                      {testTranslationResult.xmlPreview}
                    </div>
                  </div>

                  {/* Domain Metrics Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-gray-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                    <div>
                      Visual: <span className="text-gray-200">{testTranslationResult.visualRange.formattedMin ?? testTranslationResult.visualRange.min} – {testTranslationResult.visualRange.formattedMax ?? testTranslationResult.visualRange.max} {testTranslationResult.visualRange.unit || ''}</span>
                    </div>
                    <div>
                      Export: <span className="text-gray-200">{testTranslationResult.exportRange.formattedMin ?? testTranslationResult.exportRange.min} – {testTranslationResult.exportRange.formattedMax ?? testTranslationResult.exportRange.max}</span>
                    </div>
                    <div>
                      Display Prec: <span className="text-blue-300 font-bold">{displayPrecision}</span>
                    </div>
                    <div>
                      Export Prec: <span className="text-emerald-300 font-bold">{exportPrecision}</span>
                    </div>
                    <div>
                      Reverse GUI: <span className="text-amber-300 font-bold">{testTranslationResult.reverseConvertedDisplayValue || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Warnings & Clamping Feedback */}
                  {testTranslationResult.isClamped && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-[10px] font-mono text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Notice: Value was clamped to fit valid export range [{testTranslationResult.exportRange.min}, {testTranslationResult.exportRange.max}].</span>
                    </div>
                  )}

                  {testTranslationResult.warnings && testTranslationResult.warnings.length > 0 && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl space-y-1 text-[10px] font-mono text-red-300">
                      <div className="font-bold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <span>Translation Warnings:</span>
                      </div>
                      <ul className="list-disc list-inside pl-1 space-y-0.5">
                        {testTranslationResult.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-black/20 border border-white/5 rounded-xl text-center text-[10.5px] font-mono text-gray-500">
                  Enter a test input value above to preview the 3-domain translation in real-time.
                </div>
              )}
            </div>

            {/* SECTION 6: ADVANCED / METADATA (COLLAPSIBLE GROUPS) */}
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-mono text-gray-400 uppercase font-bold tracking-wider block">
                6. Advanced Configuration &amp; Metadata
              </span>

              {/* 6A: Identity & Discovery */}
              <div className="border border-white/5 rounded-2xl bg-white/[0.005] overflow-hidden">
                <details className="group">
                  <summary className="flex justify-between items-center px-5 py-3 text-[11px] font-mono text-gray-300 hover:text-white uppercase font-bold tracking-wider cursor-pointer select-none bg-white/[0.01] hover:bg-white/[0.02] transition-all">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-gear-accent" />
                      6A. Identity, Discovery &amp; Status
                    </span>
                    <span className="text-[10px] font-normal normal-case text-gray-500 group-open:hidden">Expand</span>
                    <span className="text-[10px] font-normal normal-case text-gray-500 hidden group-open:block">Collapse</span>
                  </summary>

                  <div className="p-5 space-y-4 border-t border-white/5 bg-black/20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-gray-400 uppercase">Validation Status</label>
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                          value={paramForm.validationStatus || 'PARTIAL'}
                          onChange={(e) => setParamForm({ ...paramForm, validationStatus: e.target.value as any })}
                        >
                          <option value="PASS">PASS (Fully Verified)</option>
                          <option value="WARN">WARN (Warning / Disparities)</option>
                          <option value="PARTIAL">PARTIAL (Partially Mapped)</option>
                          <option value="CHECK">CHECK (Needs Checking)</option>
                          <option value="FAIL">FAIL (Verification Mismatch)</option>
                          <option value="UNSUPPORTED">UNSUPPORTED (By Gear)</option>
                          <option value="NEEDS_MAPPING">NEEDS MAPPING</option>
                          <option value="VERIFIED_AT5P">VERIFIED AT5P</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-gray-400 uppercase">Mapping Confidence</label>
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                          value={paramForm.mappingConfidence || 'medium'}
                          onChange={(e) => setParamForm({ ...paramForm, mappingConfidence: e.target.value as any })}
                        >
                          <option value="high">High Confidence</option>
                          <option value="medium">Medium Confidence</option>
                          <option value="low">Low Confidence</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-gray-400 uppercase">Metadata Discovery Source</label>
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                          value={paramForm.source || 'default'}
                          onChange={(e) => setParamForm({ ...paramForm, source: e.target.value as any })}
                        >
                          <option value="at5p_discovery">AT5P Automated Discovery</option>
                          <option value="gear_manager_manual">Gear Manager Manual</option>
                          <option value="ikmpak_candidate">IKMPAK Candidate</option>
                          <option value="inferred">Algorithmic Inferred</option>
                          <option value="default">Default Fallback</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </details>
              </div>

              {/* 6B: Parameter Aliases & Matching Keys */}
              <div className="border border-white/5 rounded-2xl bg-white/[0.005] overflow-hidden">
                <details className="group">
                  <summary className="flex justify-between items-center px-5 py-3 text-[11px] font-mono text-gray-300 hover:text-white uppercase font-bold tracking-wider cursor-pointer select-none bg-white/[0.01] hover:bg-white/[0.02] transition-all">
                    <span className="flex items-center gap-2">
                      <Tags className="w-3.5 h-3.5 text-gear-accent" />
                      6B. Parameter Aliases &amp; Matching Keys ({savedAliases.length} saved)
                    </span>
                    <span className="text-[10px] font-normal normal-case text-gray-500 group-open:hidden">Expand</span>
                    <span className="text-[10px] font-normal normal-case text-gray-500 hidden group-open:block">Collapse</span>
                  </summary>

                  <div className="p-5 space-y-4 border-t border-white/5 bg-black/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-[10px] text-gray-400">
                        Configure aliases for Tone Translator request-to-parameter matching.
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setShowBulkParamAliasTextarea(!showBulkParamAliasTextarea)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          {showBulkParamAliasTextarea ? "Hide Bulk Paste" : "Bulk Paste"}
                        </button>
                        <button
                          type="button"
                          onClick={handleDeduplicateParamAliases}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Deduplicate
                        </button>
                        <button
                          type="button"
                          onClick={handleNormalizeParamAliases}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3 text-cyan-400" />
                          Normalize
                        </button>
                      </div>
                    </div>

                    {/* Alias Error Feedback */}
                    {paramAliasError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-xs text-red-300 font-mono">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>{paramAliasError}</span>
                        </div>
                        <button type="button" onClick={() => setParamAliasError(null)} className="text-red-400 hover:text-white text-sm font-bold">&times;</button>
                      </div>
                    )}

                    {/* Collisions Warning */}
                    {collisions.length > 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold font-mono text-red-400 uppercase tracking-wide">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          Alias Collisions Detected ({collisions.length})
                        </div>
                        <ul className="text-[11px] font-mono text-red-300/90 space-y-0.5 list-disc list-inside pl-1">
                          {collisions.map((c, idx) => (
                            <li key={idx}>
                              Alias <strong className="text-white">"{c.alias}"</strong> is also assigned to parameter <strong className="text-white">"{c.otherParamName}"</strong>.
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Generic Warning */}
                    {genericAliases.length > 0 && (
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-[10px] text-amber-300 font-mono">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>
                          Notice: Generic alias(es) <strong className="text-amber-200">{genericAliases.map(a => `"${a}"`).join(", ")}</strong> will resolve to parameter "{paramForm.displayName}" specifically on gear "{editedProfile?.displayName}".
                        </span>
                      </div>
                    )}

                    {/* Bulk Paste Drawer */}
                    {showBulkParamAliasTextarea && (
                      <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase font-bold text-gear-accent">Bulk Add Aliases</span>
                          <span className="text-[9px] font-mono text-gray-500">Comma or line separated</span>
                        </div>
                        <textarea
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs font-mono text-white focus:border-gear-accent/40"
                          placeholder="e.g. Master, Vol, Volume_Lead&#10;gain, drive, distortion"
                          value={bulkParamAliasText}
                          onChange={(e) => setBulkParamAliasText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setShowBulkParamAliasTextarea(false); setBulkParamAliasText(''); }}
                            className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-400 rounded-lg border border-white/10"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyBulkParamAliases}
                            className="px-3 py-1 bg-gear-accent text-black text-xs font-mono font-bold rounded-lg hover:bg-gear-accent/80 transition-all"
                          >
                            Apply Bulk Aliases
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Single Add Input */}
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Add single parameter alias (e.g. Master, Vol, Volume_Lead)..."
                          value={newParamAliasInput}
                          onChange={(e) => { setNewParamAliasInput(e.target.value); if (paramAliasError) setParamAliasError(null); }}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParamSavedAlias(newParamAliasInput))}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddParamSavedAlias(newParamAliasInput)}
                        className="flex items-center gap-1 px-4 py-2 bg-gear-accent/15 hover:bg-gear-accent/25 text-gear-accent border border-gear-accent/30 text-xs font-mono font-bold uppercase rounded-xl transition-all shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1 border-b border-white/5 pb-2 pt-1 overflow-x-auto text-[10px] font-mono">
                      <button
                        type="button"
                        onClick={() => setAliasGroupTab('all')}
                        className={`px-3 py-1 rounded-lg transition-all ${aliasGroupTab === 'all' ? 'bg-gear-accent text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                      >
                        All Active ({effectiveAliases.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAliasGroupTab('saved')}
                        className={`px-3 py-1 rounded-lg transition-all ${aliasGroupTab === 'saved' ? 'bg-cyan-500 text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                      >
                        Saved ({savedAliases.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAliasGroupTab('raw_map')}
                        className={`px-3 py-1 rounded-lg transition-all ${aliasGroupTab === 'raw_map' ? 'bg-blue-500 text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                      >
                        Raw Mappings ({rawMapAliases.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAliasGroupTab('auto_gen')}
                        className={`px-3 py-1 rounded-lg transition-all ${aliasGroupTab === 'auto_gen' ? 'bg-purple-500 text-black font-bold' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                      >
                        Auto-Generated ({autoGenAliases.length})
                      </button>
                    </div>

                    {/* Saved Aliases Badges */}
                    <div className="space-y-2">
                      <div className="text-[10px] font-mono text-gray-400 uppercase font-bold">Saved Editable Aliases:</div>
                      {savedAliases.length === 0 ? (
                        <div className="text-[11px] font-mono text-gray-500 italic p-3 bg-black/20 rounded-xl border border-white/5">
                          No custom aliases explicitly saved yet.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {savedAliases.map((alias, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-300"
                            >
                              {editingAliasIdx === idx ? (
                                <input
                                  type="text"
                                  autoFocus
                                  className="bg-black/50 border border-cyan-500/40 rounded px-1 text-xs text-white"
                                  value={editingAliasVal}
                                  onChange={(e) => setEditingAliasVal(e.target.value)}
                                  onBlur={() => handleUpdateParamSavedAlias(idx, editingAliasVal)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateParamSavedAlias(idx, editingAliasVal)}
                                />
                              ) : (
                                <span onDoubleClick={() => { setEditingAliasIdx(idx); setEditingAliasVal(alias); }}>{alias}</span>
                              )}
                              <button
                                type="button"
                                onClick={() => { setEditingAliasIdx(idx); setEditingAliasVal(alias); }}
                                className="text-cyan-400 hover:text-white"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveParamSavedAlias(idx)}
                                className="text-cyan-400 hover:text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              </div>

              {/* 6C: Advanced Raw JSON Maps */}
              <div className="border border-white/5 rounded-2xl bg-white/[0.005] overflow-hidden">
                <details className="group">
                  <summary className="flex justify-between items-center px-5 py-3 text-[11px] font-mono text-gray-300 hover:text-white uppercase font-bold tracking-wider cursor-pointer select-none bg-white/[0.01] hover:bg-white/[0.02] transition-all">
                    <span className="flex items-center gap-2">
                      <FileCode className="w-3.5 h-3.5 text-gear-accent" />
                      6C. Advanced Raw JSON Maps
                    </span>
                    <span className="text-[10px] font-normal normal-case text-gray-500 group-open:hidden">Expand</span>
                    <span className="text-[10px] font-normal normal-case text-gray-500 hidden group-open:block">Collapse</span>
                  </summary>

                  <div className="p-5 space-y-4 border-t border-white/5 bg-black/20">
                    <p className="text-[10px] text-gray-400">
                      These JSON maps stay synchronized with your structured option rows above on save.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-mono text-gray-400 uppercase">Value Map JSON</label>
                          {valueMapError && (
                            <span className="text-[9px] font-mono text-red-400 truncate max-w-[200px]" title={valueMapError}>Invalid syntax!</span>
                          )}
                        </div>
                        <textarea
                          className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-gray-300 focus:border-gear-accent/40"
                          value={valueMapText}
                          onChange={(e) => {
                            setValueMapText(e.target.value);
                            setValueMapError(null);
                          }}
                          placeholder='Value Map'
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-mono text-gray-400 uppercase">Reverse Value Map JSON</label>
                          {reverseValueMapError && (
                            <span className="text-[9px] font-mono text-red-400 truncate max-w-[200px]" title={reverseValueMapError}>Invalid syntax!</span>
                          )}
                        </div>
                        <textarea
                          className="w-full h-24 bg-white/5 border border-white/10 rounded-xl p-3 text-xs font-mono text-gray-300 focus:border-gear-accent/40"
                          value={reverseValueMapText}
                          onChange={(e) => {
                            setReverseValueMapText(e.target.value);
                            setReverseValueMapError(null);
                          }}
                          placeholder='Reverse Value Map'
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSyncFromRawJSON}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg border border-white/10 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Sync From Raw JSON Maps
                      </button>
                    </div>
                  </div>
                </details>
              </div>

              {/* 6D: Documentation & Quality Control */}
              <div className="border border-white/5 rounded-2xl bg-white/[0.005] overflow-hidden">
                <details className="group">
                  <summary className="flex justify-between items-center px-5 py-3 text-[11px] font-mono text-gray-300 hover:text-white uppercase font-bold tracking-wider cursor-pointer select-none bg-white/[0.01] hover:bg-white/[0.02] transition-all">
                    <span className="flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-gear-accent" />
                      6D. Documentation &amp; Quality Control
                    </span>
                    <span className="text-[10px] font-normal normal-case text-gray-500 group-open:hidden">Expand</span>
                    <span className="text-[10px] font-normal normal-case text-gray-500 hidden group-open:block">Collapse</span>
                  </summary>

                  <div className="p-5 space-y-4 border-t border-white/5 bg-black/20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-gray-400 uppercase">Helper Description</label>
                        <input
                          type="text"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                          value={paramForm.helperDescription || ''}
                          onChange={(e) => setParamForm({ ...paramForm, helperDescription: e.target.value })}
                          placeholder="What does this parameter control?"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-gray-400 uppercase">Example Input (UI Value)</label>
                        <input
                          type="text"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                          value={paramForm.exampleInput || ''}
                          onChange={(e) => setParamForm({ ...paramForm, exampleInput: e.target.value })}
                          placeholder="e.g. 7.5, Off, 440Hz"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-gray-400 uppercase">Example Output (XML Float)</label>
                        <input
                          type="text"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:border-gear-accent/40"
                          value={paramForm.exampleOutput || ''}
                          onChange={(e) => setParamForm({ ...paramForm, exampleOutput: e.target.value })}
                          placeholder="e.g. 0.75, 0.0, 1.0"
                        />
                      </div>
                    </div>

                    <div className="border border-white/5 p-4 rounded-xl bg-black/40 space-y-3">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-gear-accent focus:ring-0 cursor-pointer"
                          checked={!!paramForm.doNotRequestForGear}
                          onChange={(e) => setParamForm({ ...paramForm, doNotRequestForGear: e.target.checked })}
                        />
                        <div>
                          <span className="text-xs font-bold font-mono text-white uppercase tracking-wider block">Do Not Request / Unsupported Parameter</span>
                          <span className="text-[10px] text-gray-400 font-mono block">Check this if the gear item does not support or shouldn't map this parameter</span>
                        </div>
                      </label>

                      {paramForm.doNotRequestForGear && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-gray-400 uppercase">Unsupported / Skipping Reason</span>
                            <input
                              type="text"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                              value={paramForm.unsupportedReason || ''}
                              onChange={(e) => setParamForm({ ...paramForm, unsupportedReason: e.target.value })}
                              placeholder="e.g. Pedal has no tone control"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-gray-400 uppercase">Review Notes</span>
                            <input
                              type="text"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-gear-accent/40"
                              value={paramForm.reviewNotes || ''}
                              onChange={(e) => setParamForm({ ...paramForm, reviewNotes: e.target.value })}
                              placeholder="Internal calibration notes"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              </div>

            </div>

          </div>

          {/* ACTION FOOTER */}
          <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
            {saveError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 font-mono">
                {saveError}
              </div>
            )}
            <div className="flex justify-between items-center">
              <div>
                <div className="text-[10px] font-mono text-gray-500">
                  Parameter index: #{editingParamIndex}
                </div>
                <div className="text-[10px] font-mono text-gear-accent/80">
                  Saves this parameter calibration and translation directly to Gear Manager.
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    if (!isSaving) {
                      onClose();
                    }
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/10 text-xs text-gray-300 font-mono uppercase rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={onSave}
                  className="px-5 py-2 bg-gear-accent hover:bg-gear-accent/80 disabled:opacity-50 text-black text-xs font-mono font-bold uppercase rounded-xl transition-all shadow-lg flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Persisting...</span>
                    </>
                  ) : (
                    <span>Save Parameter &amp; Persist</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
