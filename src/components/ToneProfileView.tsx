import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Layers, 
  Sliders, 
  ShieldAlert, 
  Compass, 
  Cpu, 
  Volume2, 
  Music, 
  User, 
  Calendar, 
  Workflow
} from 'lucide-react';
import { ToneProfileResult } from '../types';

interface ToneProfileViewProps {
  profileResult: ToneProfileResult;
  rawRequest: string;
}

export function ToneProfileView({ profileResult, rawRequest }: ToneProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');
  const [isCopied, setIsCopied] = useState(false);

  if (!profileResult || !profileResult.tone_profile) {
    return null;
  }

  const { tone_profile, initial_family_guidance, classification_reasoning, warnings } = profileResult;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(profileResult, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'rhythm': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'lead': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'bass': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'clean': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'acoustic_style': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getGainBadgeColor = (gain: string) => {
    switch (gain?.toLowerCase()) {
      case 'clean': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'edge': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'low': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'medium-low': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
      case 'medium-high': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'high': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="w-full bg-[#0a0f1d]/40 rounded-2xl border border-white/5 shadow-2xl p-6 space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gear-accent animate-pulse" />
            <h3 className="text-sm font-semibold text-white tracking-widest uppercase font-sans">
              TT Tone Profile Engine
            </h3>
            <span className="text-[8px] font-mono bg-gear-accent/10 text-gear-accent px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
              Phase 1 / Step 1
            </span>
          </div>
          <p className="text-[10px] text-gray-500 font-mono uppercase mt-1 tracking-wider">
            Pre-generation Taxonomical Classification and Heuristics
          </p>
        </div>

        {/* View Switch / Copy Actions */}
        <div className="flex items-center gap-2">
          <div className="bg-black/40 rounded-lg p-0.5 border border-white/5 flex">
            <button
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase transition-all ${
                activeTab === 'visual' 
                  ? 'bg-white/5 text-white font-bold' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Visual Analysis
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1 rounded text-[10px] font-mono uppercase transition-all ${
                activeTab === 'json' 
                  ? 'bg-white/5 text-white font-bold' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Raw Profile JSON
            </button>
          </div>

          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-mono text-gray-400 hover:text-white transition-all uppercase tracking-wider font-bold"
            title="Copy Tone Profile JSON to clipboard"
          >
            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {isCopied ? "COPIED" : "COPY JSON"}
          </button>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {warnings && warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider">Tone Profiler Warnings</h4>
            <ul className="list-disc list-inside text-[11px] text-amber-400/80 leading-relaxed space-y-0.5">
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'visual' ? (
        <div className="space-y-6">
          {/* Bento Grid: General Taxonomy Chips */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* SOURCE & INPUT */}
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-1.5">
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <Workflow className="w-2.5 h-2.5 text-gray-600" />
                Classification Source
              </span>
              <p className="text-white text-xs font-semibold capitalize">
                {tone_summary_format(tone_profile.source_type)}
              </p>
              <div className="text-[9px] text-gray-500 font-mono truncate hover:text-gray-400 cursor-help" title={rawRequest}>
                Req: &quot;{tone_profile.input_summary || rawRequest}&quot;
              </div>
            </div>

            {/* ARTIST & PLAYER & ALBUM */}
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-1.5">
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <User className="w-2.5 h-2.5 text-gray-600" />
                Artist / Player
              </span>
              <p className="text-white text-xs font-semibold">
                {tone_profile.artist || 'Unknown'} 
                {tone_profile.player && <span className="text-gray-400 font-normal"> ({tone_profile.player})</span>}
              </p>
              <p className="text-[9px] text-gray-500 font-mono truncate">
                Song: {tone_profile.song || 'N/A'} {tone_profile.album ? `| ${tone_profile.album}` : ''}
              </p>
            </div>

            {/* ERA & STYLE */}
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-1.5">
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5 text-gray-600" />
                Era &amp; Style
              </span>
              <p className="text-white text-xs font-semibold capitalize">
                {tone_profile.era || 'Vintage Match'}
              </p>
              <div className="flex flex-wrap gap-1">
                {tone_profile.style?.slice(0, 3).map((st, i) => (
                  <span key={i} className="text-[8px] font-mono bg-white/5 text-gray-300 px-1 py-0.5 rounded break-all">
                    {st}
                  </span>
                )) || <span className="text-[8px] text-gray-600 font-mono">Any</span>}
              </div>
            </div>

            {/* ROLE & CONFIDENCE */}
            <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-1.5">
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <Compass className="w-2.5 h-2.5 text-gray-600" />
                Role &amp; Confidence
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${getRoleBadgeColor(tone_profile.role)}`}>
                  {tone_profile.role || 'Unknown'}
                </span>
                <span className={`text-[8px] font-mono tracking-widest uppercase px-1 py-0.5 rounded ${
                  tone_profile.confidence === 'high' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                    : tone_profile.confidence === 'low'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/10'
                    : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/10'
                }`}>
                  {tone_profile.confidence}
                </span>
              </div>
              <div className="text-[9px] text-gray-600 font-mono uppercase tracking-widest">
                Width: {tone_profile.width || 'mono'}
              </div>
            </div>

          </div>

          {/* Sub Grid 2: Core Acoustic Characteristics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 rounded-2xl bg-[#090d16]/30 border border-white/5">
            <div>
              <h4 className="text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-gear-accent" />
                Gain Staging
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 uppercase font-mono tracking-wider">Gain:</span>
                  <span className={`font-mono font-bold uppercase ${getGainBadgeColor(tone_profile.gain_level)}`}>
                    {tone_profile.gain_level}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 uppercase font-mono tracking-wider">Distortion Model:</span>
                  <span className="text-gray-300 font-mono capitalize">{tone_profile.distortion_type?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 uppercase font-mono tracking-wider">Attack Profile:</span>
                  <span className="text-white font-mono capitalize">{tone_profile.attack}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                Acoustic Response
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 uppercase font-mono tracking-wider">Low End:</span>
                  <span className="text-gray-300 font-mono capitalize">{tone_profile.low_end}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 uppercase font-mono tracking-wider">Midrange:</span>
                  <span className="text-gray-300 font-mono capitalize">{tone_profile.midrange}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 uppercase font-mono tracking-wider">Highs:</span>
                  <span className="text-gray-300 font-mono capitalize">{tone_profile.highs}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-mono font-semibold text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Spacials &amp; Polish
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 uppercase font-mono tracking-wider">Dynamics:</span>
                  <span className="text-gray-300 font-mono capitalize">{tone_profile.dynamics?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 uppercase font-mono tracking-wider">Wet Effects Profile:</span>
                  <span className="text-gray-300 font-mono capitalize">{tone_profile.effects_profile}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 uppercase font-mono tracking-wider">Room Ambient Vibe:</span>
                  <span className="text-gray-300 font-mono capitalize">{tone_profile.room}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Hardware Likelihood Strategy Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LIKELY RULES */}
            <div className="p-5 rounded-2xl bg-emerald-500/[0.01] border border-emerald-500/10 hover:border-emerald-500/20 transition-all space-y-4">
              <h4 className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#10b981]" />
                Likely Hardware Families (High Priority)
              </h4>

              <div className="space-y-3 text-[11px]">
                <div>
                  <span className="text-gray-500 uppercase font-mono text-[9px] tracking-wider block mb-1">Amps Likely:</span>
                  <div className="flex flex-wrap gap-1">
                    {initial_family_guidance.amp_family_likely?.map((f, i) => (
                      <span key={i} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-sans font-medium">
                        {f}
                      </span>
                    )) || <span className="text-gray-600 italic">No specific families</span>}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 uppercase font-mono text-[9px] tracking-wider block mb-1">Speaker &amp; Cab Likely:</span>
                  <div className="flex flex-wrap gap-1">
                    {initial_family_guidance.cab_family_likely?.map((f, i) => (
                      <span key={i} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-sans font-medium">
                        {f}
                      </span>
                    ))}
                    {initial_family_guidance.speaker_family_likely?.map((f, i) => (
                      <span key={i} className="bg-teal-500/10 text-teal-300 border border-teal-500/10 px-2 py-0.5 rounded text-[10px] font-sans font-medium">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {initial_family_guidance.mic_strategy_likely && initial_family_guidance.mic_strategy_likely.length > 0 && (
                  <div>
                    <span className="text-gray-500 uppercase font-mono text-[9px] tracking-wider block mb-1">Microphone Strategy:</span>
                    <p className="text-gray-300 leading-normal bg-black/20 p-2 rounded border border-white/5 font-mono text-[10px]">
                      {initial_family_guidance.mic_strategy_likely.join(", ")}
                    </p>
                  </div>
                )}

                {initial_family_guidance.effects_likely && initial_family_guidance.effects_likely.length > 0 && (
                  <div>
                    <span className="text-gray-500 uppercase font-mono text-[9px] tracking-wider block mb-1">Effects Boosts:</span>
                    <div className="flex flex-wrap gap-1">
                      {initial_family_guidance.effects_likely.map((f, i) => (
                        <span key={i} className="bg-purple-500/15 text-purple-300 border border-purple-500/10 px-2 py-0.5 rounded text-[10px] font-sans font-medium">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AVOID RULES */}
            <div className="p-5 rounded-2xl bg-orange-500/[0.01] border border-orange-500/10 hover:border-orange-500/20 transition-all space-y-4">
              <h4 className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full shadow-[0_0_8px_#f97316]" />
                Heavy Negative Constraints (Avoid &amp; Penalize)
              </h4>

              <div className="space-y-3 text-[11px]">
                <div>
                  <span className="text-gray-500 uppercase font-mono text-[9px] tracking-wider block mb-1">Amps to Avoid (Keyword Penalizer):</span>
                  <div className="flex flex-wrap gap-1">
                    {initial_family_guidance.amp_family_avoid?.map((f, i) => (
                      <span key={i} className="bg-orange-500/10 text-orange-400 border border-orange-500/10 px-2 py-0.5 rounded text-[10px] font-sans font-medium">
                        {f}
                      </span>
                    )) || <span className="text-gray-600 italic">None</span>}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 uppercase font-mono text-[9px] tracking-wider block mb-1">Effects to Penalize / Avoid:</span>
                  <div className="flex flex-wrap gap-1">
                    {initial_family_guidance.effects_avoid?.map((f, i) => (
                      <span key={i} className="bg-amber-500/10 text-amber-500 border border-amber-500/10 px-2 py-0.5 rounded text-[10px] font-sans font-medium">
                        {f}
                      </span>
                    )) || <span className="text-gray-650 italic">None</span>}
                  </div>
                </div>

                <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-[10px] text-gray-400 leading-relaxed font-mono">
                  <span className="text-amber-500 font-bold block uppercase tracking-wider mb-1">Tone Defense Logic:</span>
                  Prevents the signal mapper from erroneously selecting gear based only on name overlaps (e.g. avoiding metal amps for raw vintage classic blues rhythm).
                </div>
              </div>
            </div>

          </div>

          {/* Classification Reasoning Block */}
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
            <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              Taxonomical Reasoning Log
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-gray-400 leading-relaxed font-sans">
              <div className="space-y-1 bg-black/10 p-3 rounded-lg border border-white/5">
                <span className="font-mono text-gray-500 uppercase text-[9px] tracking-wider font-bold block mb-1">Style Genre Mapping:</span>
                <p className="italic text-gray-300 leading-normal">{classification_reasoning.style_reasoning}</p>
              </div>

              <div className="space-y-1 bg-black/10 p-3 rounded-lg border border-white/5">
                <span className="font-mono text-gray-500 uppercase text-[9px] tracking-wider font-bold block mb-1">Era &amp; Recording Practice:</span>
                <p className="italic text-gray-300 leading-normal">{classification_reasoning.era_reasoning}</p>
              </div>

              <div className="space-y-1 bg-black/10 p-3 rounded-lg border border-white/5">
                <span className="font-mono text-gray-500 uppercase text-[9px] tracking-wider font-bold block mb-1">Guitar Role Calibration:</span>
                <p className="italic text-gray-300 leading-normal">{classification_reasoning.role_reasoning}</p>
              </div>

              <div className="space-y-1 bg-black/10 p-3 rounded-lg border border-white/5">
                <span className="font-mono text-gray-500 uppercase text-[9px] tracking-wider font-bold block mb-1">Gain &amp; Overdrive Saturation:</span>
                <p className="italic text-gray-300 leading-normal">{classification_reasoning.gain_reasoning}</p>
              </div>

              <div className="space-y-1 bg-black/10 p-3 rounded-lg border border-white/5 md:col-span-2">
                <span className="font-mono text-gray-500 uppercase text-[9px] tracking-wider font-bold block mb-1">Hardware &amp; Cabinet Coupling Strategy:</span>
                <p className="italic text-gray-300 leading-normal">{classification_reasoning.family_reasoning || 'Calibrated based on style matching and structural constraints.'}</p>
              </div>
            </div>
          </div>

          {/* Workflow 2 Audio Placeholders Info Banner */}
          <div className="text-[9px] font-mono text-gray-600 border-t border-white/5 pt-4 uppercase flex justify-between tracking-wider">
            <span>Workflow 2 isolated-audio state: Placeholders Armed</span>
            <span>Spectral Analyzer: Standby</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
            <span>PRE-GEN LEARNING PROFILE ENGINE DEBUG JSON</span>
            <span>FORMAT: application/json</span>
          </div>
          <pre style={{ color: "#22d3ee", fontSize: "11px" }} className="bg-black/85 p-6 rounded-2xl border border-white/5 font-mono overflow-auto max-h-[500px] leading-relaxed shadow-xl">
            {JSON.stringify(profileResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function tone_summary_format(type: string): string {
  if (type === 'text') return 'Workflow 1 — Descriptive Text Analysis';
  if (type === 'audio') return 'Workflow 2 — Future Audio Signal Input';
  if (type === 'text_plus_audio') return 'Hybrid Target Matching (Text + Audio)';
  if (type === 'learning_card') return 'Tone Learning Engine Active Reference Card';
  return type || 'Heuristic Translation';
}
