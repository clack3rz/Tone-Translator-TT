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
import { exportAt5p } from './services/presetExporter';
import { GearSilhouette } from './components/GearSilhouette';
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
  const [error, setError] = useState<string | null>(null);
  const [userPreset, setUserPreset] = useState<PresetData | null>(null);
  const [diffs, setDiffs] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);

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

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      <header className="mb-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gear-accent rounded-lg flex items-center justify-center shadow-lg shadow-gear-accent/20">
            <Guitar className="text-black w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Tone Translator</h1>
            <p className="text-gray-400 text-sm">Amplitube 5 Preset Architect</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gear-card border border-gear-border rounded-full text-xs font-mono text-gray-400">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          ENGINE READY: GEMINI 1.5 PRO
        </div>
      </header>

      <main className="grid lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gear-card border border-gear-border rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-gear-accent" />
              Input Source
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase mb-2">Description / Master Ref</label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Early 80's Metallica, high gain, tight low end..."
                  className="w-full bg-gear-bg border border-gear-border rounded-xl p-4 text-sm focus:border-gear-accent focus:ring-1 focus:ring-gear-accent outline-none transition-all min-h-[100px] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-500 uppercase mb-2">YouTube Reference (Optional)</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-gear-bg border border-gear-border rounded-xl pl-10 pr-4 py-3 text-xs focus:border-gear-accent focus:ring-1 focus:ring-gear-accent outline-none transition-all"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Activity className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </div>

              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragActive ? 'border-gear-accent bg-gear-accent/5' : 'border-gear-border hover:border-gray-600'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                {audioFile ? (
                  <div className="text-sm text-gear-accent font-medium truncate">
                    {audioFile.name}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Drop isolated guitar audio or click to browse
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="w-full bg-gear-accent hover:bg-yellow-500 text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-gear-accent/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      ANALYZING TONE...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      TRANSLATE TONE
                    </>
                  )}
                </button>

                {isTranslating && (
                  <button 
                    onClick={handleCancel}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-mono text-[10px] py-2 rounded-lg transition-all border border-red-500/30 uppercase tracking-widest"
                  >
                    Abort Analysis
                  </button>
                )}
              </div>
              <div className="bg-gear-bg/30 border border-gear-border/50 rounded-xl p-4 mt-6">
                <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  Pro Tips
                </h4>
                <ul className="text-[10px] text-gray-500 space-y-2 list-disc pl-4">
                  <li>Use isolated guitar tracks for best results.</li>
                  <li>Enable "Oversampling" for high-gain chugs to reduce aliasing.</li>
                  <li>Aim for -12dB to -6dB on your interface for the best tube-sag response.</li>
                  <li>Check "Cabinet HD Mode" for the full VIR detail.</li>
                </ul>
              </div>

              <div className="mt-8 pt-8 border-t border-gear-border">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-gear-accent" />
                  Compare with Preset
                </h3>
                <div 
                  {...getPresetRootProps()} 
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isPresetDragActive ? 'border-gear-accent bg-gear-accent/5' : 'border-gear-border hover:border-gray-600'
                  }`}
                >
                  <input {...getPresetInputProps()} />
                  <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                  {userPreset ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-xs text-gear-accent font-medium truncate w-full">
                        {userPreset.metadata.presetName}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserPreset(null);
                          setDiffs([]);
                        }}
                        className="text-[10px] text-gray-500 hover:text-red-400 underline transition-colors"
                      >
                        Remove Preset
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500">
                      Drop .at5p file to compare
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Output Section */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div 
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="bg-gear-card border border-gear-border rounded-2xl p-6 relative overflow-hidden">
                  {/* High Visibility Export Header */}
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-gear-border/50">
                    <div>
                      <h2 className="text-2xl font-display font-bold text-white tracking-tight uppercase">Architectural Result</h2>
                      <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-widest">Confidence Index: <span className="text-white font-bold">{(result.matchConfidence * 100).toFixed(0)}%</span> // V1.5_PRO</p>
                    </div>
                    <button 
                      onClick={() => exportAt5p(result)}
                      className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-gear-accent text-black font-bold text-xs tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(59,130,245,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                    >
                      <Download className="w-4 h-4" />
                      EXPORT ENTIRE RIG (.AT5P)
                    </button>
                  </div>

                  {/* Hero Signal Chain View */}
                  <div className="mb-10 relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gear-accent/20 to-transparent -translate-y-1/2 pointer-events-none" />
                    <div className="relative flex items-center gap-2 overflow-x-auto pb-8 scrollbar-hide">
                      {result.signalChain.map((link, i) => (
                        <React.Fragment key={`chain-${link.id}`}>
                          <GearCard link={link} />
                          {i < result.signalChain.length - 1 && <SignalConnector />}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-gear-card to-transparent pointer-events-none" />
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="glass-panel p-6">
                      <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                        <Activity className="w-3 h-3 text-gear-accent" />
                        Technical Summary
                      </h4>
                      <div className="space-y-4">
                        <p className="text-sm text-gray-300 leading-relaxed font-sans italic quote">
                          "{result.explanation}"
                        </p>
                        
                        {userPreset && diffs.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-white/5">
                            <h5 className="text-[9px] text-gray-600 uppercase mb-3">Comparison Deltas</h5>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 scrollbar-thin">
                              {diffs.map((diff, i) => (
                                <div key={i} className="flex gap-2 text-[10px] leading-tight border-b border-white/5 pb-2 last:border-0">
                                  <span className="text-gear-accent font-bold">{diff.split(':')[0]}:</span>
                                  <span className="text-gray-400">{diff.split(':').slice(1).join(':')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="glass-panel p-6">
                      <h4 className="text-[10px] font-mono text-gray-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                        <Settings2 className="w-3 h-3 text-gear-accent" />
                        Routing Logic
                      </h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 border-b border-gear-border/30 pb-2">
                          <span>PARALLEL PATHS</span>
                          <span className="text-gear-accent">DETECTED: {result.signalChain.some(l => l.type === 'TONEX' || l.type === 'Rack') ? 'YES' : 'NO'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 border-b border-gear-border/30 pb-2">
                          <span>PHASE ALIGNMENT</span>
                          <span className="text-green-500">LOCKED</span>
                        </div>
                        {result.midiPC !== undefined && (
                          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                            <span>MASTER MIDI PC</span>
                            <span className="text-indigo-400 font-bold">{String(result.midiPC).padStart(3, '0')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Reference Manifest (Non-Graphical) */}
                  <div className="mt-8 glass-panel p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Sliders className="w-3 h-3 text-gear-accent" />
                        Quick Reference Manifest
                      </h4>
                      <button 
                        onClick={copyManifestAsText}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 text-[10px] font-bold tracking-widest ${
                          isCopied 
                            ? 'bg-green-500/10 border-green-500/50 text-green-500' 
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {isCopied ? 'COPIED' : 'COPY TEXT'}
                      </button>
                    </div>
                    <div className="space-y-6">
                      {result.signalChain.map((link, idx) => {
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
                        const identity = getGearIdentity(link.id);

                        return (
                          <div key={`ref-${idx}`} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-white uppercase tracking-tight">
                                  {idx + 1}. {link.model}
                                </span>
                                {identity && (
                                  <span className="text-[8px] text-gear-accent/80 font-mono italic">
                                    MODEL: {identity}
                                  </span>
                                )}
                              </div>
                              <span className="text-[8px] font-mono text-gray-600 uppercase border border-gray-800 px-1.5 py-0.5 rounded leading-none">
                                {link.type} // {link.id}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1">
                              {link.knobs.map((knob, kIdx) => {
                                const knobDef = gearInfo?.knobs?.find((def: any) => 
                                  typeof def === 'object' && def.name.toLowerCase() === knob.name.toLowerCase()
                                ) as KnobDefinition | undefined;
                                const unit = knobDef?.unit || "";

                                return (
                                  <div key={kIdx} className="flex items-center justify-between border-b border-white/[0.02] py-0.5">
                                    <span className="text-[9px] text-gray-500 font-mono uppercase truncate max-w-[80px]">{knob.name}</span>
                                    <span className="text-[9px] text-white font-mono font-bold">
                                      {knob.value}{!String(knob.value).includes(unit) && unit}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[400px] border-2 border-dashed border-gear-border rounded-2xl flex flex-col items-center justify-center text-gray-600 p-12 text-center"
              >
                <Settings2 className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-xl font-display font-bold mb-2">Ready for Analysis</h3>
                <p className="text-sm max-w-md">
                  Upload an audio file or describe the tone you want to achieve. 
                  Gemini will architect the perfect Amplitube 5 signal chain for you.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="mt-12 pt-8 border-t border-gear-border text-center text-gray-600 text-[10px] uppercase tracking-widest">
        Tone Translator &copy; 2026 // Powered by Google Gemini 1.5 Pro // Optimized for Amplitube 5
      </footer>
    </div>
  );
}

