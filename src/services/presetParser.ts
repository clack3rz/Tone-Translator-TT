
import { XMLParser } from "fast-xml-parser";

export interface PresetData {
  metadata: {
    source: string;
    presetName: string;
    genre?: string;
  };
  signalChain: any[];
}

export function parseAt5p(xmlContent: string): PresetData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
  });
  const jsonObj = parser.parse(xmlContent);
  const root = jsonObj.Preset;

  if (!root) {
    throw new Error("Invalid Amplitube 5 preset file (Missing Preset root)");
  }

  const signalChain: any[] = [];

  // 1. Stomps (StompB1)
  const stompB1 = root.StompB1;
  if (stompB1) {
    // Noise Gate
    if (stompB1.Slot0 && stompB1.Slot0.Threshold !== undefined) {
      signalChain.push({
        type: "Stomp",
        model: "Noise Gate",
        knobs: [
          { name: "Threshold", value: stompB1.Slot0.Threshold },
          { name: "Release", value: stompB1.Slot0.Release },
          { name: "Depth", value: stompB1.Slot0.Depth },
        ],
      });
    }
    // Overdrive
    if (stompB1.Slot1 && stompB1.Slot1.Drive !== undefined) {
      signalChain.push({
        type: "Stomp",
        model: "Overdrive",
        knobs: [
          { name: "Drive", value: stompB1.Slot1.Drive },
          { name: "Tone", value: stompB1.Slot1.Tone },
          { name: "Level", value: stompB1.Slot1.Level },
        ],
      });
    }
  }

  // 2. Amp (AmpA)
  const ampA = root.AmpA;
  if (ampA && ampA.Amp) {
    const ampParams = ampA.Amp;
    const keys = Object.keys(ampParams).filter(k => k.includes("_"));
    
    // Dynamically extract model name from keys like "Gain_BritishTubeLead1"
    let detectedModel = "Unknown Amp";
    if (keys.length > 0) {
      const parts = keys[0].split("_");
      if (parts.length > 1) detectedModel = parts[1].replace(/([A-Z])/g, ' $1').trim();
    }

    signalChain.push({
      type: "Amp",
      model: detectedModel,
      knobs: keys.map(k => ({ 
        name: k.split("_")[0], 
        value: ampParams[k] 
      })),
    });
  }

  // 3. Cab (CabA)
  const cabA = root.CabA;
  if (cabA) {
    const cabKnobs: any[] = [];
    if (cabA.Cab) {
      if (cabA.Cab.Mic1Level !== undefined) cabKnobs.push({ name: "Mic 1", value: cabA.Cab.Mic1Level });
      if (cabA.Cab.Mic2Level !== undefined) cabKnobs.push({ name: "Mic 2", value: cabA.Cab.Mic2Level });
    }

    signalChain.push({
      type: "Cab",
      model: "4x12 Brit 8000", // Simplified mapping for demo
      knobs: cabKnobs,
    });
    
    // 4. Room (Inside CabA)
    if (cabA.Cab && cabA.Cab.RoomType) {
      signalChain.push({
        type: "Room",
        model: cabA.Cab.RoomType,
        knobs: [
          { name: "High Level", value: cabA.Cab.HighLevel }
        ],
      });
    }
  }

  // 5. EQ (RackA)
  const rackA = root.RackA;
  if (rackA && rackA.Slot0 && rackA.Slot0.Freq1 !== undefined) {
    signalChain.push({
      type: "EQ",
      model: "Parametric EQ",
      knobs: [
        { name: "Freq1", value: rackA.Slot0.Freq1 },
        { name: "Gain1", value: rackA.Slot0.Gain1 },
      ],
    });
  }

  return {
    metadata: {
      source: "at5p",
      presetName: root.GUID || "Unknown Preset",
      genre: root.MetaInfo?.Style,
    },
    signalChain,
  };
}

export function comparePresets(aiResult: any, userPreset: PresetData) {
  const diffs: string[] = [];
  
  const aiChain = aiResult.signalChain;
  const userChain = userPreset.signalChain;

  // Helper to find blocks by type
  const getBlocksByType = (chain: any[], type: string) => chain.filter(b => b.type === type);

  const types = ["Stomp", "Amp", "Cab", "Room", "EQ"];

  types.forEach(type => {
    const aiBlocks = getBlocksByType(aiChain, type);
    const userBlocks = getBlocksByType(userChain, type);

    if (aiBlocks.length !== userBlocks.length) {
      diffs.push(`${type} count mismatch: AI suggested ${aiBlocks.length}, Preset has ${userBlocks.length}.`);
    }

    // Compare models for each block of this type
    const maxLen = Math.max(aiBlocks.length, userBlocks.length);
    for (let i = 0; i < maxLen; i++) {
      const aiB = aiBlocks[i];
      const userB = userBlocks[i];
      
      if (aiB && userB) {
        const isExactMatch = aiB.model.toLowerCase() === userB.model.toLowerCase();
        // Simple fuzzy check for "translations" (e.g., Brit 8000 vs JCM 800)
        const isTranslation = !isExactMatch && (
          aiB.model.toLowerCase().includes(userB.model.toLowerCase().substring(0, 4)) ||
          userB.model.toLowerCase().includes(aiB.model.toLowerCase().substring(0, 4))
        );

        if (!isExactMatch && !isTranslation) {
          diffs.push(`${type} mismatch: AI suggested "${aiB.model}", Preset has "${userB.model}".`);
        } else if (isTranslation) {
          diffs.push(`${type} translation: AI chose "${aiB.model}" as an alternative to "${userB.model}".`);
        }

        // Compare knobs if models are at least a translation
        if (isExactMatch || isTranslation) {
          aiB.knobs.forEach((aiKnob: any) => {
            const userKnob = userB.knobs.find((uk: any) => uk.name.toLowerCase() === aiKnob.name.toLowerCase());
            if (userKnob) {
              const aiVal = parseFloat(aiKnob.value);
              const userVal = parseFloat(userKnob.value);
              if (!isNaN(aiVal) && !isNaN(userVal) && Math.abs(aiVal - userVal) > 1.0) {
                diffs.push(`${aiB.model} ${aiKnob.name} delta: AI suggested ${aiVal}, Preset has ${userVal.toFixed(1)}.`);
              }
            }
          });
        }
      } else if (aiB && !userB) {
        diffs.push(`Extra ${type} in AI suggestion: "${aiB.model}"`);
      } else if (!aiB && userB) {
        diffs.push(`Missing ${type} in AI suggestion: "${userB.model}"`);
      }
    }
  });

  return diffs;
}
