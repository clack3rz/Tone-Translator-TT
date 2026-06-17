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
  role: "rhythm" | "lead" | "clean" | "acoustic_style" | "bass" | "mixed" | "unknown" | string;
  gain_level: "clean" | "edge" | "low" | "medium-low" | "medium" | "medium-high" | "high" | "unknown" | string;
  distortion_type: "clean" | "edge_of_breakup" | "crunch" | "overdrive" | "saturated" | "fuzz" | "unknown" | string;
  low_end: "loose" | "controlled" | "tight" | "boomy" | "unknown" | string;
  midrange: "scooped" | "neutral" | "forward" | "aggressive" | "unknown" | string;
  highs: "dark" | "smooth" | "bright" | "harsh" | "unknown" | string;
  attack: "soft" | "balanced" | "sharp" | "unknown" | string;
  dynamics: "dynamic" | "slightly_compressed" | "compressed" | "unknown" | string;
  effects_profile: "none" | "minimal" | "moderate" | "heavy" | "unknown" | string;
  room: "dry" | "small" | "medium" | "large" | "unknown" | string;
  width: "mono" | "narrow" | "double_tracked" | "wide" | "unknown" | string;
  production_style: "raw" | "polished" | "live" | "studio" | "unknown" | string;
  confidence: "low" | "medium" | "high" | string;
  
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

export interface RackDecision {
  status: "required" | "recommended" | "optional" | "not_needed" | string;
  selected_gear: string | null;
  reason: string;
  eq_intent: string[];
  why_omitted?: string;
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
  tone_adjustment_intent?: Record<string, string>;
  rack_decision?: RackDecision;
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

// Gear Profile Types
export interface GearProfileParameter {
  displayName: string;
  canonicalName: string;
  aliases: string[];
  visual: {
    min: number;
    max: number;
    unit: string;
  };
  export: {
    name: string;
    min: number;
    max: number;
  };
  conversion: {
    mode: string;
    formula: string;
  };
  defaultValue?: string | number;
  validationStatus: 'PASS' | 'WARN' | 'PARTIAL' | 'CHECK' | 'FAIL' | 'UNKNOWN';
}

export interface GearProfile {
  id: string;
  displayName: string;
  type: string; // stomp, amp, cab, speaker, mic, rack, room, tonex, etc.
  guid: string;
  slot: string;
  aliases: string[];
  parameters: GearProfileParameter[];
  discovery?: {
    importHistory?: string[];
    isDraft?: boolean;
    detectedAt?: string;
  };
  validation: {
    status: 'PASS' | 'WARN' | 'PARTIAL' | 'CHECK' | 'FAIL' | 'UNKNOWN';
    gaps: string[];
    reason?: string;
  };
  rawSources: {
    catalog?: AT5CatalogItem;
    mappings?: ParameterMapping[];
    verified?: any;
    verifiedProtocol?: any;
  };
}

export interface MicPlacementMapping {
  id?: string;
  gear: string; // e.g. "4x12 Brit 8000"
  friendly_setting: string; // "Mic_1_Placement" | "Mic_2_Placement"
  target?: string; // Alias for friendly_setting
  mic_slot?: string;
  friendly_value: string; // e.g. "Cap Edge"
  friendly_name?: string; // Alias for friendly_value
  friendly_placement?: string;
  friendly_distance?: string;
  maps_to: Record<string, string | number>;
  xml_values?: Record<string, string | number>; // Alias for maps_to
  status: "validated" | "estimated" | "discovered";
  validation_status?: string; // Alias for status
  source?: string;
  updatedAt?: any;
  updatedBy?: string;
}


