export interface Knob {
  name: string;
  value: number | string; // 0-10 or specific setting
  midiCC?: number; // Suggested MIDI Control Change number
}

export interface GearLink {
  id: string;
  type: 'Stomp' | 'Amp' | 'Cab' | 'Room' | 'EQ' | 'Rack' | 'TONEX';
  model: string;
  knobs: Knob[];
  description?: string;
}

export interface ToneSummary {
  style: string;
  gain_level: 'low' | 'medium' | 'medium-high' | 'high';
  noise_level: 'low' | 'moderate' | 'high';
}

export interface SignalChainElement {
  type: 'pedal' | 'amp' | 'cab' | 'rack';
  name: string;
  settings: Record<string, string | number>;
}

export interface EngineeringNotes {
  gain_strategy: string;
  noise_control: string;
  eq_strategy: string;
  amplifier_debug?: string;
}

export interface ToneProfile {
  source_type: "text" | "audio" | "text_plus_audio" | "learning_card";
  input_summary: string;
  artist: string;
  song: string;
  album: string;
  player: string;
  era: string;
  style: string[];
  role: "rhythm" | "lead" | "clean" | "acoustic_style" | "bass" | "mixed" | "unknown";
  gain_level: "clean" | "edge" | "low" | "medium-low" | "medium" | "medium-high" | "high" | "unknown";
  distortion_type: "clean" | "edge_of_breakup" | "crunch" | "overdrive" | "saturated" | "fuzz" | "unknown";
  low_end: "loose" | "controlled" | "tight" | "boomy" | "unknown";
  midrange: "scooped" | "neutral" | "forward" | "aggressive" | "unknown";
  highs: "dark" | "smooth" | "bright" | "harsh" | "unknown";
  attack: "soft" | "balanced" | "sharp" | "unknown";
  dynamics: "dynamic" | "slightly_compressed" | "compressed" | "unknown";
  effects_profile: "none" | "minimal" | "moderate" | "heavy" | "unknown";
  room: "dry" | "small" | "medium" | "large" | "unknown";
  width: "mono" | "narrow" | "double_tracked" | "wide" | "unknown";
  production_style: "raw" | "polished" | "live" | "studio" | "unknown";
  confidence: "low" | "medium" | "high";
  
  // Future Audio-derived placeholder fields (to be populated later via isolated audio feature extraction)
  spectral_centroid?: number;         // perceived brightness
  low_end_tightness?: number;         // low-end tight vs. loose tracking
  midrange_emphasis?: number;         // midrange scoop or mid-forward frequency emphasis
  gain_saturation_estimate?: number;  // gain distortion level
  dynamic_range_estimate?: number;   // dynamic range compression level
  transient_attack_estimate?: number; // pick attack transient sharpness
  reverb_room_estimate?: number;      // ambient room contribution
  width_estimate?: number;            // stereo width tracking
  noise_fizz_estimate?: number;       // background hum or crossover distortion noise
}

export interface InitialFamilyGuidance {
  amp_family_likely: string[];
  amp_family_avoid: string[];
  cab_family_likely: string[];
  speaker_family_likely: string[];
  mic_strategy_likely: string[];
  effects_likely: string[];
  effects_avoid: string[];
}

export interface ClassificationReasoning {
  style_reasoning: string;
  era_reasoning: string;
  role_reasoning: string;
  gain_reasoning: string;
  effects_reasoning: string;
  family_reasoning: string;
}

export interface ToneProfileResult {
  tone_profile: ToneProfile;
  initial_family_guidance: InitialFamilyGuidance;
  classification_reasoning: ClassificationReasoning;
  warnings: string[];
}

export interface ToneResult {
  tone_summary: ToneSummary;
  signal_chain: SignalChainElement[];
  engineering_notes: EngineeringNotes;
  confidence: number;
  midiPC?: number;
  
  // Legacy fields for backward compatibility during transition if needed
  // but we will primarily use the above
  signalChain?: GearLink[]; 
  tone_profile_result?: ToneProfileResult;
}

export type AT5GearGroup =
  | "amp"
  | "cab"
  | "stomp"
  | "rack"
  | "room"
  | "tonex"
  | string;

export interface KnobMember {
  name: string;
  type: "range" | "switch" | "selector";
  min?: number;
  max?: number;
  options?: string[];
  default?: number | string;
  unit?: string;
}

export interface AT5CatalogItem {
  group: AT5GearGroup;
  guid: string;
  slot: string;
  displayName: string;
  otherNames?: string[];
  usedInPresets?: number;
  examplePresets?: string[];
  knobs?: KnobMember[]; 
  paramSuffix?: string;
  isDbRecord?: boolean; // New flag
}

export interface ParameterMapping {
  id?: string; // combination of gearName and parameter / ID
  gearName: string;
  parameter: string;
  visualMin: number;
  visualMax: number;
  visualUnit: string;
  exportMin: number;
  exportMax: number;
  exportParameterName: string;
  conversion: "direct" | "db_to_linear" | "linear_to_db" | "scaled_range" | "enum" | "boolean" | "unknown";
  formula?: string;
  updatedAt?: any;
  updatedBy?: string;
}
