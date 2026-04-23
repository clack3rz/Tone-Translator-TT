import { ToneResult, GearLink } from "../types";
import { AMP_MANIFEST, STOMP_MANIFEST, CAB_MANIFEST, RACK_MANIFEST, TONEX_MANIFEST, GearItem } from "./gearManifest";

const EMPTY_SLOT_GUID = "773b8ea7-b54a-4a3c-99df-ffbbf6d29271";

const ALL_GEAR: GearItem[] = [
  ...AMP_MANIFEST,
  ...STOMP_MANIFEST,
  ...CAB_MANIFEST,
  ...RACK_MANIFEST,
  ...TONEX_MANIFEST
];

const findGear = (id: string) => ALL_GEAR.find(g => g.id === id);

const generateUUID = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
};

const generateXML = (result: ToneResult): string => {
  const { signalChain } = result;
  
  const stomps = signalChain.filter(g => g.type === 'Stomp');
  const amps = signalChain.filter(g => g.type === 'Amp');
  const cab = signalChain.find(g => g.type === 'Cab');
  const racks = signalChain.filter(g => g.type === 'Rack' || g.type === 'EQ');
  const room = signalChain.find(g => g.type === 'Room');

  const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&"']/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&apos;';
        default: return c;
      }
    });
  };

  const fmt = (val: string | number) => {
    const n = parseFloat(String(val));
    return isNaN(n) ? String(val) : n.toString();
  };

  const getKnobVal = (gear: GearLink | undefined, name: string, fallback: string = "0") => {
    if (!gear) return fallback;
    const v = gear.knobs.find(k => k.name.toLowerCase().includes(name.toLowerCase()))?.value || fallback;
    return fmt(v);
  };

  const getMicId = (name: string) => {
    const n = String(name).toLowerCase();
    if (n.includes('57')) return "1e41acc4-85af-4e84-bee4-eabc0be5fef1";
    if (n.includes('87')) return "9e444286-cab4-46a4-bfa3-a6d55b3ffcfb";
    if (n.includes('121')) return "a2434286-cab4-46a4-bfa3-a6d55b3ffcfb";
    return "1e41acc4-85af-4e84-bee4-eabc0be5fef1"; // Default to 57
  };

  // Build the XML with Absolute Structural Parity (~11KB Template)
  const lines: string[] = [
    '<?xml version="1.0" ?>',
    `<Preset Version="2" Format="at5p" GUID="${generateUUID()}" PresetBPM="120" ProgramChange="${result.midiPC || -1}">`,
    '    <Chain Preset="Chain11" DIBeforeAmp="0" />',
    '    <Input Input="1" />',
    '    <Tuner Bypass="1" Mute="0" OutputVolume="1" TunerType="354eca51-457a-41b7-917d-ce6117586905">',
    '        <Tuner Reference="440" NoteReferemce="A" Transpose="0" Temperament="Equal" />',
    '    </Tuner>'
  ];

  // Constants for safe defaults
  const EMPTY_AMP_GUID = "8fe96936-5178-4950-9b80-d89c32534bad"; // Default to JCM800 as "empty" amp placeholder
  const EMPTY_CAB_GUID = "7c0b8ce1-cbb4-4e5b-9973-a572143ddb2b"; // Default to Brit 8000 as "empty" cab placeholder

  // Helper for empty stomp paths
  const emptyStompList = (count: number) => {
    let s: string[] = [];
    for(let i=0; i<count; i++) s.push(`        <Slot${i} />`);
    return s.join("\r\n");
  };
  const emptyStompAttrs = (count: number) => {
    let s = [];
    for(let i=0; i<count; i++) s.push(`Stomp${i}="${EMPTY_SLOT_GUID}"`);
    return s.join(" ");
  };

  // --- STOMP SECTIONS ---
  const stompA1Attrs = [0,1,2,3,4,5].map(i => {
    const s = stomps[i];
    const gear = s ? findGear(s.id) : null;
    return `Stomp${i}="${gear?.realId || EMPTY_SLOT_GUID}"`;
  }).join(" ");
  
  lines.push(`    <StompA1 Bypass="0" Mute="0" OutputVolume="1" ${stompA1Attrs}>`);
  for(let i=0; i<6; i++) {
    const s = stomps[i];
    if (s) lines.push(`        <Slot${i} Bypass="0" FullScreen="0" ${s.knobs.map(k => `${k.name.replace(/\s+/g, '')}="${fmt(k.value)}"`).join(' ')} />`);
    else lines.push(`        <Slot${i} />`);
  }
  lines.push(`    </StompA1>`);

  lines.push(`    <StompA2 Bypass="0" Mute="0" OutputVolume="1" ${emptyStompAttrs(6)}>\r\n${emptyStompList(6)}\r\n    </StompA2>`);
  lines.push(`    <StompStereo Bypass="0" Mute="0" OutputVolume="1" ${emptyStompAttrs(3)}>\r\n${emptyStompList(3)}\r\n    </StompStereo>`);
  
  lines.push(`    <StompB1 Bypass="0" Mute="0" OutputVolume="1" ${emptyStompAttrs(6)}>\r\n${emptyStompList(6)}\r\n    </StompB1>`);
  lines.push(`    <StompB2 Bypass="0" Mute="0" OutputVolume="1" ${emptyStompAttrs(6)}>\r\n${emptyStompList(6)}\r\n    </StompB2>`);
  lines.push(`    <StompB3 Bypass="0" Mute="0" OutputVolume="1" ${emptyStompAttrs(6)}>\r\n${emptyStompList(6)}\r\n    </StompB3>`);

  // --- AMP SECTIONS ---
  const ampSections = [['A', amps[0]], ['B', amps[1]], ['C', amps[2]]] as const;
  for (const [key, amp] of ampSections) {
    if (amp) {
      const gear = findGear(amp.id);
      const suffix = gear?.paramSuffix || "";
      const sensitivity = amp.id.includes('8000') ? 'Sensitivity_JCM800AT4="1" ' : '';
      lines.push(`    <Amp${key} Bypass="0" Mute="0" OutputVolume="1" Model="${gear?.realId || amp.id}">`);
      lines.push(`        <Amp ${sensitivity}${amp.knobs.map(k => `${k.name.replace(/\s+/g, '')}${suffix}="${fmt(k.value)}"`).join(' ')} />`);
      lines.push(`    </Amp${key}>`);
    } else {
      const ampDefaultParams = 'Sensitivity_JCM800AT4="1" Presence_JCM800AT4="5" Bass_JCM800AT4="4" Middle_JCM800AT4="5" Treble_JCM800AT4="6" Master_JCM800AT4="5.5" PreAmp_JCM800AT4="5"';
      lines.push(`    <Amp${key} Bypass="0" Mute="0" OutputVolume="1" Model="${EMPTY_AMP_GUID}">`);
      lines.push(`        <Amp ${ampDefaultParams} />`);
      lines.push(`    </Amp${key}>`);
    }
  }

  lines.push(`    <LoopFxA Bypass="0" Mute="0" OutputVolume="1" ${emptyStompAttrs(4)}>\r\n${emptyStompList(4)}\r\n    </LoopFxA>`);
  lines.push(`    <LoopFxB Bypass="0" Mute="0" OutputVolume="1" ${emptyStompAttrs(4)}>\r\n${emptyStompList(4)}\r\n    </LoopFxB>`);
  lines.push(`    <LoopFxC Bypass="0" Mute="0" OutputVolume="1" ${emptyStompAttrs(4)}>\r\n${emptyStompList(4)}\r\n    </LoopFxC>`);

  // --- CAB SECTIONS ---
  const speaker0 = "e372dd04b11d49588c290fbe341e97ca"; 
  const roomGear = room ? findGear(room.id) : null;
  const cabGear = cab ? findGear(cab.id) : null;

  if (cab) {
    lines.push(`    <CabA Bypass="0" Mute="0" CabModel="${cabGear?.realId || cab.id}" SpeakerModel0="${speaker0}" SpeakerModel1="${speaker0}" SpeakerModel2="${speaker0}" SpeakerModel3="${speaker0}" IRDecimation="1">`);
    const cabAttrs = [
      `HighLevel="0.77"`, `RoomType="${roomGear?.name || 'Large Studio'}"`, `RoomMicType="Condenser 87"`,
      `Mic0Model="${getMicId(String(getKnobVal(cab, 'Mic 1 Model')))}"`, `Mic1Model="${getMicId(String(getKnobVal(cab, 'Mic 2 Model')))}"`,
      `Mic0Angle="0"`, `Mic1Angle="0"`, `Mic0XAxis="${getKnobVal(cab, 'Mic 1 X')}"`, `Mic1XAxis="${getKnobVal(cab, 'Mic 2 X')}"`,
      `Mic0YAxis="${getKnobVal(cab, 'Mic 1 Y')}"`, `Mic1YAxis="${getKnobVal(cab, 'Mic 2 Y')}"`, `Mic0Distance="${getKnobVal(cab, 'Mic 1 Distance')}"`,
      `Mic1Distance="${getKnobVal(cab, 'Mic 2 Distance')}"`, `Mic0Speaker="0"`, `Mic1Speaker="1"`, `GUILoadComplete="0"`
    ].join(" ");
    lines.push(`        <Cab ${cabAttrs} />`);
    lines.push(`    </CabA>`);
  } else {
    lines.push(`    <CabA Bypass="0" Mute="0" CabModel="${EMPTY_CAB_GUID}" SpeakerModel0="${speaker0}" SpeakerModel1="${speaker0}" SpeakerModel2="${speaker0}" SpeakerModel3="${speaker0}" IRDecimation="1">`);
    lines.push(`        <Cab />`);
    lines.push(`    </CabA>`);
  }
  
  const cabBData = `<Cab HighLevel="0.77" RoomType="Large Studio" RoomMicType="Condenser 87" Mic0Model="1e41acc4-85af-4e84-bee4-eabc0be5fef1" Mic1Model="9e444286-cab4-46a4-bfa3-a6d55b3ffcfb" Mic0Angle="0" Mic1Angle="0" Mic0XAxis="0" Mic1XAxis="0.16" Mic0YAxis="0" Mic1YAxis="0.41" Mic0Distance="0" Mic1Distance="0.13" Mic0Speaker="0" Mic1Speaker="1" GUILoadComplete="0" />`;
  lines.push(`    <CabB Bypass="0" Mute="0" CabModel="${EMPTY_CAB_GUID}" SpeakerModel0="942153d281fb4b089fc20e07a34e9ca7" SpeakerModel1="942153d281fb4b089fc20e07a34e9ca7" SpeakerModel2="942153d281fb4b089fc20e07a34e9ca7" SpeakerModel3="942153d281fb4b089fc20e07a34e9ca7" IRDecimation="1">`);
  lines.push(`        ${cabBData}`);
  lines.push(`    </CabB>`);
  lines.push(`    <CabC Bypass="0" Mute="0" CabModel="${EMPTY_CAB_GUID}" SpeakerModel0="942153d281fb4b089fc20e07a34e9ca7" SpeakerModel1="942153d281fb4b089fc20e07a34e9ca7" SpeakerModel2="942153d281fb4b089fc20e07a34e9ca7" SpeakerModel3="942153d281fb4b089fc20e07a34e9ca7" IRDecimation="1">`);
  lines.push(`        ${cabBData}`);
  lines.push(`    </CabC>`);

  // --- STUDIO MIXER ---
  const studioAttrs = [
    `Bypass="0"`, `Mute="0"`, `OutputVolume="1"`, `OutputPan="0.5"`, `DI_Level="-3"`, `DI_Pan="0.5"`, `DI_Mute="1"`, `DI_Solo="0"`, `DI_Phase="0"`, `DI_PhaseDelay="0"`,
    `Cab1_Mic1_Level="0"`, `Cab1_Mic1_Pan="0"`, `Cab1_Mic1_Mute="0"`, `Cab1_Mic1_Solo="0"`, `Cab1_Mic1_Phase="0"`,
    `Cab1_Mic2_Level="-8"`, `Cab1_Mic2_Pan="0"`, `Cab1_Mic2_Mute="0"`, `Cab1_Mic2_Solo="0"`, `Cab1_Mic2_Phase="0"`,
    `Cab1_Room_Level="-18"`, `Cab1_Room_Width="50"`, `Cab1_Room_Mute="0"`, `Cab1_Room_Solo="0"`, `Cab1_Room_Phase="0"`,
    `Cab1_Bus_Level="0"`, `Cab1_Bus_Pan="0.5"`, `Cab1_Bus_Mute="0"`, `Cab1_Bus_Solo="0"`, `Cab1_Bus_Phase="0"`,
    `Cab2_Mic1_Level="-6"`, `Cab2_Mic1_Pan="0"`, `Cab2_Mic1_Mute="0"`, `Cab2_Mic1_Solo="0"`, `Cab2_Mic1_Phase="0"`, `Cab2_Mic2_Level="-6"`, `Cab2_Mic2_Pan="0"`, `Cab2_Mic2_Mute="0"`, `Cab2_Mic2_Solo="0"`, `Cab2_Mic2_Phase="0"`, `Cab2_Room_Level="-40"`, `Cab2_Room_Width="50"`, `Cab2_Room_Mute="0"`, `Cab2_Room_Solo="0"`, `Cab2_Room_Phase="0"`, `Cab2_Bus_Level="-6"`, `Cab2_Bus_Pan="1"`, `Cab2_Bus_Mute="0"`, `Cab2_Bus_Solo="0"`, `Cab2_Bus_Phase="0"`,
    `Cab3_Mic1_Level="-6"`, `Cab3_Mic1_Pan="0"`, `Cab3_Mic1_Mute="0"`, `Cab3_Mic1_Solo="0"`, `Cab3_Mic1_Phase="0"`, `Cab3_Mic2_Level="-6"`, `Cab3_Mic2_Pan="0"`, `Cab3_Mic2_Mute="0"`, `Cab3_Mic2_Solo="0"`, `Cab3_Mic2_Phase="0"`, `Cab3_Room_Level="-40"`, `Cab3_Room_Width="50"`, `Cab3_Room_Mute="0"`, `Cab3_Room_Solo="0"`, `Cab3_Room_Phase="0"`, `Cab3_Bus_Level="-6"`, `Cab3_Bus_Pan="0"`, `Cab3_Bus_Mute="0"`, `Cab3_Bus_Solo="0"`, `Cab3_Bus_Phase="0"`,
    `Cab1_Leslie_Horn_Level="0"`, `Cab1_Leslie_Horn_Width="100"`, `Cab1_Leslie_Horn_Mute="0"`, `Cab1_Leslie_Horn_Solo="0"`, `Cab1_Leslie_Horn_Phase="0"`, `Cab1_Leslie_Drum_Level="0"`, `Cab1_Leslie_Drum_Width="100"`, `Cab1_Leslie_Drum_Mute="0"`, `Cab1_Leslie_Drum_Solo="0"`, `Cab1_Leslie_Drum_Phase="0"`,
    `Cab2_Leslie_Horn_Level="0"`, `Cab2_Leslie_Horn_Width="100"`, `Cab2_Leslie_Horn_Mute="0"`, `Cab2_Leslie_Horn_Solo="0"`, `Cab2_Leslie_Horn_Phase="0"`, `Cab2_Leslie_Drum_Level="0"`, `Cab2_Leslie_Drum_Width="100"`, `Cab2_Leslie_Drum_Mute="0"`, `Cab2_Leslie_Drum_Solo="0"`, `Cab2_Leslie_Drum_Phase="0"`,
    `Cab3_Leslie_Horn_Level="0"`, `Cab3_Leslie_Horn_Width="100"`, `Cab3_Leslie_Horn_Mute="0"`, `Cab3_Leslie_Horn_Solo="0"`, `Cab3_Leslie_Horn_Phase="0"`, `Cab3_Leslie_Drum_Level="0"`, `Cab3_Leslie_Drum_Width="100"`, `Cab3_Leslie_Drum_Mute="0"`, `Cab3_Leslie_Drum_Solo="0"`, `Cab3_Leslie_Drum_Phase="0"`
  ].join(" ");
  lines.push(`    <Studio ${studioAttrs} />`);

  // --- RACKS ---
  const rack0Gear = racks[0] ? findGear(racks[0].id) : null;
  const rack1Gear = racks[1] ? findGear(racks[1].id) : null;
  lines.push(`    <RackA Bypass="0" Mute="0" OutputVolume="1" Stomp0="${rack0Gear?.realId || EMPTY_SLOT_GUID}" Stomp1="${rack1Gear?.realId || EMPTY_SLOT_GUID}">`);
  for(let i=0; i<2; i++) {
    const r = racks[i];
    if (r) lines.push(`        <Slot${i} Bypass="0" FullScreen="0" ${r.knobs.map(k => `${k.name.replace(/\s+/g, '')}="${fmt(k.value)}"`).join(' ')} />`);
    else lines.push(`        <Slot${i} />`);
  }
  lines.push(`    </RackA>`);
  lines.push(`    <RackB Bypass="0" Mute="0" OutputVolume="1" Stomp0="${EMPTY_SLOT_GUID}" Stomp1="${EMPTY_SLOT_GUID}">\r\n        <Slot0 />\r\n        <Slot1 />\r\n    </RackB>`);
  lines.push(`    <RackC Bypass="0" Mute="0" OutputVolume="1" Stomp0="${EMPTY_SLOT_GUID}" Stomp1="${EMPTY_SLOT_GUID}">\r\n        <Slot0 />\r\n        <Slot1 />\r\n    </RackC>`);
  lines.push(`    <RackDI Bypass="0" Mute="0" OutputVolume="1" Stomp0="${EMPTY_SLOT_GUID}" Stomp1="${EMPTY_SLOT_GUID}">\r\n        <Slot0 />\r\n        <Slot1 />\r\n    </RackDI>`);
  lines.push(`    <RackMaster Bypass="0" Mute="0" OutputVolume="1" ${emptyStompAttrs(6)}>\r\n${emptyStompList(6)}\r\n    </RackMaster>`);

  lines.push(`    <Output Output="1" />`);
  lines.push(`    <MidiAssignments />`);
  lines.push(`    <MetaInfo Description="" Style="Metal" SoundCharacter="None" Instrument="None" Body="Solid Body" PickUpPosition="Bridge" Artist="" Band="" Song="" Album="" SongStructureElement="None" KeyWords="" Type="Electric Guitar" />`);
  lines.push(`</Preset>`);
  
  return lines.join('\r\n');
};

export const getExportData = (result: ToneResult): Uint8Array => {
  const xmlContent = generateXML(result);
  const encoder = new TextEncoder();
  return encoder.encode(xmlContent);
};

export const exportAt5p = (result: ToneResult) => {
  const combinedData = getExportData(result);
  const blob = new Blob([combinedData], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  const safeName = (result.explanation.split(' ')[0] || "Preset").replace(/[^a-z0-9]/gi, '_');
  link.download = `${safeName}_${generateUUID().substring(0, 8)}.at5p`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
