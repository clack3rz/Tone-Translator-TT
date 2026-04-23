import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  Upload, 
  Settings2, 
  Zap, 
  Speaker, 
  Mic2, 
  Waves,
  ChevronRight,
  Info,
  Loader2,
  Guitar,
  Server,
  Box,
  Sliders,
  Home,
  Cpu,
  Download,
  Activity,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import { translateTone } from './services/geminiService';
import { ToneResult, GearLink } from './types';
import { parseAt5p, comparePresets, PresetData } from './services/presetParser';
import { exportAt5p, getExportData } from './services/presetExporter';
import { GearSilhouette } from './components/GearSilhouette';
import { ConsoleMixer } from './components/ConsoleMixer';
import { TopologyMap } from './components/TopologyMap';
import { 
  AMP_MANIFEST, 
  STOMP_MANIFEST, 
  CAB_MANIFEST, 
  ROOM_MANIFEST, 
  RACK_MANIFEST,
  TONEX_MANIFEST,
  KnobDefinition 
} from './services/gearManifest';
import { getGearIdentity } from './services/gearIdentity';

const Knob = ({ name, value, midiCC, min = 0, max = 10, unit = "" }: { name: string; value: number | string; midiCC?: number; min?: number; max?: number; unit?: string }) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(value as string);
  const isNumeric = !isNaN(numericValue as number);
  const isSelection = max === min;
  const isToggle = min === 0 && max === 1 && !unit && !name.toLowerCase().includes('distance');
  
  // Calculate rotation based on min/max
  const range = max - min;
  const normalizedValue = isNumeric && range !== 0 ? ((numericValue as number) - min) / range : 0;
  const rotation = normalizedValue * 270 - 135;

  let displayValue = value;
  if (isToggle) {
    displayValue = numericValue >= 0.5 ? 'ON' : 'OFF';
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`knob-container relative ${isSelection ? 'border-gear-accent/40 bg-gear-accent/5' : ''} ${isToggle ? 'scale-90 opacity-80' : ''}`}>
        {!isSelection && isNumeric ? (
          <div 
            className="knob-indicator" 
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {isToggle ? (
              <div className={`w-2 h-2 rounded-full ${numericValue >= 0.5 ? 'bg-gear-accent shadow-[0_0_8px_rgba(255,165,0,0.6)]' : 'bg-gray-800'}`} />
            ) : (
              <Settings2 className={`w-4 h-4 ${isSelection ? 'text-gear-accent' : 'text-gear-accent/30'}`} />
            )}
          </div>
        )}
        <div className={`knob-center relative z-10 ${isSelection ? 'bg-gear-accent/20 border-gear-accent/30' : ''} ${isToggle ? 'bg-black/40' : ''}`} />
        <div className="absolute inset-0 rounded-full border border-gear-border/30 pointer-events-none" />
      </div>
      <span className="text-[7.5px] uppercase font-mono text-gray-400 group-hover:text-white transition-colors leading-none mt-1 text-center truncate w-14">{name}</span>
      <span className="text-[10px] font-bold leading-none text-center max-w-[80px] truncate text-white mt-0.5">
        {displayValue}{isNumeric && !isToggle && !String(value).includes(unit) && unit}
      </span>
      {midiCC !== undefined && (
        <span className="text-[7px] font-mono text-gear-accent/80 font-bold mt-0.5">CC:{midiCC}</span>
      )}
    </div>
  );
};

const SignalConnector = () => (
  <div className="signal-connection shrink-0">
    <div className="signal-line" />
    <div className="signal-dot shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
  </div>
);

const GearCard = ({ link }: { link: GearLink }) => {
  const Icon = {
    Stomp: Waves,
    Amp: Speaker,
    Cab: Box,
    Room: Home,
    EQ: Sliders,
    Rack: Server,
    TONEX: Cpu
  }[link.type as any] || Box;

  // Map branding to generic premium labels
  const getBrandingLabel = (id: string, type: string) => {
    const lowerId = id.toLowerCase();
    if (lowerId.includes('fender')) return "VINTAGE AMERICAN";
    if (lowerId.includes('mesa') || lowerId.includes('dual_rectifier') || lowerId.includes('mark_')) return "CALIFORNIA BOUTIQUE";
    if (lowerId.includes('orange') || lowerId.includes('ad_30') || lowerId.includes('brit_')) return "BRITISH CLASSIC";
    if (lowerId.includes('satch') || lowerId.includes('sld') || lowerId.includes('soldano')) return "HIGH GAIN LEGEND";
    if (lowerId.includes('ampeg')) return "FOUNDATION BASS";
    if (lowerId.includes('tonex')) return "MACHINE MODEL";
    return type.toUpperCase();
  };

  const manifest = {
    Stomp: STOMP_MANIFEST,
    Amp: AMP_MANIFEST,
    Cab: CAB_MANIFEST,
    Room: ROOM_MANIFEST,
    EQ: STOMP_MANIFEST, // For parametric EQ
    Rack: RACK_MANIFEST,
    TONEX: TONEX_MANIFEST
  }[link.type as any] || [];

  const gearInfo = (manifest as any[]).find(item => item.id === link.id);

  // Grouping logic for Cab, Room, and EQ
  const renderKnobs = () => {
    if (link.type === 'Cab' || link.type === 'Room' || link.type === 'EQ' || link.model === 'Parametric EQ' || link.type === 'Rack' || link.type === 'TONEX') {
      const groups: Record<string, any[]> = {};
      link.knobs.forEach(knob => {
        let group = 'General';
        if (knob.name.startsWith('Mic 1')) group = 'Mic 1';
        else if (knob.name.startsWith('Mic 2')) group = 'Mic 2';
        else if (knob.name.startsWith('Room Mic') || knob.name === 'Volume' || knob.name === 'Width') group = 'Room / Mixer';
        else if (knob.name === 'Speakers') group = 'Speakers';
        else if (knob.name.startsWith('Band 1')) group = 'Band 1';
        else if (knob.name.startsWith('Band 2')) group = 'Band 2';
        
        if (!groups[group]) groups[group] = [];
        groups[group].push(knob);
      });

      return Object.entries(groups).map(([groupName, knobs]) => (
        <div key={groupName} className="mb-4 last:mb-0">
          <h4 className="text-[8px] font-mono text-gray-600 uppercase mb-2 tracking-widest border-l-2 border-gear-accent/30 pl-2">
            {groupName}
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {knobs.map((knob, i) => {
              const knobDef = gearInfo?.knobs?.find((k: any) => 
                typeof k === 'object' && k.name.toLowerCase() === knob.name.toLowerCase()
              ) as KnobDefinition | undefined;

              return (
                <Knob 
                  key={`knob-${link.id}-${knob.name}`} 
                  name={knob.name.replace(/Mic \d |Room Mic |Band \d /, '')} 
                  value={knob.value} 
                  min={knobDef?.min}
                  max={knobDef?.max}
                  unit={knobDef?.unit}
                />
              );
            })}
          </div>
        </div>
      ));
    }

    // Default grid for other types
    return (
      <div className="grid grid-cols-2 gap-2">
        {link.knobs.map((knob, i) => {
          const knobDef = gearInfo?.knobs?.find((k: any) => 
            typeof k === 'object' && k.name.toLowerCase() === knob.name.toLowerCase()
          ) as KnobDefinition | undefined;

          return (
            <Knob 
              key={`knob-${link.id}-${i}`} 
              name={knob.name} 
              value={knob.value}
              midiCC={knob.midiCC}
              min={knobDef?.min}
              max={knobDef?.max}
              unit={knobDef?.unit}
            />
          );
        })}
      </div>
    );
  };

  const identity = getGearIdentity(link.id);

  return (
    <motion.div 
      layout
      className={`hardware-card hardware-card-screws-bottom shrink-0 shadow-2xl ${
        link.type === 'Cab' || link.type === 'EQ' || link.model === 'Parametric EQ' || link.type === 'Rack' || link.type === 'TONEX' ? 'min-w-[340px]' : 'min-w-[200px]'
      }`}
    >
      <div className="flex items-center justify-between mb-3 border-b border-gear-border/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-gear-bg/50 border border-gear-border">
            <Icon className="w-3.5 h-3.5 text-gear-accent" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest leading-none mb-0.5">{getBrandingLabel(link.id, link.type)}</span>
            {identity && <span className="text-[7px] font-mono text-gear-accent/60 leading-none truncate w-24">IDENTITY: {identity.toUpperCase()}</span>}
          </div>
        </div>
        <div className="flex gap-1.5 px-4">
          <div className="led-indicator led-red animate-pulse" />
          <div className="led-indicator led-on" />
        </div>
      </div>
      
      <h3 className="text-xs font-display font-bold mb-3 text-white line-clamp-1 uppercase tracking-tight">{link.model}</h3>
      
      {/* Visual Depiction Wrapper */}
      <div className="mb-4 bg-gear-bg/30 rounded-lg p-6 border border-gear-border/20 flex items-center justify-center min-h-[90px] overflow-hidden relative shadow-inner group/silhouette">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
        <div className="absolute inset-0 opacity-0 group-hover/silhouette:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_center,var(--color-gear-accent)_0%,transparent_70%)] opacity-5 pointer-events-none" />
        <GearSilhouette type={link.type} model={link.model} />
      </div>
      
      {renderKnobs()}

      {link.description && (
        <div className="mt-4 pt-3 border-t border-gear-border/30 flex gap-2">
          <Activity className="w-2.5 h-2.5 text-gear-accent flex-shrink-0 mt-0.5" />
          <p className="text-[8.5px] text-gray-500 italic leading-snug">{link.description}</p>
        </div>
      )}
    </motion.div>
  );
};

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [result, setResult] = useState<ToneResult | null>(null);
  const [activeGearId, setActiveGearId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPreset, setUserPreset] = useState<PresetData | null>(null);
  const [diffs, setDiffs] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFilename, setExportFilename] = useState('');

  const activeGear = result?.signalChain.find(l => l.id === activeGearId) || result?.signalChain[0];

  const initiateExport = () => {
    if (!result) return;
    const defaultName = `TT_${result.explanation.substring(0, 15).replace(/[^a-z0-9]/gi, '_')}`;
    setExportFilename(defaultName);
    setIsExportModalOpen(true);
  };

  const handleExport = async (customName: string) => {
    if (!result) return;
    
    const finalName = customName.endsWith('.at5p') ? customName : `${customName}.at5p`;
    const data = getExportData(result);

    // Try File System Access API for "Browse to directory" experience
    // Note: This API is often blocked in iframes (like AI Studio preview)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: finalName,
          types: [{
            description: 'Amplitube 5 Preset',
            accept: { 
              'application/xml': ['.at5p'],
              'text/xml': ['.at5p']
            },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(data);
        await writable.close();
        setIsExportModalOpen(false);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('Modern File Picker failed (likely blocked by iframe sandbox). Falling back to standard download.', err);
      }
    }

    // Fallback: Standard Download
    const blob = new Blob([data], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };

  const copyManifestAsText = () => {
    if (!result) return;
    
    let text = `AMPLITUBE 5 TONE ARCHITECTURE MANIFEST\n`;
    text += `======================================\n\n`;
    
    result.signalChain.forEach((link, idx) => {
      text += `${idx + 1}. ${link.model.toUpperCase()} [${link.type}]\n`;
      text += `--------------------------------------\n`;
      
      const manifest = {
        Stomp: STOMP_MANIFEST,
        Amp: AMP_MANIFEST,
        Cab: CAB_MANIFEST,
        Room: ROOM_MANIFEST,
        EQ: STOMP_MANIFEST,
        Rack: RACK_MANIFEST,
        TONEX: TONEX_MANIFEST
      }[link.type as any] || [];
      const gearInfo = (manifest as any[]).find(item => item.id === link.id);

      link.knobs.forEach(knob => {
        const knobDef = gearInfo?.knobs?.find((def: any) => 
          typeof def === 'object' && def.name.toLowerCase() === knob.name.toLowerCase()
        ) as KnobDefinition | undefined;
        const unit = knobDef?.unit || "";
        const formattedValue = `${knob.value}${!String(knob.value).includes(unit) ? unit : ""}`;
        
        text += `${knob.name.padEnd(20)} : ${formattedValue}\n`;
      });
      text += `\n`;
    });

    text += `CONFIDENCE: ${(result.matchConfidence * 100).toFixed(0)}%\n`;
    text += `ENGINE: V1.5_PRO\n`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setAudioFile(acceptedFiles[0]);
    }
  }, []);

  const onPresetDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const text = await file.text();
      try {
        const parsed = parseAt5p(text);
        setUserPreset(parsed);
        if (result) {
          const newDiffs = comparePresets(result, parsed);
          setDiffs(newDiffs);
        }
      } catch (err) {
        setError('Failed to parse Amplitube preset file.');
      }
    }
  }, [result]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'audio/*': [] },
    multiple: false,
  });

  const { 
    getRootProps: getPresetRootProps, 
    getInputProps: getPresetInputProps, 
    isDragActive: isPresetDragActive 
  } = useDropzone({
    onDrop: onPresetDrop,
    accept: { 
      '.at5p': ['.at5p'],
      'text/plain': ['.txt']
    },
    multiple: false,
  });

  const handleTranslate = async () => {
    if (!prompt && !audioFile) {
      setError('Please provide a description or an audio file.');
      return;
    }

    setIsTranslating(true);
    setError(null);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      let audioBase64 = '';
      if (audioFile) {
        const reader = new FileReader();
        audioBase64 = await new Promise((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(audioFile);
        });
      }

      const toneResult = await translateTone(
        prompt || "Analyze audio for tone",
        audioBase64 || undefined,
        audioFile?.type,
        userPreset,
        controller.signal,
        youtubeUrl || undefined
      );
      setResult(toneResult);
      
      if (userPreset) {
        const newDiffs = comparePresets(toneResult, userPreset);
        setDiffs(newDiffs);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || (err instanceof Error && err.message.includes('abort'))) {
        console.log('Analysis aborted by user');
        return;
      }
      if (err instanceof Error && err.message.includes('TimeoutError')) {
        setError('Analysis timed out. The tone might be too complex or the service is busy. Please try again.');
        return;
      }
      if (err?.message?.includes('429') || err?.status === 'RESOURCE_EXHAUSTED') {
        setError('Rate limit exceeded. Please wait a moment and try again.');
        return;
      }
      console.error(err);
      setError('Failed to translate tone. Please check your connection and try again.');
    } finally {
      setIsTranslating(false);
      setAbortController(null);
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setIsTranslating(false);
      setAbortController(null);
    }
  };

  const getSettingsString = (link: GearLink) => {
    return link.knobs.slice(0, 4).map(k => `${k.name}: ${k.value}`).join(' | ');
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white overflow-hidden selection:bg-gear-accent/30 font-sans">
      {/* 1. TOP-TIER: Header & Global Controls */}
      <header className="h-[60px] border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gear-accent rounded flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <Guitar className="text-black w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-display font-bold tracking-tight leading-none">Tone Translator</h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Amplitube 5 Architect // V1.5</p>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-12 flex items-center gap-3 px-6">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the tone (e.g. Master of Puppets bridge...)"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-10 py-2 text-xs focus:border-gear-accent outline-none transition-all placeholder:text-gray-600 font-mono"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Sliders className="w-3.5 h-3.5 text-gray-700" />
            </div>
          </div>
          <button 
            onClick={handleTranslate}
            disabled={isTranslating}
            className="px-6 py-2 bg-gear-accent hover:bg-yellow-500 text-black font-bold text-[10px] rounded-lg transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 shadow-[0_0_20px_rgba(245,158,11,0.2)] uppercase tracking-widest"
          >
            {isTranslating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {isTranslating ? "ANALYZING..." : "GENERATE"}
          </button>
        </div>

        <div className="flex items-center gap-4">
          {result && (
            <button 
              onClick={initiateExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gear-accent/30 text-gear-accent font-bold text-[10px] hover:bg-gear-accent hover:text-black transition-all uppercase tracking-widest"
            >
              <Download className="w-3.5 h-3.5" />
              EXPORT .AT5P
            </button>
          )}
          <div className="w-px h-4 bg-white/10" />
          <div className="text-[9px] font-mono text-gray-500 uppercase flex items-center gap-2 pr-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            System Live
          </div>
        </div>
      </header>

      {/* 2. TOP-TIER: Signal Ribbon */}
      <section className="h-[140px] border-b border-white/10 relative bg-[#0a0a0a] shrink-0">
        <div className="absolute top-1/2 left-0 w-full h-[2.5px] bg-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.8)] -translate-y-1/2 pointer-events-none z-0" />
        
        <div className="flex items-center gap-12 px-12 h-full overflow-x-auto scrollbar-hide relative z-10">
          {!result && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[10px] text-gray-700 uppercase tracking-[0.6em] animate-pulse font-mono">Awaiting Input Signal Initialization...</p>
            </div>
          )}
          {result?.signalChain.map((link, i) => {
            const isActive = (activeGearId === link.id) || (!activeGearId && i === 0);
            const NodeIcon = {
              Stomp: Waves,
              Amp: Speaker,
              Cab: Box,
              Room: Home,
              EQ: Sliders,
              Rack: Server,
              TONEX: Cpu
            }[link.type as any] || Box;

            return (
              <div key={link.id} className="flex items-center gap-12 group h-full">
                <button 
                  onClick={() => setActiveGearId(link.id)}
                  className={`relative w-[75px] h-[75px] bg-[#111] border rounded-lg flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95 group ${
                    isActive 
                      ? 'border-white shadow-[0_0_30px_rgba(255,255,255,0.4)] scale-110 z-20 bg-[#1a1a1a]' 
                      : 'border-white/10 hover:border-white/40'
                  }`}
                >
                  <div className={`absolute -top-3 -left-3 w-6 h-6 rounded-full bg-black border ${isActive ? 'border-gear-accent' : 'border-white/10'} flex items-center justify-center`}>
                    <span className="text-[8px] font-mono text-gray-500">{i + 1}</span>
                  </div>
                  <NodeIcon className={`w-8 h-8 transition-all ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono text-gray-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {link.model}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <main className="flex-1 flex flex-col min-h-0">
        {/* 3. MIDDLE-TIER: Technical Manifest */}
        <section className="h-[200px] bg-black/40 border-b border-white/5 overflow-y-auto shrink-0 scrollbar-thin">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 bg-[#050505] z-30 shadow-md">
              <tr className="border-b border-white/10">
                <th className="px-8 py-2 text-[10px] font-mono text-gray-600 uppercase tracking-widest w-24">Index</th>
                <th className="px-8 py-2 text-[10px] font-mono text-gray-600 uppercase tracking-widest w-[30%]">Hardware Model</th>
                <th className="px-8 py-2 text-[10px] font-mono text-gray-600 uppercase tracking-widest w-40">System Type</th>
                <th className="px-8 py-2 text-[10px] font-mono text-gray-600 uppercase tracking-widest italic">Live Status / Parameter Digest</th>
              </tr>
            </thead>
            <tbody>
              {result && result.signalChain.map((link, i) => (
                <tr 
                  key={`manifest-${link.id}`}
                  onClick={() => setActiveGearId(link.id)}
                  className={`group border-b border-white/[0.03] cursor-pointer transition-colors ${
                    (activeGearId === link.id || (!activeGearId && i === 0)) ? 'bg-gear-accent/[0.08]' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <td className="px-8 py-3 text-xs font-mono text-gray-600 tracking-tighter">0{i + 1} // AD_L</td>
                  <td className="px-8 py-3 font-display font-bold text-xs uppercase group-hover:text-gear-accent transition-colors tracking-tight">
                    {link.model}
                  </td>
                  <td className="px-8 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono border border-white/10 px-2 py-0.5 rounded text-gray-500 uppercase">
                        {link.type}
                      </span>
                      {i === 0 && <span className="w-1.5 h-1.5 bg-gear-accent rounded-full animate-pulse shadow-[0_0_5px_var(--color-gear-accent)]" />}
                    </div>
                  </td>
                  <td className="px-8 py-3 text-[10px] font-mono text-gray-500 tracking-tight truncate opacity-80 group-hover:opacity-100 italic">
                    {getSettingsString(link)}
                  </td>
                </tr>
              ))}
              {!result && (
                <tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-800 text-[10px] font-mono uppercase tracking-[0.5em]">
                    Rig architecture not initialized.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 4. BOTTOM-TIER: Gear Inspector */}
        <section className="flex-1 bg-[#080808] relative min-h-0 flex overflow-hidden">
          {/* Metadata Sidebar (Vertical Real Estate Utilization) */}
          <div className="w-[320px] border-r border-white/5 p-8 bg-black/20 overflow-y-auto shrink-0 scrollbar-hide">
             <div className="mb-10">
               <h3 className="text-[10px] font-mono text-gray-600 uppercase mb-4 tracking-[0.25em] flex items-center gap-2">
                 <Activity className="w-3.5 h-3.5 text-gear-accent" />
                 Rig Intelligence
               </h3>
               <div className="bg-white/[0.02] rounded-xl p-5 border border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-500 uppercase font-mono">Engine Version</span>
                    <span className="text-[9px] font-bold text-gear-accent font-mono">PRO_1.5</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-gray-500 uppercase font-mono">Confidence Level</span>
                      <span className="text-[9px] font-bold text-white font-mono">
                        {result ? (result.matchConfidence * 100).toFixed(0) : "0"}%
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gear-accent" 
                        initial={{ width: 0 }}
                        animate={{ width: result ? `${result.matchConfidence * 100}%` : 0 }}
                      />
                    </div>
                  </div>
                  <div className="h-px bg-white/5" />
                  <p className="text-[11px] text-gray-400 italic font-serif leading-relaxed line-clamp-6 opacity-70 hover:opacity-100 transition-opacity cursor-default">
                    {result?.explanation || "Awaiting source analysis for tone architectural generation."}
                  </p>
               </div>
             </div>

             <div className="space-y-8">
                <div>
                  <h4 className="text-[10px] font-mono text-gray-600 uppercase mb-3 tracking-widest flex items-center gap-2">
                    <Mic2 className="w-3 h-3" />
                     Reference Studio
                  </h4>
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragActive ? 'border-gear-accent bg-gear-accent/[0.03]' : 'border-white/5 hover:border-white/10 active:border-gear-accent/40'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 border border-white/10 group-hover:border-gear-accent/20">
                      <Upload className="w-4 h-4 text-gray-600" />
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight truncate max-w-[200px] mx-auto">
                      {audioFile ? audioFile.name : "Inject Raw Signal"}
                    </p>
                    <p className="text-[8px] text-gray-700 uppercase mt-2 font-mono">WAV / MP3 Supported</p>
                  </div>
                </div>

                {userPreset && (
                  <div className="pt-6 border-t border-white/5">
                    <h4 className="text-[10px] font-mono text-gray-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                       <ArrowRight className="w-3 h-3 text-gear-accent" />
                       Compare State
                    </h4>
                    <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/10 mb-2">
                      <p className="text-[10px] text-blue-400 font-bold uppercase truncate">Loaded: {userPreset.metadata.presetName}</p>
                    </div>
                    <button 
                      onClick={() => { setUserPreset(null); setDiffs([]); }}
                      className="text-[9px] text-gray-600 hover:text-red-400 transition-colors uppercase font-mono tracking-widest underline decoration-gray-800 underline-offset-4"
                    >
                      Clear Comparison
                    </button>
                  </div>
                )}
             </div>
          </div>

          {/* Large Focused Inspector View */}
          <div className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.03)_0%,transparent_70%)] relative">
             <div className="h-full flex items-center justify-center">
               <AnimatePresence mode="wait">
                 {activeGear ? (
                   <motion.div
                     key={activeGear.id}
                     initial={{ opacity: 0, scale: 0.97, y: 15 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.97, y: 15 }}
                     transition={{ duration: 0.3, ease: "easeOut" }}
                     className="w-full max-w-2xl px-12 pb-24"
                   >
                     <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-6">
                        <div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-800 font-mono text-3xl font-black">
                              0{(result?.signalChain.findIndex(i => i.id === activeGear.id) || 0) + 1}
                            </span>
                            <div>
                              <h2 className="text-3xl font-display font-bold text-white tracking-tighter uppercase mb-1">
                                {activeGear.model}
                              </h2>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono text-gear-accent/80 uppercase tracking-[0.2em] font-bold">Hardware Focus</span>
                                <div className="w-1 h-1 bg-white/20 rounded-full" />
                                <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest italic">{activeGear.type} // {activeGear.id.substring(0, 12)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                           <div className="flex flex-col items-end">
                              <span className="text-[9px] font-mono text-gray-700 uppercase leading-none mb-1.5 tracking-widest">Signal Unity</span>
                              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                 <motion.div 
                                    className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" 
                                    initial={{ width: 0 }}
                                    animate={{ width: "92%" }}
                                 />
                              </div>
                           </div>
                           <button onClick={copyManifestAsText} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-gear-accent/40 hover:bg-gear-accent/5 transition-all text-gray-500 hover:text-gear-accent">
                             {isCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                           </button>
                        </div>
                     </div>

                     <div className="scale-110 origin-top">
                        <GearCard link={activeGear} />
                     </div>
                   </motion.div>
                 ) : (
                   <div className="flex flex-col items-center justify-center text-center max-w-sm">
                     <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center mb-8 bg-black/40">
                        <Cpu className="w-10 h-10 text-gray-800 animate-pulse" />
                     </div>
                     <h3 className="text-gray-600 font-display font-bold text-xl uppercase tracking-widest mb-3">Modular Isolation</h3>
                     <p className="text-[10px] text-gray-700 uppercase leading-relaxed tracking-[0.25em] font-mono">Select a hardware node from the master signal ribbon above to initialize the gear inspector.</p>
                   </div>
                 )}
               </AnimatePresence>
             </div>
          </div>
        </section>
      </main>


      {/* FOOTER: System Status Bar */}
      <footer className="h-[35px] border-t border-white/10 shrink-0 bg-[#050505] flex items-center justify-between px-8 z-40">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#f59e0b] rounded-full shadow-[0_0_8px_#f59e0b]" />
            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Signal Connection: Secured</span>
          </div>
          <div className="w-px h-3 bg-white/5" />
          <div className="text-[9px] font-mono text-gray-700 uppercase tracking-tight flex items-center gap-2">
            <Activity className="w-3 h-3" />
            Core Clock: 128.00 BPM // Phase Locked
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-[9px] font-mono text-gray-800 uppercase tracking-[0.6em] font-bold">
            Tone Translator // Pro Edition 2026
          </div>
        </div>
      </footer>

      {/* Export Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsExportModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-gear-card border border-gear-accent/30 rounded-2xl p-8 w-full max-w-md shadow-[0_0_50px_rgba(255,165,0,0.15)]"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-gear-accent/20 rounded-lg flex items-center justify-center border border-gear-accent/30">
                  <Download className="text-gear-accent w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-white tracking-tight">Export Preset</h3>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Amplitube 5 (.at5p) Specification</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase mb-2 tracking-widest pl-1">Preset Filename</label>
                  <div className="relative">
                    <input 
                      autoFocus
                      type="text" 
                      value={exportFilename}
                      onChange={(e) => setExportFilename(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExport(exportFilename)}
                      className="w-full bg-gear-bg border border-gear-border rounded-xl px-4 py-3 text-sm focus:border-gear-accent focus:ring-1 focus:ring-gear-accent outline-none text-white font-mono"
                      placeholder="My_Awesome_Tone"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-600">.AT5P</span>
                  </div>
                </div>
                
                <div className="bg-gear-accent/5 rounded-lg p-3 border border-gear-accent/10">
                  <div className="flex gap-2">
                    <Info className="w-3 h-3 text-gear-accent shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] text-gear-accent/80 leading-relaxed italic">
                        { 'showSaveFilePicker' in window 
                          ? "Modern Browser Detected: The system will attempt to show a location picker." 
                          : "Legacy Browser: The file will save directly to your Downloads folder." }
                      </p>
                      <p className="text-[9px] text-gray-500 font-mono leading-tight">
                        PRO TIP: If the location picker doesn't appear, try opening this app in a <strong>New Tab</strong> to bypass iframe security.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-3 rounded-xl border border-gear-border text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleExport(exportFilename)}
                  className="px-4 py-3 rounded-xl bg-gear-accent text-black font-bold text-xs uppercase tracking-widest hover:bg-yellow-500 transition-colors shadow-lg shadow-gear-accent/20"
                >
                  Save Preset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

