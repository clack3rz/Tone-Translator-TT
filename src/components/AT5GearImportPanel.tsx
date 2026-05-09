
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  FileJson, 
  Copy, 
  Download, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Info,
  X,
  ChevronRight,
  ChevronDown,
  Settings
} from 'lucide-react';
import { parseAt5pPreset, generateCataloguePatch, generateTypeScriptEntry, generateNormalizerAlias, generateVerifiedParameterEntry } from '../services/at5PresetImporter';
import { ImportResults, DetectedGear, CataloguePatch } from '../types/at5ImportTypes';

export const AT5GearImportPanel: React.FC = () => {
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [cataloguePatch, setCataloguePatch] = useState<CataloguePatch | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedGear, setExpandedGear] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setCataloguePatch(null);
    setReviewMode(false);
    try {
      const results = await parseAt5pPreset(file);
      setImportResults(results);
    } catch (error) {
      console.error("Import error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const initiateGeneratePatch = () => {
    if (!importResults) return;
    const patch = generateCataloguePatch(importResults);
    setCataloguePatch(patch);
    setReviewMode(true);
  };

  const copyDebugJson = () => {
    if (!importResults) return;
    navigator.clipboard.writeText(JSON.stringify(importResults, null, 2));
    setCopyFeedback("Copied!");
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const exportDebugJson = () => {
    if (!importResults) return;
    const blob = new Blob([JSON.stringify(importResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `at5_import_debug_${importResults.sourceFileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPatchJson = () => {
    if (!cataloguePatch) return;
    navigator.clipboard.writeText(JSON.stringify(cataloguePatch, null, 2));
    setCopyFeedback("Patch Copied!");
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const exportPatchJson = () => {
    if (!cataloguePatch) return;
    const blob = new Blob([JSON.stringify(cataloguePatch, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `at5_catalogue_patch_${importResults?.sourceFileName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyTypeScriptEntries = () => {
    if (!cataloguePatch) return;
    const entries = cataloguePatch.newGear.map(generateTypeScriptEntry).join('\n\n');
    navigator.clipboard.writeText(entries);
    setCopyFeedback("Entries Copied!");
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const copyVerifiedParams = () => {
    if (!cataloguePatch) return;
    const entries = cataloguePatch.newGear.map(generateVerifiedParameterEntry).join('\n\n');
    navigator.clipboard.writeText(entries);
    setCopyFeedback("Params Copied!");
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const copyAliases = () => {
    if (!cataloguePatch) return;
    const aliases = cataloguePatch.newGear.map(generateNormalizerAlias).join('\n');
    navigator.clipboard.writeText(aliases);
    setCopyFeedback("Aliases Copied!");
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'known': return 'text-green-400';
      case 'new': return 'text-blue-400 font-bold';
      case 'possible_match': return 'text-yellow-400';
      case 'parameter_update': return 'text-purple-400';
      case 'conflict': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'known': return <CheckCircle2 className="w-4 h-4" />;
      case 'new': return <Info className="w-4 h-4" />;
      case 'possible_match': return <Search className="w-4 h-4" />;
      case 'conflict': return <AlertCircle className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <div id="at5-gear-import" className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight uppercase">AT5 Gear Import</h2>
            <p className="text-xs text-gray-500 mt-0.5">Analysis level 1: Gear identity & parameter mapping</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {importResults && (
            <>
              <button 
                onClick={copyDebugJson}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded-md transition-colors"
                title="Copy Debug JSON"
              >
                {copyFeedback ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copyFeedback || "Copy Debug"}
              </button>
              <button 
                onClick={exportDebugJson}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs text-gray-300 rounded-md transition-colors"
                title="Export Debug JSON"
              >
                <Download className="w-3.5 h-3.5" />
                Export Debug
              </button>
            </>
          )}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md transition-all shadow-lg active:scale-95"
          >
            <Upload className="w-4 h-4" />
            ANALYSE PRESET
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".at5p"
            className="hidden"
          />
        </div>
      </div>

      <div className="p-6">
        {!importResults && !isAnalyzing && (
          <div className="text-center py-12 px-4 border-2 border-dashed border-white/5 rounded-xl bg-white/[0.01]">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-gray-500" />
            </div>
            <h3 className="text-white font-medium mb-1">No Preset Loaded</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Upload a known-good AmpliTube 5 .at5p preset that contains missing or skipped gear. TT will inspect the preset and prepare catalogue entries.
            </p>
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin mb-4">
              <Settings className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-gray-400">Parsing XML and comparing against catalogue...</p>
          </div>
        )}

        {importResults && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {importResults.errors.length > 0 && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 text-sm text-red-400">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>{importResults.errors.join(", ")}</div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <div className="flex items-center gap-4">
                <span>File: <span className="text-gray-300 font-mono">{importResults.sourceFileName}</span></span>
                <span>Detected: <span className="text-gray-300">{importResults.detectedGear.length} units</span></span>
              </div>
              <div className="flex items-center gap-3">
                {reviewMode ? (
                  <button 
                    onClick={() => setReviewMode(false)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to Scan Results
                  </button>
                ) : (
                  <button 
                    onClick={initiateGeneratePatch}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    Generate Catalogue Patch
                  </button>
                )}
              </div>
            </div>

            {reviewMode && cataloguePatch ? (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight uppercase">Catalogue Patch Review</h3>
                      <p className="text-xs text-gray-500 mt-1">Review detected changes before manually updating TypeScript source files.</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={copyPatchJson}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 rounded-md transition-colors font-bold uppercase tracking-widest"
                      >
                        <Copy className="w-3 h-3" />
                        Copy Patch JSON
                      </button>
                      <button 
                        onClick={exportPatchJson}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 rounded-md transition-colors font-bold uppercase tracking-widest"
                      >
                        <Download className="w-3 h-3" />
                        Export Patch JSON
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-8">
                    {[
                      { label: 'New Gear', count: cataloguePatch.newGear.length, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                      { label: 'Updates', count: cataloguePatch.updatedGear.length, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                      { label: 'Conflicts', count: cataloguePatch.conflicts.length, color: 'text-red-400', bg: 'bg-red-400/10' },
                      { label: 'To Review', count: cataloguePatch.requiresManualReview.length, color: 'text-yellow-400', bg: 'bg-yellow-400/10' }
                    ].map((stat, i) => (
                      <div key={i} className={`p-4 rounded-lg bg-white/[0.02] border border-white/5`}>
                        <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
                        <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {cataloguePatch.newGear.length > 0 && (
                    <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-[10px] uppercase font-bold text-blue-400 tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                            Catalogue Entry Snippet
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-1">Paste into <code className="text-gray-300">src/services/at5Catalog.ts</code> inside the <code className="text-gray-300">AT5_CATALOG</code> array.</p>
                        </div>
                        <button 
                          onClick={copyTypeScriptEntries}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-[10px] text-blue-400 rounded-md transition-colors font-bold uppercase tracking-widest border border-blue-400/20"
                        >
                          <Copy className="w-3 h-3" />
                          Copy to Clipboard
                        </button>
                      </div>
                      <div className="bg-black/40 rounded-lg p-4 border border-white/5 font-mono text-[11px] overflow-x-auto max-h-[200px]">
                        <pre className="text-gray-400">{cataloguePatch.newGear.map(generateTypeScriptEntry).join('\n\n')}</pre>
                      </div>

                      <div className="flex items-center justify-between mt-6">
                        <div>
                          <h4 className="text-[10px] uppercase font-bold text-blue-400 tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                            Normalizer Alias Snippet
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-1">Paste into <code className="text-gray-300">src/services/at5SignalChainNormalizer.ts</code> inside the <code className="text-gray-300">GEAR_NAME_MAP</code>.</p>
                        </div>
                        <button 
                          onClick={copyAliases}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-[10px] text-blue-400 rounded-md transition-colors font-bold uppercase tracking-widest border border-blue-400/20"
                        >
                          <Copy className="w-3 h-3" />
                          Copy to Clipboard
                        </button>
                      </div>
                      <div className="bg-black/40 rounded-lg p-4 border border-white/5 font-mono text-[11px] overflow-x-auto max-h-[150px]">
                        <pre className="text-gray-400">{cataloguePatch.newGear.map(generateNormalizerAlias).join('\n')}</pre>
                      </div>

                      <div className="flex items-center justify-between mt-6">
                        <div>
                          <h4 className="text-[10px] uppercase font-bold text-blue-400 tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                            Parameter Manifest Snippet
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-1">Paste into <code className="text-gray-300">src/services/at5VerifiedParameterOverrides.ts</code> inside <code className="text-gray-300">AT5_VERIFIED_GEAR</code>.</p>
                        </div>
                        <button 
                          onClick={copyVerifiedParams}
                          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-[10px] text-blue-400 rounded-md transition-colors font-bold uppercase tracking-widest border border-blue-400/20"
                        >
                          <Copy className="w-3 h-3" />
                          Copy to Clipboard
                        </button>
                      </div>
                      <div className="bg-black/40 rounded-lg p-4 border border-white/5 font-mono text-[11px] overflow-x-auto max-h-[200px]">
                        <pre className="text-gray-400">{cataloguePatch.newGear.map(generateVerifiedParameterEntry).join('\n\n')}</pre>
                      </div>
                    </div>
                  )}

                  {cataloguePatch.conflicts.length > 0 && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <h4 className="text-[10px] uppercase font-bold text-red-400 tracking-widest flex items-center gap-2 mb-2">
                        <AlertCircle className="w-3 h-3" />
                        Critical Conflicts Detected
                      </h4>
                      <p className="text-xs text-red-300/80 mb-4">The following gear items have existing display names in the catalogue but different GUIDs, or vice-versa. Do not apply patches without manual verification.</p>
                      <div className="space-y-2">
                        {cataloguePatch.conflicts.map((g, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] font-mono text-red-400/60 bg-red-500/5 p-2 rounded">
                            <span>{g.displayName}</span>
                            <span>{g.modelGuid}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-hidden border border-white/10 rounded-lg">
                <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Gear / Type</th>
                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                    <th className="px-4 py-3 font-semibold">Model GUID</th>
                    <th className="px-4 py-3 font-semibold">Params</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {importResults.detectedGear.map((gear, idx) => (
                    <React.Fragment key={`${gear.modelGuid}-${idx}`}>
                      <tr className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{gear.displayName}</span>
                            <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1.5 mt-0.5">
                              {gear.gearType} 
                              <span className="w-1 h-1 rounded-full bg-gray-700" />
                              {gear.slotType}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wide ${getStatusColor(gear.catalogueStatus)}`}>
                            {getStatusIcon(gear.catalogueStatus)}
                            {gear.catalogueStatus.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-[10px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">
                            {gear.modelGuid?.substring(0, 13)}...
                          </code>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {gear.parameters.length} found
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => setExpandedGear(expandedGear === `${gear.modelGuid}-${idx}` ? null : `${gear.modelGuid}-${idx}`)}
                            className="p-1.5 hover:bg-white/10 rounded-md text-gray-500 hover:text-white transition-colors"
                          >
                            {expandedGear === `${gear.modelGuid}-${idx}` ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                      
                      <AnimatePresence>
                        {expandedGear === `${gear.modelGuid}-${idx}` && (
                          <tr>
                            <td colSpan={5} className="bg-white/[0.02] p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-6 space-y-4">
                                  <div className="grid grid-cols-2 gap-6">
                                    <div>
                                      <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Import Recommendation</h4>
                                      <p className="text-xs text-gray-300 bg-white/5 p-3 rounded-md border border-white/5 italic">
                                        "{gear.importRecommendation}"
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Technical Info</h4>
                                      <div className="space-y-1 text-[10px] font-mono text-gray-400">
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                          <span>Full GUID:</span>
                                          <span className="text-gray-300">{gear.modelGuid}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-white/5 pb-1">
                                          <span>XML Path:</span>
                                          <span className="text-gray-300">{gear.rawXmlPath}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>State:</span>
                                          <span className={gear.isEnabled ? "text-green-400" : "text-gray-500"}>
                                            {gear.isEnabled ? "Enabled / Active" : "Bypassed"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2">Detected Parameters</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                      {gear.parameters.map((p, pidx) => (
                                        <div key={pidx} className="bg-black/50 border border-white/5 rounded p-2 flex items-center justify-between">
                                          <span className="text-[10px] text-gray-400 truncate pr-2" title={p.name}>{p.name}</span>
                                          <span className="text-[10px] text-blue-400 font-mono font-bold">{p.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
      </div>
    </div>
  );
};
