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

export interface ToneResult {
  signalChain: GearLink[];
  explanation: string;
  technicalTips?: string[];
  matchConfidence: number;
  midiPC?: number; // Suggested MIDI Program Change number for this preset
  topology?: 'Serial' | 'AB Parallel' | 'DI Blend';
}
