import { ToneResult, GearLink } from "../types";

/**
 * AmpliTube 5 .at5p Exporter
 * Note: This is a best-effort XML generation based on standard AT5 preset structures.
 * The internal ID mapping for IK Multimedia gear is proprietary, so this 
 * provides a structural template for the signal chain.
 */

const generateXML = (result: ToneResult): string => {
  const { signalChain } = result;
  
  // Basic XML structure
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<AmpliTube5Preset version="5.0.0" name="${result.explanation.substring(0, 30)}">\n`;
  xml += `  <Details>\n`;
  xml += `    <Explanation>${result.explanation}</Explanation>\n`;
  xml += `    <MatchConfidence>${result.matchConfidence}</MatchConfidence>\n`;
  xml += `  </Details>\n`;
  
  xml += `  <SignalChain>\n`;
  signalChain.forEach((gear, index) => {
    xml += `    <Node index="${index}" type="${gear.type}" modelId="${gear.id}" modelName="${gear.model}">\n`;
    xml += `      <Parameters>\n`;
    gear.knobs.forEach(knob => {
      xml += `        <Parameter name="${knob.name}" value="${knob.value}" />\n`;
    });
    xml += `      </Parameters>\n`;
    xml += `    </Node>\n`;
  });
  xml += `  </SignalChain>\n`;
  
  xml += `</AmpliTube5Preset>`;
  
  return xml;
};

export const exportAt5p = (result: ToneResult) => {
  const xmlContent = generateXML(result);
  const blob = new Blob([xmlContent], { type: "text/xml" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `${result.explanation.substring(0, 20).replace(/\s+/g, '_')}.at5p`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
