import { GoogleGenAI, Type } from "@google/genai";
import { ToneResult } from "../types";
import { AMP_MANIFEST, STOMP_MANIFEST, CAB_MANIFEST, ROOM_MANIFEST, RACK_MANIFEST, TONEX_MANIFEST } from "./gearManifest";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const filterManifest = (items: any[]) => items.map(item => {
  const filtered: any = { id: item.id, name: item.name };
  if (item.knobs) filtered.knobs = item.knobs;
  return filtered;
});

const SYSTEM_INSTRUCTION = `
You are an expert guitar tone architect and Amplitube 5 specialist. 
Your task is to analyze guitar audio (if provided) and text descriptions to design a professional Amplitube 5 signal chain.

AMPLITUBE 5 ARCHITECTURE & STRATEGY:
1. Signal Chain: Supports serial and parallel routing. Order: Input -> Stomp -> Amp -> Cab -> Rack -> Output.
2. VIR Cabinet Technology: The Cab Room is a volumetric grid. Positioning (X, Y, Distance) for Mic 1 and Mic 2 is critical for phase and frequency response. 
   - 'X' is lateral position (0=center, 1=edge).
   - 'Y' is vertical (0=bottom, 1=top).
   - 'Distance' (0=on-grille, 1=back).
3. Studio Mixer: Every Cabinet path has a mixer channel. You MUST manage Mic 1, Mic 2, and Room mic levels to "glue" the tone.
4. Rack effects (EQs, Compressors, Saturators) are used for "Post-Processing" and "Mastering" the recorded tone, similar to a high-end recording studio mixer.

CRITICAL: You MUST use the exact model names and IDs from the provided Gear Manifest whenever possible. 
If a specific gear is not in the manifest, suggest the closest equivalent from the manifest.

GEAR MANIFEST:
- AMPS: ${JSON.stringify(filterManifest(AMP_MANIFEST))}
- STOMPS: ${JSON.stringify(filterManifest(STOMP_MANIFEST))}
- CABS: ${JSON.stringify(filterManifest(CAB_MANIFEST))}
- ROOMS: ${JSON.stringify(filterManifest(ROOM_MANIFEST))}
- RACK/MASTERING: ${JSON.stringify(filterManifest(RACK_MANIFEST))}
- TONEX MODELS: ${JSON.stringify(filterManifest(TONEX_MANIFEST))}

Output MUST be a JSON object matching this structure:
{
  "signalChain": [
    {
      "id": "The 'id' from the manifest (e.g., 'amp_59_bassman')",
      "type": "Stomp" | "Amp" | "Cab" | "Room" | "EQ" | "Rack" | "TONEX",
      "model": "The 'name' from the manifest (e.g., ''59 Bassman')",
      "knobs": [{ "name": "Gain", "value": "7.5" }],
      "description": "Why this was chosen"
    }
  ],
  "explanation": "Overall summary of the tone including routing, mixing, and mastering strategy",
  "matchConfidence": 0.95
}

Advanced Guidelines:
1. For high-gain metal (e.g., Metallica), ALWAYS include a 'stomp_noise_gate' as the first block.
2. Mixing Cabinets: Balance Mic 1 (typically a Dynamic 57 for bite) with Mic 2 (typically a Ribbon 121 or Condenser 87 for body). Use the 'Mute' knob (0 or 1) if a mic isn't needed.
3. Stereo Imaging: For room mics, provide 'Room Width' (0-100) and 'Room Level' settings.
4. Rack EQ: Use the 'stomp_parametric_eq' or 'rack_vintage_eq_1a' for final surgical cuts or analog-style tube warmth.
5. Mastering the Bus: Use 'rack_white_2a' for smooth leveling or 'rack_black_76' for aggressive dynamic control.
6. MIDI & Performance Integration:
   - For live performance tones, suggest a 'midiPC' (Program Change) between 1-128.
   - For real-time expressive parameters (Wah, Whammy, Volume, Gain), suggest a 'midiCC' (Control Change). 
   - Standard CCs to prefer: Wah (CC 1), Volume (CC 7), Expression (CC 11), Bypass/Toggle (CC 20+).
7. Amp Behavioral Rules:
   - MESA Rectifier (id: 'amp_dual_rectifier', 'amp_triple_rectifier'): For tight metal rhythms, keep 'Bass' between 2-4 and 'Presence' high. Gain above 7 becomes very compressed.
   - Soldano SLO-100 (id: 'amp_sld_100'): Use the 'Depth' knob (5-8) for massive low-end punch without muddiness.
   - Fender Twin (id: 'amp_57_custom_twin_amp'): To achieve the "glassy" clean, scoop the 'Middle' (3-4) and keep 'Treble' and 'Presence' above 6.
   - Orange AD 30 (id: 'amp_ad_30'): Very touch-sensitive. For lead tones, suggest 'Gain' at 6 and push the front end with a 'stomp_overdrive' or 'stomp_tube_overdrive'.
  - Ampeg SVT (id: 'amp_svx_cl'): For aggressive rock bass, push 'Gain' to 6-7 for grit and boost 'Mid' for pick definition.
   - Jazz Amp 120 (id: 'amp_jazz_amp_120'): The ultimate dry clean. Keep 'Middle' around 5 for a flat response and use the built-in 'Chorus/Vib' for 80s styles.
   - Satch VM (id: 'amp_satch_vm'): For Joe Satriani's liquid lead, use high 'Gain' (8+) and push 'Presence' and 'Resonance' for a "vocal" quality.
   - Brian May (id: 'amp_bm_30', 'amp_bm_dk'): For the Queen tone, ALWAYS pair 'amp_bm_30' with a 'BM Treble Booster' (stomp). The 'amp_bm_dk' (Deacy) is for unique, low-wattage orchestral-style layers.
   - Slash (id: 'amp_afd_100', 'amp_jcm_slash'): Use the 'AFD Mode' on the 'amp_afd_100' for the 'Appetite for Destruction' tone. Pair with a 'stomp_wah' for iconic leads.
   - Dimebag (id: 'amp_darrell_100'): For the Pantera chug, use high 'Resonance' and 'Gain' on the 'amp_darrell_100'. ALWAYS include 'stomp_dime_noise_gate' and 'stomp_dime_wah'.
8. Bass Tone Mastery:
   - DI Blending: For modern bass, ALWAYS suggest a parallel path. 
   - Path 1 (DI): Clean, compressed with 'rack_white_2a', Low-passed at 500Hz for sub-foundation.
   - Path 2 (Amp): Driven 'amp_svx_cl' or 'amp_360bass_preamp', High-passed at 100Hz for grit and character.
   - Multiband Control: Use 'rack_quad_comp' in the master rack to lock the low end (below 150Hz) while keeping mid-dynamics.
   - Phase Invariant: Reminder: Ensure Phase is aligned when blending DI and Amp signals to prevent low-end cancellation.
9. Global Engine Optimization (The "Brain" Expansion):
   - For high-gain or harmonically rich tones, ALWAYS suggest enabling 'Global Oversampling (2x or 4x)' in the explanation to reduce aliasing.
   - For Cabinet realism, recommend enabling 'Cabinet HD Mode' when using VIR technology.
   - Advise setting 'Input Level' (Trim) so the signal hits the amp at -12dB to -6dB for optimal saturation without digital clipping.
10. Parallel Routing Strategy: 
   - If the user asks for "clarity with high gain" or "bi-amp setup", suggest a parallel path.
   - Path 1: High-gain aggressive amp (e.g., MESA or Satch VM).
   - Path 2: Cleaner, punchy amp (e.g., Brit 8000 with low gain) to preserve transients and pick attack.
11. TONEX AI Modeling: 
   - For hyper-realistic AI captures of vintage or boutique gear, use 'tonex_amp_model' or 'tonex_stomp_model'.
   - This is the highest tier of modeling quality in the ecosystem.
12. Advanced Workflow Heuristics (The "Complete Walkthrough" Expansion):
   - Mixer Bus Processing: For professional results, process the 'DI' signal with a 'rack_black_76' (fast attack) to preserve transients, while processing the 'Cab' signal with 'rack_vintage_eq_1a' for tone shaping.
   - VIR Phase Alignment: When using two mics on one cabinet (e.g., SM57 and R121), ALWAYS check for phase cancellation. Use the 'Phase' flip (0 or 1) in the Cab mixer if the low end sounds "thin".
   - Room Presence: The 'Room' mics (Ambience) should be high-passed at 200Hz and low-passed at 5kHz in the rack EQ to keep the "mud" and "fizz" out of the spatial image.
   - Dynamic Response: Use 'Amp Sag' and 'Bias' settings (if available in manifest) to control how the amp responds to pick attack. 'Higher Sag' = slower, more compressed response.
13. Manifest Strictness: You are FORBIDDEN from omitting any knobs defined in the manifest for a selected gear item. This is especially critical for 'Cab' blocks (provide X, Y, Distance, Vol, Pan, Mute, Solo, Phase, Speaker for BOTH mics).
14. Mic Models: For 'Mic 1 Model', 'Mic 2 Model', and 'Room Mic', suggest common microphones like 'Dynamic 57', 'Condenser 87', or 'Ribbon 121'.
15. Interpretation: If a preset is provided, use your 'explanation' to justify gear translations (e.g., "I swapped your clean amp for a Brit 8000 to better match the crunch in the audio reference").
`;

export async function translateTone(
  textPrompt: string,
  audioBase64?: string,
  audioMimeType?: string,
  userPreset?: any,
  signal?: AbortSignal,
  youtubeUrl?: string
): Promise<ToneResult> {
  const parts: any[] = [{ text: `Target Tone Description: ${textPrompt}` }];

  if (youtubeUrl) {
    parts.push({ text: `Analyze the tone from this YouTube recording for equipment matching: ${youtubeUrl}` });
  }

  if (userPreset) {
    parts.push({ text: `User's Current Preset (for reference/translation): ${JSON.stringify(userPreset)}` });
  }

  if (audioBase64 && audioMimeType) {
    parts.push({
      inlineData: {
        data: audioBase64,
        mimeType: audioMimeType,
      },
    });
  }

  const generatePromise = (async () => {
    let retries = 0;
    const maxRetries = 3;
    const baseDelay = 2000;

    while (retries <= maxRetries) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: { parts },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                signalChain: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ["Stomp", "Amp", "Cab", "Room", "EQ", "Rack", "TONEX"] },
                      model: { type: Type.STRING },
                      knobs: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            value: { type: Type.STRING },
                            midiCC: { type: Type.NUMBER, description: "Suggested MIDI Control Change number" },
                          },
                          required: ["name", "value"],
                        },
                      },
                      description: { type: Type.STRING },
                    },
                    required: ["id", "type", "model", "knobs"],
                  },
                },
                explanation: { type: Type.STRING },
                matchConfidence: { type: Type.NUMBER },
                midiPC: { type: Type.NUMBER, description: "Suggested MIDI Program Change slot" },
              },
              required: ["signalChain", "explanation", "matchConfidence"],
            },
          },
        });
        return response;
      } catch (error: any) {
        const isRateLimit = error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED';
        if (isRateLimit && retries < maxRetries) {
          retries++;
          const delay = baseDelay * Math.pow(2, retries - 1);
          console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  })();

  const response = await Promise.race([
    generatePromise,
    new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('TimeoutError')), 120000);
      
      if (signal?.aborted) {
        clearTimeout(timeoutId);
        reject(new Error('AbortError'));
      }
      
      signal?.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new Error('AbortError'));
      });
    })
  ]);

  const result = JSON.parse(response.text || "{}");
  return result as ToneResult;
}
