import { IKMPAKCandidate, GearProfile } from '../types';

export function normalizeName(name: any): string {
  if (!name) return "";
  return name.toString().toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

export function normalizeGuid(guid: any): string {
  if (!guid) return "";
  const str = guid.toString().toLowerCase().trim();
  if (str.startsWith("gear-") || str.startsWith("name-") || str.startsWith("name_") || str === "none") return "";
  return str.replace(/[^a-z0-9]/g, "").trim();
}

/**
 * Infer candidate gear type from raw pakCategory.
 */
export function inferCandidateGearType(pakCategory: string): IKMPAKCandidate['candidateGearType'] {
  const norm = (pakCategory || "").toLowerCase().trim();
  if (norm.includes("stomp") || norm.includes("pedal") || norm.includes("stompbox")) return "stomp";
  if (norm.includes("rack")) return "rack";
  if (norm.includes("amp") || norm.includes("amplifier") || norm.includes("head") || norm.includes("preamp")) return "amp";
  if (norm.includes("cab") || norm.includes("cabinet")) return "cab";
  if (norm.includes("roommic") || norm.includes("room mic") || norm.includes("room_mic")) return "roomMic";
  if (norm.includes("mic") || norm.includes("microphone")) return "mic";
  if (norm.includes("room")) return "room";
  if (norm.includes("speaker") || norm.includes("cone")) return "speaker";
  return "stomp"; // default fallback
}

/**
 * Helper to determine if a candidate alias/keyword is safe to promote as direct alias.
 * Refuse generic aliases globally.
 */
const GENERIC_KEYWORDS = [
  "graphic eq",
  "compressor",
  "delay",
  "reverb",
  "metal amp",
  "british cab",
  "eq",
  "distortion",
  "overdrive",
  "fuzz",
  "graphic",
  "amp",
  "cab",
  "stomp",
  "rack",
  "metal",
  "british",
  "vintage",
  "lead",
  "clean",
  "crunch"
];

export function evaluateAliasSafety(alias: any): { safe: boolean; reason: string } {
  const clean = (alias || "").toString().toLowerCase().trim();
  if (clean.length <= 2) {
    return { safe: false, reason: "Too short" };
  }
  if (GENERIC_KEYWORDS.includes(clean)) {
    return { safe: false, reason: `Generic term '${alias}' must not become automated alias without individual review` };
  }
  return { safe: true, reason: "Specific model/brand identifier" };
}

/**
 * Enforcement: stomp to stomp, rack to rack, amp to amp, cab to cab
 */
export function isSlotTypeValid(gearType: any, slotName: any): boolean {
  const type = (gearType || "").toString().toLowerCase().trim();
  const slot = (slotName || "").toString().toLowerCase().trim();
  
  if (type === "stomp" || type === "pedal") {
    return slot.includes("stomp") || slot.includes("slot");
  }
  if (type === "rack") {
    return slot.includes("rack");
  }
  if (type === "amp") {
    return slot.includes("amp") || slot.includes("amplifier");
  }
  if (type === "cab" || type === "cabinet") {
    return slot.includes("cab") || slot.includes("cabinet");
  }
  return true;
}

/**
 * Specific contextual resolver for "Graphic EQ".
 */
export interface ContextualResolverResult {
  allowedProfiles: string[];
  status: 'valid' | 'ambiguous_context_required';
  error?: string;
}

export function resolveGraphicEQContext(context?: any): ContextualResolverResult {
  if (!context) {
    return {
      allowedProfiles: [],
      status: 'ambiguous_context_required',
      error: 'Ambiguous context: unknown context for "Graphic EQ". Please specify post_amp_eq/rack_eq/etc. or pre_amp_eq/stomp_eq/etc.'
    };
  }

  const normalizedContext = context.toString().toLowerCase().trim();

  const stompContexts = [
    'pre_amp_eq',
    'stomp_eq',
    'front_of_amp_eq',
    'pre_amp_stomp_eq'
  ];

  const rackContexts = [
    'post_amp_eq',
    'rack_eq',
    'final_shaping_eq',
    'post_amp_rack_eq'
  ];

  if (stompContexts.includes(normalizedContext)) {
    return {
      allowedProfiles: [
        "7 Band Graphic",
        "10 Band Graphic",
        "6 Band EQ",
        "Pre EQ 3"
      ],
      status: 'valid'
    };
  }

  if (rackContexts.includes(normalizedContext)) {
    return {
      allowedProfiles: [
        "EQ PG",
        "Graphic EQ", // verified rack Graphic EQ
        "Parametric EQ",
        "Parametric EQ 3"
      ],
      status: 'valid'
    };
  }

  return {
    allowedProfiles: [],
    status: 'ambiguous_context_required',
    error: `Ambiguous context: unmatched context '${context}' for "Graphic EQ".`
  };
}

/**
 * Compare an IKMPAK Candidate against existing profiles and assign evaluation statuses.
 */
export interface SuggestedAliasDetails {
  alias: string;
  normalized: string;
  status: 'new_safe_alias' | 'already_on_this_profile' | 'conflicts_with_other_profile' | 'ignored_for_this_profile' | 'too_generic_blocked' | 'accepted_previously';
  conflictProfileName?: string;
  safetyReason?: string;
}

export function normalizeAliasComparison(val: any): string {
  if (!val) return "";
  return val.toString().toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

/**
 * Compare an IKMPAK Candidate against existing profiles and assign evaluation statuses.
 */
export function evaluateCandidate(candidate: IKMPAKCandidate, profiles: GearProfile[]): {
  statuses: string[]; // for backward compat/display info
  matchedProfileId: string | null;
  suggestedAliases: string[];
  alertLevel: 'info' | 'warning' | 'error' | 'success';
  discoveryStatus: string;
  aliasClassifications: SuggestedAliasDetails[];
} {
  let matchedProfile: GearProfile | null = null;
  
  const candGuid = normalizeGuid(candidate.guid);
  const candName = (candidate.name || "").toString().toLowerCase().trim();
  const candNormName = normalizeName(candidate.name);
  const candType = candidate.candidateGearType;
  
  // 1. Try matching by GUID
  matchedProfile = profiles.find(p => checkProfileMatch(candidate, p)) || null;
  
  const rawPotentialAliases: string[] = [];
  const addPotential = (str: string | undefined | null) => {
    if (!str) return;
    const cleanStr = str.trim();
    if (cleanStr && !rawPotentialAliases.includes(cleanStr)) {
      rawPotentialAliases.push(cleanStr);
    }
  };

  if (candidate.keywords) {
    candidate.keywords.forEach(kw => addPotential(kw));
  }
  addPotential(candidate.shortName);
  addPotential(candidate.shortName2);

  // Classify each raw potential alias
  const aliasClassifications: SuggestedAliasDetails[] = rawPotentialAliases.map((rawAlias): SuggestedAliasDetails => {
    const norm = normalizeAliasComparison(rawAlias);
    const safety = evaluateAliasSafety(rawAlias);
    const isGeneric = !safety.safe;

    // Is it already on the matched profile?
    const isAlreadyOnProfile = (() => {
      if (!matchedProfile) return false;
      if (normalizeAliasComparison(matchedProfile.displayName) === norm) return true;
      if ((matchedProfile.aliases || []).some(a => normalizeAliasComparison(a) === norm)) return true;
      if (normalizeAliasComparison((matchedProfile as any).shortName) === norm) return true;
      const mpKeywords = (matchedProfile as any).keywords;
      if (Array.isArray(mpKeywords) && mpKeywords.some((k: any) => normalizeAliasComparison(k) === norm)) return true;
      return false;
    })();

    // Is it ignored/rejected for this profile?
    const isIgnored = (() => {
      if (!matchedProfile) return false;
      if (matchedProfile.ignoredAliasSuggestions) {
        return matchedProfile.ignoredAliasSuggestions.some(ignored =>
          normalizeAliasComparison(ignored.alias) === norm ||
          normalizeAliasComparison(ignored.normalizedAlias) === norm
        );
      }
      return false;
    })();

    // Does it conflict with another profile?
    let conflictProfName: string | undefined;
    const conflictProfile = profiles.find(p => {
      if (matchedProfile && p.id === matchedProfile.id) return false;
      if (normalizeAliasComparison(p.displayName) === norm) return true;
      if ((p.aliases || []).some(a => normalizeAliasComparison(a) === norm)) return true;
      return false;
    });

    if (conflictProfile) {
      conflictProfName = conflictProfile.displayName;
    }

    let status: SuggestedAliasDetails['status'];
    if (isAlreadyOnProfile) {
      status = 'already_on_this_profile';
    } else if (isIgnored) {
      status = 'ignored_for_this_profile';
    } else if (isGeneric) {
      status = 'too_generic_blocked';
    } else if (conflictProfile) {
      status = 'conflicts_with_other_profile';
    } else {
      status = 'new_safe_alias';
    }

    return {
      alias: rawAlias,
      normalized: norm,
      status,
      conflictProfileName: conflictProfName,
      safetyReason: safety.safe ? undefined : safety.reason
    };
  });

  // Only suggest actionable/active aliases
  const suggestedAliases = aliasClassifications
    .filter(ac => ac.status === 'new_safe_alias' || ac.status === 'conflicts_with_other_profile')
    .map(ac => ac.alias);

  let discoveryStatus = "new_candidate";
  const statusDetails: string[] = [];

  if (candidate.discoveryStatus === "rejected") {
    discoveryStatus = "rejected";
    statusDetails.push("Rejected");
  } else if (candidate.discoveryStatus === "promoted_unverified") {
    discoveryStatus = "promoted_unverified";
    statusDetails.push("Promoted unverified");
  } else if (matchedProfile) {
    // Determine specific matching problems
    const pType = (matchedProfile.type || "").toString().toLowerCase().trim();
    const cType = (candType as string) === "pedal" ? "stomp" : candType;
    const isTypeMismatch = pType !== cType;
    
    const pGuid = normalizeGuid(matchedProfile.guid);
    const isGuidMismatch = candGuid && pGuid && pGuid !== candGuid;

    // An unresolved active alias collision only occurs if there is at least one active suggested alias that conflicts with another profile
    const conflictsAlias = aliasClassifications.some(ac => ac.status === 'conflicts_with_other_profile');

    const isPossibleDuplicate = (matchedProfile.displayName || "").toString().toLowerCase().trim() !== candName && normalizeName(matchedProfile.displayName) === candNormName;
    
    // Assigning statuses in decreasing order of checklist priority
    if (isGuidMismatch) {
      discoveryStatus = "guid_mismatch";
      statusDetails.push("GUID mismatch");
    } else if (isTypeMismatch) {
      discoveryStatus = "type_mismatch";
      statusDetails.push("Type mismatch");
    } else if (conflictsAlias) {
      discoveryStatus = "alias_collision";
      statusDetails.push("Alias collision");
    } else if (isPossibleDuplicate) {
      discoveryStatus = "possible_duplicate";
      statusDetails.push("Possible duplicate");
    } else if (matchedProfile.validation.status !== 'PASS') {
      discoveryStatus = "needs_at5p_validation";
      statusDetails.push("Needs .at5p validation");
    } else {
      discoveryStatus = "existing_match";
      statusDetails.push("Existing gear match");
    }
  } else {
    // If no match found, check other criteria
    if (!candidate.keywords || candidate.keywords.length === 0) {
      discoveryStatus = "missing_keywords";
      statusDetails.push("Missing keywords");
    } else if (!candidate.collectionTags || candidate.collectionTags.length === 0) {
      discoveryStatus = "missing_collection_tags";
      statusDetails.push("Missing collection tags");
    } else {
      discoveryStatus = "new_candidate";
      statusDetails.push("New candidate");
    }
  }

  // Determine priority color level for UI
  let alertLevel: 'info' | 'warning' | 'error' | 'success' = 'info';
  if (discoveryStatus === "type_mismatch" || discoveryStatus === "guid_mismatch" || discoveryStatus === "alias_collision") {
    alertLevel = 'error';
  } else if (discoveryStatus === "possible_duplicate" || discoveryStatus === "needs_at5p_validation" || discoveryStatus.startsWith("missing_")) {
    alertLevel = 'warning';
  } else if (discoveryStatus === "existing_match" || discoveryStatus === "promoted_unverified") {
    alertLevel = 'success';
  }

  return {
    statuses: statusDetails.length > 0 ? statusDetails : [discoveryStatus],
    matchedProfileId: matchedProfile ? matchedProfile.id : null,
    suggestedAliases,
    alertLevel,
    discoveryStatus,
    aliasClassifications
  };
}

/**
 * Handle direct CSV line splitting and parsing.
 */
export function parseCSV(text: string, importBatchId?: string): IKMPAKCandidate[] {
  const batchId = importBatchId || `batch-${Date.now()}`;
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];
  
  const headers = lines[0].replace(/^"|"$/g, "").split(",").map(h => h.trim().toLowerCase());
  const list: IKMPAKCandidate[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let u = 0; u < line.length; u++) {
      const char = line[u];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    values.push(cur.trim());
    
    const row: any = {};
    headers.forEach((header, idx) => {
      let rawVal = values[idx] || "";
      rawVal = rawVal.replace(/^"|"$/g, "").trim();
      row[header] = rawVal;
    });
    
    let kws: string[] = [];
    if (row.keywords) {
      kws = row.keywords.split(";").map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      if (kws.length === 1 && row.keywords.includes(",")) {
        kws = row.keywords.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      }
    }
    
    let tags: string[] = [];
    const rawTags = row.collectiontags || row.collection_tags || row.collection || row.tags || "";
    if (rawTags) {
      tags = rawTags.split(/[;,]/).map((t: string) => t.trim()).filter((t: string) => t.length > 0);
    }
    
    if (row.name) {
      const pakCat = row.pakcategory || row.pak_category || row.category || "Stomps";
      const gearType = inferCandidateGearType(pakCat);
      const nameStr = row.name;
      const guidStr = row.guid || row.guid_candidate || "";
      
      const indexVal = i;
      list.push({
        id: row.id || guidStr || `cand-${gearType}-${normalizeName(nameStr)}`,
        source: "ikmpak",
        importBatchId: batchId,
        pakCategory: pakCat,
        candidateGearType: gearType,
        name: nameStr,
        normalizedName: normalizeName(nameStr),
        guid: guidStr,
        shortName: row.shortname || row.short_name || "",
        shortName2: row.shortname2 || row.short_name_2 || "",
        keywords: kws,
        collectionTags: tags,
        manufacturerHints: row.manufacturerhints || row.manufacturer_hints || row.manufacturer || "",
        realWorldHints: row.realworldhints || row.real_world_hints || row.hints || "",
        matchedGearProfileId: null,
        discoveryStatus: "new_candidate",
        validationStatus: "discovered_unverified",
        notes: row.notes || row.promotion_notes || "",
        importIndex: indexVal
      });
    }
  }
  return list;
}

/**
 * Parsing for JSON arrays
 */
export function parseJSON(text: string, importBatchId?: string): IKMPAKCandidate[] {
  const batchId = importBatchId || `batch-${Date.now()}`;
  try {
    const raw = JSON.parse(text);
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map((row: any, idx: number) => {
      const pakCat = row.pakCategory || row.pak_category || row.category || "Stomps";
      const gearType = inferCandidateGearType(pakCat);
      const nameStr = row.name || "Unnamed Candidate";
      const guidStr = row.guid || row.guid_candidate || "";
      
      let kws: string[] = [];
      if (Array.isArray(row.keywords)) {
        kws = row.keywords;
      } else if (typeof row.keywords === "string") {
        kws = row.keywords.split(/[,;]/).map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      }
      
      let tags: string[] = [];
      if (Array.isArray(row.collectionTags)) {
        tags = row.collectionTags;
      } else if (Array.isArray(row.collection_tags)) {
        tags = row.collection_tags;
      } else if (typeof row.collectionTags === "string") {
        tags = row.collectionTags.split(/[;,]/).map((t: string) => t.trim()).filter((t: string) => t.length > 0);
      } else if (typeof row.collection === "string") {
        tags = row.collection.split(/[;,]/).map((t: string) => t.trim()).filter((t: string) => t.length > 0);
      }
      
      return {
        id: row.id || guidStr || `cand-${gearType}-${normalizeName(nameStr)}`,
        source: "ikmpak",
        importBatchId: batchId,
        pakCategory: pakCat,
        candidateGearType: gearType,
        name: nameStr,
        normalizedName: normalizeName(nameStr),
        guid: guidStr,
        shortName: row.shortName || row.short_name || "",
        shortName2: row.shortName2 || row.short_name_2 || "",
        keywords: kws,
        collectionTags: tags,
        manufacturerHints: row.manufacturerHints || row.manufacturer_hints || row.manufacturer || "",
        realWorldHints: row.realWorldHints || row.real_world_hints || row.hints || "",
        matchedGearProfileId: null,
        discoveryStatus: "new_candidate",
        validationStatus: "discovered_unverified",
        notes: row.notes || row.notes || "",
        importIndex: idx
      };
    });
  } catch (e) {
    console.error("Failed to parse JSON candidates:", e);
    return [];
  }
}

const GENERIC_ALIASES = new Set([
  "noisegate", "gate", "eq", "equalizer", "compressor", "comp", "delay", "reverb", 
  "distortion", "overdrive", "fuzz", "boost", "chorus", "flanger", "phaser", 
  "tremolo", "wah", "limiter", "noise gate", "noise_gate"
]);

export function checkProfileMatch(candidate: IKMPAKCandidate, p: GearProfile): boolean {
  // Must match gear type
  const cType = candidate.candidateGearType;
  const pType = p.type;
  if (pType !== cType) return false;

  const normalizeValue = (val: any): string => {
    if (!val) return "";
    return val.toString().toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  };

  // 1. GUID Match: absolute priority
  const candGuid = normalizeValue(candidate.guid);
  const pGuid = normalizeValue(p.guid);
  if (candGuid && pGuid && candGuid === pGuid) return true;

  // Also check rawSources.catalog.guid
  const pCatalogGuid = normalizeValue(p.rawSources?.catalog?.guid);
  if (candGuid && pCatalogGuid && candGuid === pCatalogGuid) return true;

  const candCompName = normalizeValue(candidate.name);
  const candCompShort = normalizeValue(candidate.shortName);
  const candCompShort2 = normalizeValue(candidate.shortName2);
  const candCompNorm = normalizeValue(candidate.normalizedName);

  const pCompName = normalizeValue(p.displayName);
  const pCompCatalogName = normalizeValue(p.rawSources?.catalog?.displayName);

  // Collect candidate terms that are specific (not generic)
  const isGeneric = (str: string) => {
    const s = normalizeValue(str);
    return !s || s.length <= 2 || GENERIC_ALIASES.has(s);
  };

  // 2. Exact compact normalized name match
  if (candCompName && pCompName && candCompName === pCompName) {
    return true;
  }

  // 3. Match candidate specific terms with profile terms
  // Let's gather all profile identifiers
  const pTerms = new Set<string>();
  if (pCompName) pTerms.add(pCompName);
  if (pCompCatalogName) pTerms.add(pCompCatalogName);
  if (p.aliases) {
    p.aliases.forEach(a => {
      const na = normalizeValue(a);
      if (na) pTerms.add(na);
    });
  }
  if (p.rawSources?.catalog?.otherNames) {
    p.rawSources.catalog.otherNames.forEach(a => {
      const na = normalizeValue(a);
      if (na) pTerms.add(na);
    });
  }

  // Gather candidate identifiers
  const candTerms = new Set<string>();
  if (candCompName) candTerms.add(candCompName);
  if (candCompShort) candTerms.add(candCompShort);
  if (candCompShort2) candTerms.add(candCompShort2);
  if (candCompNorm) candTerms.add(candCompNorm);
  if (candidate.keywords) {
    candidate.keywords.forEach(kw => {
      const nkw = normalizeValue(kw);
      if (nkw) candTerms.add(nkw);
    });
  }

  // Check intersection of candidate and profile terms
  for (const cTerm of candTerms) {
    if (pTerms.has(cTerm)) {
      // Prevent generic aliases like "Noise Gate" alone from forcing match,
      // unless there is stronger evidence, such as the candidate name itself matching exactly.
      if (isGeneric(cTerm)) {
        // Only allow generic match if both display names are exactly the generic term (e.g. they literally are both called "Noise Gate")
        if (candCompName === pCompName && isGeneric(candCompName)) {
          return true;
        }
        continue;
      }
      return true;
    }
  }

  // 4. Compact sub-string/cross-matching for specific brands/products
  // e.g. "Rocktron Hush IIB" vs "Hush IIB" or "Dime Noise Gate" vs "Dime Gate"
  const getSpecificTokens = (str: any): string[] => {
    if (typeof str !== 'string') {
      if (str === null || str === undefined) return [];
      str = String(str);
    }
    return str.toLowerCase()
      .split(/[^a-z0-9]/)
      .map(w => w.trim())
      .filter((w: string) => w.length >= 3 && !GENERIC_ALIASES.has(w));
  };

  const candSpecificWords = [
    ...getSpecificTokens(candidate.name),
    ...getSpecificTokens(candidate.shortName || ""),
    ...getSpecificTokens(candidate.shortName2 || ""),
    ...getSpecificTokens(candidate.realWorldHints || ""),
    ...getSpecificTokens(candidate.manufacturerHints || "")
  ];

  const pSpecificWords = [
    ...getSpecificTokens(p.displayName),
    ...(p.aliases || []).flatMap(getSpecificTokens),
    ...getSpecificTokens(p.rawSources?.catalog?.displayName || "")
  ];

  for (const cSpecific of candSpecificWords) {
    if (pSpecificWords.includes(cSpecific)) {
      // Yes, they share a specific keyword!
      const cComp = normalizeValue(candidate.name);
      const pComp = normalizeValue(p.displayName);
      if (cComp.includes(cSpecific) && pComp.includes(cSpecific)) {
        // Let's check for specific multi-word combinations or subphrase matching
        const isStompMatch = (cComp.includes("gate") || cComp.includes("noise")) && (pComp.includes("gate") || pComp.includes("noise"));
        const hasDime = cComp.includes("dime") && pComp.includes("dime");
        const hasHush = cComp.includes("hush") && pComp.includes("hush");
        
        if (hasDime || hasHush || (isStompMatch && (cComp.includes("dime") || pComp.includes("dime")))) {
          return true;
        }

        const cShort = normalizeValue(candidate.shortName);
        const cShort2 = normalizeValue(candidate.shortName2);
        if (cShort && pComp.includes(cShort)) return true;
        if (cShort2 && pComp.includes(cShort2)) return true;
        if (pComp.includes(cComp) || cComp.includes(pComp)) return true;
      }
    }
  }

  return false;
}

