import { AT5_VERIFIED_GEAR, VerifiedParamDef } from './at5VerifiedParameterOverrides';
import { getVerifiedCabs, getVerifiedMics, getVerifiedSpeakers } from './at5VerifiedProtocols';
import { getAt5Catalog, refreshCatalog, cleanGearNameForMatching } from './at5Catalog';
import { refreshCoreParameterMappings } from './at5ParameterManifest';
import { at5DatabaseService } from './at5DatabaseService';
import { GearProfile, GearProfileParameter, AT5CatalogItem, ParameterMapping } from '../types';

export const normaliseName = (value: string) =>
  value
    ? value
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    : "";

interface ProfileBuildContext {
  indexBuildMs: number;
  normGuid: (guid: string) => string;
  getNormName: (name: string) => string;
  getCleanName: (name: string) => string;
  getCleanGuid: (guid: string) => string;
  getRelevantMappings: (guid: string, displayName: string, aliases: string[]) => ParameterMapping[];
  getVerifiedGear: (nGuid: string, displayName: string) => any;
}

function createProfileBuildContext(dbMappings: ParameterMapping[]): ProfileBuildContext {
  const t0 = performance.now();

  const normNameCache = new Map<string, string>();
  const cleanNameCache = new Map<string, string>();
  const cleanGuidCache = new Map<string, string>();
  const normGuidCache = new Map<string, string>();

  const getNormName = (name: string): string => {
    if (!name) return "";
    let res = normNameCache.get(name);
    if (res === undefined) {
      res = normaliseName(name);
      normNameCache.set(name, res);
    }
    return res;
  };

  const getCleanName = (name: string): string => {
    if (!name) return "";
    let res = cleanNameCache.get(name);
    if (res === undefined) {
      res = cleanGearNameForMatching(name);
      cleanNameCache.set(name, res);
    }
    return res;
  };

  const getCleanGuid = (guid: string): string => {
    if (!guid) return "";
    let res = cleanGuidCache.get(guid);
    if (res === undefined) {
      res = guid.toLowerCase().replace(/[^a-z0-9]/g, "");
      cleanGuidCache.set(guid, res);
    }
    return res;
  };

  const normGuid = (guid: string): string => {
    if (!guid) return "";
    let res = normGuidCache.get(guid);
    if (res === undefined) {
      res = guid.toLowerCase().replace(/-/g, "").trim();
      normGuidCache.set(guid, res);
    }
    return res;
  };

  // 1. Pre-index database parameter mappings
  const mappingIndexMap = new Map<ParameterMapping, number>();
  const mappingsByGuid = new Map<string, ParameterMapping[]>();
  const mappingsByNormName = new Map<string, ParameterMapping[]>();
  const mappingsByCleanName = new Map<string, ParameterMapping[]>();

  const mappingCleanGuid = new Map<ParameterMapping, string>();
  const mappingNormName = new Map<ParameterMapping, string>();
  const mappingCleanName = new Map<ParameterMapping, string>();

  for (let i = 0; i < dbMappings.length; i++) {
    const m = dbMappings[i];
    mappingIndexMap.set(m, i);

    const mCleanG = m.gearGuid ? getCleanGuid(m.gearGuid) : "";
    mappingCleanGuid.set(m, mCleanG);
    if (mCleanG) {
      let list = mappingsByGuid.get(mCleanG);
      if (!list) {
        list = [];
        mappingsByGuid.set(mCleanG, list);
      }
      list.push(m);
    }

    const mNormN = m.gearName ? getNormName(m.gearName) : "";
    mappingNormName.set(m, mNormN);
    if (mNormN) {
      let list = mappingsByNormName.get(mNormN);
      if (!list) {
        list = [];
        mappingsByNormName.set(mNormN, list);
      }
      list.push(m);
    }

    const mCleanN = m.gearName ? getCleanName(m.gearName) : "";
    mappingCleanName.set(m, mCleanN);
    if (mCleanN) {
      let list = mappingsByCleanName.get(mCleanN);
      if (!list) {
        list = [];
        mappingsByCleanName.set(mCleanN, list);
      }
      list.push(m);
    }
  }

  // 2. Pre-index verified gear overrides
  const verifiedByGuid = new Map<string, any>();
  const verifiedByNormName = new Map<string, any>();
  const verifiedByCleanName = new Map<string, any>();

  for (const v of AT5_VERIFIED_GEAR) {
    if (v.realId) {
      const vGuid = normGuid(v.realId);
      if (vGuid && !verifiedByGuid.has(vGuid)) {
        verifiedByGuid.set(vGuid, v);
      }
    }
    const vNorm = getNormName(v.name);
    if (vNorm && !verifiedByNormName.has(vNorm)) {
      verifiedByNormName.set(vNorm, v);
    }
    const vClean = getCleanName(v.name);
    if (vClean && !verifiedByCleanName.has(vClean)) {
      verifiedByCleanName.set(vClean, v);
    }
  }

  const getVerifiedGear = (nGuid: string, displayName: string): any => {
    if (nGuid) {
      const byG = verifiedByGuid.get(nGuid);
      if (byG) return byG;
    }
    const normN = getNormName(displayName);
    const byN = verifiedByNormName.get(normN);
    if (byN) return byN;

    const cleanN = getCleanName(displayName);
    return verifiedByCleanName.get(cleanN);
  };

  // 3. Fast candidate retrieval and verification
  const getRelevantMappings = (guid: string, displayName: string, aliases: string[]): ParameterMapping[] => {
    const gearCleanG = guid ? getCleanGuid(guid) : "";
    const gearNormN = getNormName(displayName);
    const gearCleanN = getCleanName(displayName);

    const normKeys: string[] = gearNormN ? [gearNormN] : [];
    const cleanKeys: string[] = gearCleanN ? [gearCleanN] : [];

    for (let i = 0; i < aliases.length; i++) {
      const a = aliases[i];
      if (!a) continue;
      const an = getNormName(a);
      if (an) normKeys.push(an);
      const ac = getCleanName(a);
      if (ac) cleanKeys.push(ac);
    }

    const candidateSet = new Set<ParameterMapping>();

    if (gearCleanG) {
      const byGuid = mappingsByGuid.get(gearCleanG);
      if (byGuid) {
        for (let j = 0; j < byGuid.length; j++) {
          candidateSet.add(byGuid[j]);
        }
      }
    }

    for (let i = 0; i < normKeys.length; i++) {
      const byNorm = mappingsByNormName.get(normKeys[i]);
      if (byNorm) {
        for (let j = 0; j < byNorm.length; j++) {
          candidateSet.add(byNorm[j]);
        }
      }
    }

    for (let i = 0; i < cleanKeys.length; i++) {
      const byClean = mappingsByCleanName.get(cleanKeys[i]);
      if (byClean) {
        for (let j = 0; j < byClean.length; j++) {
          candidateSet.add(byClean[j]);
        }
      }
    }

    if (candidateSet.size === 0) {
      return [];
    }

    const candidates = Array.from(candidateSet);
    candidates.sort((a, b) => (mappingIndexMap.get(a) ?? 0) - (mappingIndexMap.get(b) ?? 0));

    const normKeysSet = new Set(normKeys);
    const cleanKeysSet = new Set(cleanKeys);

    return candidates.filter(m => {
      if (gearCleanG) {
        const mG = mappingCleanGuid.get(m);
        if (mG && mG === gearCleanG) return true;
      }
      const mNorm = mappingNormName.get(m);
      if (mNorm && normKeysSet.has(mNorm)) return true;

      const mClean = mappingCleanName.get(m);
      if (mClean && cleanKeysSet.has(mClean)) return true;

      return false;
    });
  };

  const indexBuildMs = Math.round(performance.now() - t0);

  return {
    indexBuildMs,
    normGuid,
    getNormName,
    getCleanName,
    getCleanGuid,
    getRelevantMappings,
    getVerifiedGear
  };
}

let profilesCache: { data: GearProfile[]; timestamp: number } | null = null;
let inFlightProfilesPromise: Promise<GearProfile[]> | null = null;
const CACHE_TTL_MS = 60000;

export const gearProfileService = {
  clearCache() {
    profilesCache = null;
    inFlightProfilesPromise = null;
    at5DatabaseService.clearCache();
  },

  /**
   * Retrieves all items merged on-the-fly into GearProfile objects.
   * Features in-flight Promise deduplication:
   * - Non-forced callers await and receive the active running Promise.
   * - Concurrent forced refreshes collapse into the single active refresh.
   * - Completed data is cached before clearing the in-flight Promise.
   */
  async getGearProfiles(forceRefresh = false): Promise<GearProfile[]> {
    const t0 = performance.now();

    // 1. Serve from completed-result memory cache if valid and not forcing a refresh
    if (!forceRefresh && profilesCache && (Date.now() - profilesCache.timestamp < CACHE_TTL_MS)) {
      console.log(JSON.stringify({
        operation: 'getGearProfiles',
        durationMs: Math.round(performance.now() - t0),
        profileCount: profilesCache.data.length,
        source: 'cache'
      }));
      return profilesCache.data;
    }

    // 2. In-flight request deduplication:
    // If a request is already running, join the active in-flight Promise.
    // Multiple simultaneous forced refreshes collapse into the single active execution.
    if (inFlightProfilesPromise) {
      console.log(JSON.stringify({
        operation: 'getGearProfiles',
        durationMs: Math.round(performance.now() - t0),
        source: 'joined-in-flight'
      }));
      return inFlightProfilesPromise;
    }

    // 3. Initiate single coordinated refresh
    inFlightProfilesPromise = (async () => {
      const fetchT0 = performance.now();
      try {
        const prepT0 = performance.now();
        const wasCatalogCached = at5DatabaseService.isCatalogueCached();
        const wasMappingsCached = at5DatabaseService.isParameterMappingsCached();

        // 1. Concurrently obtain catalogue and core parameter mappings
        const [catalogItems, dbMappings] = await Promise.all([
          refreshCatalog(forceRefresh),
          refreshCoreParameterMappings(forceRefresh)
        ]);

        const cabs = getVerifiedCabs() || [];
        const speakers = getVerifiedSpeakers() || [];
        const mics = getVerifiedMics() || [];
        const prepDurationMs = Math.round(performance.now() - prepT0);

        const buildT0 = performance.now();
        const ctx = createProfileBuildContext(dbMappings);
        const profiles: GearProfile[] = [];
        const seenGuids = new Set<string>();

        const catalogBuildT0 = performance.now();
        // Start with catalogItems
        for (const item of catalogItems) {
          const guid = item.guid || '';
          const nGuid = ctx.normGuid(guid);
          
          let type = item.group; // 'amp', 'stomp', 'rack', 'cab', etc.
          let displayName = item.displayName;
          const aliases = Array.from(new Set([
            ...(item.otherNames || []),
            ...(item.examplePresets || [])
          ]));

          // Darrell 100 normalization
          const cleanName = displayName.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
          let id = nGuid ? 
            (guid.startsWith('gear-') || guid.startsWith('name-') || guid.startsWith('name_') ? guid : `gear-${nGuid}`) : 
            `gear-${ctx.getNormName(displayName)}-${type}`;

          if (cleanName === "darrell100" || cleanName === "darrell 100" || displayName === "Darrell 100") {
            id = "amp_darrell_100";
            displayName = "Darrell 100";
            type = "amp";
          }

          // Single lookup of relevant mappings and verified gear definition
          const relevantMappings = ctx.getRelevantMappings(guid, displayName, aliases);
          const verifiedGear = ctx.getVerifiedGear(nGuid, displayName);

          // Build parameters base for this item
          const parameters = this.mergeParameters(item, displayName, nGuid, relevantMappings, true, verifiedGear);

          // Check validation
          const validation = this.evaluateValidation(type, guid, aliases, parameters);

          const valStatus = (item as any).validationStatus || (guid && (cleanName === "darrell100" || cleanName === "darrell 100") ? "verified_at5p" : undefined);

          profiles.push({
            id,
            displayName,
            type,
            guid,
            slot: item.slot || '',
            aliases,
            parameters,
            validation,
            validationStatus: valStatus,
            parameterSource: (item as any).parameterSource || undefined,
            guidSource: (item as any).guidSource || undefined,
            lastValidatedAt: (item as any).lastValidatedAt || undefined,
            lastValidatedFromPreset: (item as any).lastValidatedFromPreset || undefined,
            profileStatus: (item as any).profileStatus || undefined,
            confirmedGuid: (item as any).confirmedGuid || undefined,
            confirmedGearType: (item as any).confirmedGearType || undefined,
            discoveredFromParentCab: (item as any).discoveredFromParentCab || undefined,
            discoveredFromField: (item as any).discoveredFromField || undefined,
            validationMethod: (item as any).validationMethod || undefined,
            discoveredParameters: (item as any).discoveredParameters || undefined,
            parameterDefinitions: (item as any).parameterDefinitions || undefined,
            sourceHistory: (item as any).sourceHistory || undefined,
            validationQueueStatus: (item as any).validationQueueStatus || undefined,
            ignoredAliasSuggestions: (item as any).ignoredAliasSuggestions || [],
            discovery: {
              isDraft: (item as any).isDraft,
              importHistory: (item as any).importHistory || [],
              detectedAt: (item as any).detectedAt,
              sourcePresetFilename: (item as any).sourcePresetFilename,
              dateApplied: (item as any).dateApplied,
            },
            rawSources: {
              catalog: item,
              mappings: relevantMappings,
              verified: verifiedGear
            }
          });

          if (nGuid) {
            seenGuids.add(nGuid);
          }
        }
        const catalogBuildMs = Math.round(performance.now() - catalogBuildT0);

        const protocolsBuildT0 = performance.now();
        // Add unmatched verified cabs
        for (const cab of cabs) {
          const nGuid = ctx.normGuid(cab.guid);
          if (nGuid && seenGuids.has(nGuid)) continue;

          const id = `gear-${nGuid}`;
          const displayName = cab.aliases?.[0] || 'Unknown Verified Cabinet';
          const type = 'cab';
          const aliases = cab.aliases || [];

          const relevantMappings = ctx.getRelevantMappings(cab.guid, displayName, aliases);
          const verifiedGear = ctx.getVerifiedGear(nGuid, displayName);

          const parameters = this.mergeParameters({ displayName, guid: cab.guid, group: 'cab', slot: 'CabA' }, displayName, nGuid, relevantMappings, true, verifiedGear);
          const validation = this.evaluateValidation(type, cab.guid, aliases, parameters);

          profiles.push({
            id,
            displayName,
            type,
            guid: cab.guid,
            slot: 'CabA',
            aliases,
            parameters,
            validation,
            rawSources: {
              catalog: { displayName, guid: cab.guid, group: 'cab', slot: 'CabA' },
              mappings: relevantMappings,
              verifiedProtocol: cab,
              verified: verifiedGear
            }
          });
          if (nGuid) seenGuids.add(nGuid);
        }

        // Add unmatched verified speakers
        for (const speaker of speakers) {
          const nGuid = ctx.normGuid(speaker.guid);
          if (nGuid && seenGuids.has(nGuid)) continue;

          const id = `gear-${nGuid}`;
          const displayName = speaker.aliases?.[0] || 'Unknown Verified Speaker';
          const type = 'speaker';
          const aliases = speaker.aliases || [];

          const relevantMappings = ctx.getRelevantMappings(speaker.guid, displayName, aliases);
          const verifiedGear = ctx.getVerifiedGear(nGuid, displayName);

          const parameters = this.mergeParameters({ displayName, guid: speaker.guid, group: 'speaker', slot: 'Speaker' }, displayName, nGuid, relevantMappings, true, verifiedGear);
          const validation = this.evaluateValidation(type, speaker.guid, aliases, parameters);

          profiles.push({
            id,
            displayName,
            type,
            guid: speaker.guid,
            slot: 'Speaker',
            aliases,
            parameters,
            validation,
            rawSources: {
              catalog: { displayName, guid: speaker.guid, group: 'speaker', slot: 'Speaker' },
              mappings: relevantMappings,
              verifiedProtocol: speaker,
              verified: verifiedGear
            }
          });
          if (nGuid) seenGuids.add(nGuid);
        }

        // Add unmatched verified mics
        for (const mic of mics) {
          const nGuid = ctx.normGuid(mic.guid);
          if (nGuid && seenGuids.has(nGuid)) continue;

          const id = `gear-${nGuid}`;
          const displayName = mic.aliases?.[0] || 'Unknown Verified Mic';
          const type = 'mic';
          const aliases = mic.aliases || [];

          const relevantMappings = ctx.getRelevantMappings(mic.guid, displayName, aliases);
          const verifiedGear = ctx.getVerifiedGear(nGuid, displayName);

          const parameters = this.mergeParameters({ displayName, guid: mic.guid, group: 'mic', slot: 'Mic' }, displayName, nGuid, relevantMappings, true, verifiedGear);
          const validation = this.evaluateValidation(type, mic.guid, aliases, parameters);

          profiles.push({
            id,
            displayName,
            type,
            guid: mic.guid,
            slot: 'Mic',
            aliases,
            parameters,
            validation,
            rawSources: {
              catalog: { displayName, guid: mic.guid, group: 'mic', slot: 'Mic' },
              mappings: relevantMappings,
              verifiedProtocol: mic,
              verified: verifiedGear
            }
          });
          if (nGuid) seenGuids.add(nGuid);
        }
        const protocolsBuildMs = Math.round(performance.now() - protocolsBuildT0);

        const buildDurationMs = Math.round(performance.now() - buildT0);
        const totalDurationMs = Math.round(performance.now() - fetchT0);

        // Store completed result into memory cache before clearing in-flight tracker
        profilesCache = { data: profiles, timestamp: Date.now() };

        const isFullyCached = wasCatalogCached && wasMappingsCached && !forceRefresh;
        console.log(JSON.stringify({
          operation: 'getGearProfiles',
          coreDataPrepMs: prepDurationMs,
          profileBuildMs: buildDurationMs,
          totalDurationMs: totalDurationMs,
          profileCount: profiles.length,
          parameterMappingCount: dbMappings.length,
          phases: {
            indexBuildMs: ctx.indexBuildMs,
            catalogBuildMs,
            protocolsBuildMs
          },
          source: isFullyCached ? 'cache' : 'firestore'
        }));

        return profiles;
    } finally {
      // Clear in-flight promise so future calls/retries are not blocked
      inFlightProfilesPromise = null;
    }
  })();

  return inFlightProfilesPromise;
},

  /**
   * Helper to check if a DB mapping matches a gear's name or aliases
   */
  isMappingForGear(m: ParameterMapping, displayName: string, aliases: string[] = [], guid?: string): boolean {
    if (guid && m.gearGuid) {
      const normG1 = guid.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normG2 = m.gearGuid.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normG1 && normG2 && normG1 === normG2) return true;
    }
    const rawG = cleanGearNameForMatching(m.gearName);
    if (!rawG) return false;
    if (rawG === cleanGearNameForMatching(displayName)) return true;
    if (normaliseName(m.gearName) === normaliseName(displayName)) return true;
    return aliases.some(a => cleanGearNameForMatching(a) === rawG || normaliseName(a) === normaliseName(m.gearName));
  },

  /**
   * Merges different sources of parameters (catalog knobs, static overrides, DB overrides)
   */
  mergeParameters(
    item: any,
    displayName: string,
    normalizedGuid: string,
    dbMappings: ParameterMapping[],
    isAlreadyRelevant = false,
    verifiedGearOverride?: any
  ): GearProfileParameter[] {
    const paramsMap = new Map<string, GearProfileParameter>();

    // 1. Load AT5_VERIFIED_GEAR override parameters if present
    const verifiedGear = verifiedGearOverride !== undefined 
      ? verifiedGearOverride 
      : AT5_VERIFIED_GEAR.find(v => 
          (v.realId && normalizedGuid && v.realId.toLowerCase().replace(/-/g, '') === normalizedGuid) || 
          (normaliseName(v.name) === normaliseName(displayName)) ||
          (cleanGearNameForMatching(v.name) === cleanGearNameForMatching(displayName))
        );

    if (verifiedGear && verifiedGear.params) {
      for (const p of verifiedGear.params) {
        const key = p.friendlyName.toLowerCase().trim();
        paramsMap.set(key, {
          displayName: p.friendlyName,
          canonicalName: p.xmlName,
          aliases: p.aliases || [],
          visual: {
            min: p.min,
            max: p.max,
            unit: p.unit || ''
          },
          export: {
            name: p.xmlName,
            min: p.min,
            max: p.max
          },
          conversion: {
            mode: p.transform || 'direct',
            formula: this.getFormulaForMode(p.transform || 'direct')
          },
          defaultValue: p.defaultValue,
          validationStatus: 'PASS'
        });
      }
    }

    // 2. Load catalog knobs parameters
    if (item.knobs && Array.isArray(item.knobs)) {
      for (const knob of item.knobs) {
        const key = knob.name.toLowerCase().trim();
        const existing = paramsMap.get(key);
        
        const friendlyName = knob.name;
        const minVal = knob.min !== undefined ? Number(knob.min) : 0;
        const maxVal = knob.max !== undefined ? Number(knob.max) : 10;
        const unit = knob.unit || '';
        const defaultValue = knob.default !== undefined ? knob.default : '';

        if (existing) {
          // Merge / upgrade existing parameter with default or correct visualization values
          if (!existing.defaultValue && defaultValue) {
            existing.defaultValue = defaultValue;
          }
          if (existing.visual.min === 0 && existing.visual.max === 0 && (minVal !== 0 || maxVal !== 0)) {
            existing.visual.min = minVal;
            existing.visual.max = maxVal;
          }
        } else {
          paramsMap.set(key, {
            displayName: friendlyName,
            canonicalName: friendlyName,
            aliases: [],
            visual: {
              min: minVal,
              max: maxVal,
              unit
            },
            export: {
              name: friendlyName,
              min: minVal,
              max: maxVal
            },
            conversion: {
              mode: 'direct',
              formula: ''
            },
            defaultValue,
            validationStatus: 'PARTIAL' // Needs export name / mapping mapping verification
          });
        }
      }
    }

    // 3. Load DB parameter_mappings list that match
    let relevantDb: ParameterMapping[];
    if (isAlreadyRelevant) {
      relevantDb = dbMappings;
    } else {
      const aliasSet = new Set([
        normaliseName(displayName),
        cleanGearNameForMatching(displayName),
        ...(item.otherNames || []).map(normaliseName),
        ...(item.otherNames || []).map(cleanGearNameForMatching),
        ...(item.examplePresets || []).map(normaliseName),
        ...(item.examplePresets || []).map(cleanGearNameForMatching)
      ]);
      relevantDb = dbMappings.filter(m => {
        if (aliasSet.has(normaliseName(m.gearName))) return true;
        if (aliasSet.has(cleanGearNameForMatching(m.gearName))) return true;
        if (m.gearGuid && normalizedGuid && m.gearGuid.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedGuid.toLowerCase().replace(/[^a-z0-9]/g, '')) return true;
        return false;
      });
    }

    // Fast parameter indexing
    const paramKeyIndex = new Map<string, Set<string>>();

    const addNameToIndex = (name: string | undefined, paramKey: string) => {
      if (!name) return;
      const clean = name.toLowerCase().trim();
      if (!clean) return;
      let set = paramKeyIndex.get(clean);
      if (!set) {
        set = new Set<string>();
        paramKeyIndex.set(clean, set);
      }
      set.add(paramKey);
    };

    const registerParamInIndex = (paramKey: string, p: GearProfileParameter) => {
      addNameToIndex(paramKey, paramKey);
      addNameToIndex(p.canonicalName, paramKey);
      addNameToIndex(p.canonicalParameterName, paramKey);
      addNameToIndex(p.export?.name, paramKey);
      addNameToIndex(p.at5XmlAttributeName, paramKey);
      addNameToIndex(p.displayName, paramKey);
      addNameToIndex(p.displayParameterName, paramKey);
      if (Array.isArray(p.aliases)) {
        for (let i = 0; i < p.aliases.length; i++) addNameToIndex(p.aliases[i], paramKey);
      }
      if (Array.isArray(p.savedAliases)) {
        for (let i = 0; i < p.savedAliases.length; i++) addNameToIndex(p.savedAliases[i], paramKey);
      }
      if (Array.isArray(p.effectiveAliases)) {
        for (let i = 0; i < p.effectiveAliases.length; i++) addNameToIndex(p.effectiveAliases[i], paramKey);
      }
    };

    const removeParamKeyFromIndex = (paramKey: string) => {
      for (const [name, set] of paramKeyIndex.entries()) {
        if (set.has(paramKey)) {
          set.delete(paramKey);
          if (set.size === 0) {
            paramKeyIndex.delete(name);
          }
        }
      }
    };

    for (const [k, p] of paramsMap.entries()) {
      registerParamInIndex(k, p);
    }

    for (const dbM of relevantDb) {
      const targetKeys = [
        dbM.exportParameterName,
        dbM.at5XmlAttributeName,
        dbM.canonicalParameterName,
        dbM.parameter,
        dbM.displayParameterName,
        ...(Array.isArray(dbM.savedAliases) ? dbM.savedAliases : []),
        ...(Array.isArray(dbM.aliases) ? dbM.aliases : [])
      ].filter(Boolean).map(s => s!.toLowerCase().trim());

      const matchingKeysSet = new Set<string>();
      for (let i = 0; i < targetKeys.length; i++) {
        const matched = paramKeyIndex.get(targetKeys[i]);
        if (matched) {
          for (const pk of matched) {
            if (paramsMap.has(pk)) {
              matchingKeysSet.add(pk);
            }
          }
        }
      }

      const matchingKeys: string[] = [];
      if (matchingKeysSet.size > 0) {
        for (const k of paramsMap.keys()) {
          if (matchingKeysSet.has(k)) {
            matchingKeys.push(k);
          }
        }
      }

      let existing: GearProfileParameter | undefined = undefined;
      if (matchingKeys.length > 0) {
        existing = paramsMap.get(matchingKeys[0]);
        // Clean up redundant duplicate entries from paramsMap so only one authoritative entry remains
        for (let i = 1; i < matchingKeys.length; i++) {
          const keyToDelete = matchingKeys[i];
          paramsMap.delete(keyToDelete);
          removeParamKeyFromIndex(keyToDelete);
        }
      }

      const valStatus = (dbM.conversion && dbM.conversion !== 'unknown') ? 'PASS' : 'WARN';

      if (existing) {
        existing.displayName = dbM.displayParameterName || dbM.parameter || existing.displayName;
        existing.displayParameterName = dbM.displayParameterName || dbM.parameter || existing.displayName;
        existing.canonicalName = dbM.canonicalParameterName || dbM.exportParameterName || existing.canonicalName;
        existing.canonicalParameterName = dbM.canonicalParameterName || dbM.exportParameterName || existing.canonicalName;
        existing.visual = {
          min: dbM.visualMin,
          max: dbM.visualMax,
          unit: dbM.visualUnit || ''
        };
        existing.export = {
          name: dbM.exportParameterName || existing.export.name,
          min: dbM.exportMin,
          max: dbM.exportMax
        };
        existing.conversion = {
          mode: dbM.conversion,
          formula: dbM.formula || this.getFormulaForMode(dbM.conversion)
        };
        existing.validationStatus = valStatus;

        const dbSavedAliases = (dbM.savedAliases && Array.isArray(dbM.savedAliases)) 
          ? dbM.savedAliases 
          : (dbM.aliases && Array.isArray(dbM.aliases)) 
            ? dbM.aliases 
            : [];
        const dbRawAliases = dbM.rawMappingAliases || [];
        const dbAutoAliases = dbM.autoGeneratedAliases || [];

        // DB saved aliases are the authoritative user-saved aliases
        const finalSaved = (dbM.savedAliases !== undefined || dbM.aliases !== undefined)
          ? dbSavedAliases
          : Array.from(new Set([...(existing.savedAliases || []), ...(existing.aliases || [])].filter(Boolean)));

        existing.aliases = finalSaved;
        existing.savedAliases = finalSaved;
        existing.rawMappingAliases = dbRawAliases;
        existing.autoGeneratedAliases = dbAutoAliases;
        existing.effectiveAliases = Array.from(new Set([
          ...finalSaved,
          ...dbRawAliases,
          ...dbAutoAliases,
          ...(dbM.effectiveAliases || []),
          existing.displayName,
          existing.canonicalName,
          existing.export?.name
        ].filter(Boolean)));

        // Propagate extended fields
        existing.gearGuid = dbM.gearGuid || existing.gearGuid;
        existing.displayParameterName = dbM.displayParameterName || existing.displayParameterName || existing.displayName;
        existing.canonicalParameterName = dbM.canonicalParameterName || existing.canonicalParameterName || existing.canonicalName;
        existing.at5XmlAttributeName = dbM.at5XmlAttributeName || existing.at5XmlAttributeName || existing.export?.name;
        existing.interfaceType = dbM.interfaceType ?? existing.interfaceType;
        existing.parameterKind = dbM.parameterKind ?? existing.parameterKind;
        existing.displayMin = dbM.displayMin ?? existing.displayMin;
        existing.displayMax = dbM.displayMax ?? existing.displayMax;
        existing.displayUnit = dbM.displayUnit ?? existing.displayUnit;
        existing.displayStep = dbM.displayStep ?? existing.displayStep;
        existing.decimalPlaces = dbM.decimalPlaces ?? existing.decimalPlaces;
        existing.displayPrecision = dbM.displayPrecision ?? existing.displayPrecision;
        existing.displayDecimalPlaces = dbM.displayDecimalPlaces ?? existing.displayDecimalPlaces;
        existing.defaultDisplayValue = dbM.defaultDisplayValue ?? existing.defaultDisplayValue;
        existing.exportUnit = dbM.exportUnit ?? existing.exportUnit;
        existing.exportStep = dbM.exportStep ?? existing.exportStep;
        existing.exportDecimalPlaces = dbM.exportDecimalPlaces ?? existing.exportDecimalPlaces;
        existing.exportPrecision = dbM.exportPrecision ?? existing.exportPrecision;
        existing.defaultExportValue = dbM.defaultExportValue ?? existing.defaultExportValue;
        existing.translationMode = dbM.translationMode ?? existing.translationMode;
        existing.valueMap = dbM.valueMap ?? existing.valueMap;
        existing.reverseValueMap = dbM.reverseValueMap ?? existing.reverseValueMap;
        existing.helperDescription = dbM.helperDescription ?? existing.helperDescription;
        existing.exampleInput = dbM.exampleInput ?? existing.exampleInput;
        existing.exampleOutput = dbM.exampleOutput ?? existing.exampleOutput;
        existing.mappingConfidence = dbM.mappingConfidence ?? existing.mappingConfidence;
        existing.source = dbM.source ?? existing.source;
        existing.doNotRequestForGear = dbM.doNotRequestForGear ?? existing.doNotRequestForGear;
        existing.unsupportedReason = dbM.unsupportedReason ?? existing.unsupportedReason;
        existing.reviewNotes = dbM.reviewNotes ?? existing.reviewNotes;
        existing.optionRows = dbM.optionRows ?? existing.optionRows;
        existing.valueMapJson = dbM.valueMapJson ?? existing.valueMapJson;
        existing.reverseValueMapJson = dbM.reverseValueMapJson ?? existing.reverseValueMapJson;
        (existing as any)._isDbHydrated = true;

        registerParamInIndex(matchingKeys[0], existing);
      } else {
        const dbSavedAliases = (dbM.savedAliases && dbM.savedAliases.length > 0) ? dbM.savedAliases : (dbM.aliases || []);
        const dbRawAliases = dbM.rawMappingAliases || dbM.aliases || [];
        const dbAutoAliases = dbM.autoGeneratedAliases || [];

        const newDisplayName = dbM.displayParameterName || dbM.parameter;
        const newCanonicalName = dbM.canonicalParameterName || dbM.exportParameterName;
        const newKey = (newCanonicalName || newDisplayName).toLowerCase().trim();
        const newParam: GearProfileParameter = {
          displayName: newDisplayName,
          canonicalName: newCanonicalName,
          aliases: dbSavedAliases,
          savedAliases: dbSavedAliases,
          rawMappingAliases: dbRawAliases,
          autoGeneratedAliases: dbAutoAliases,
          effectiveAliases: Array.from(new Set([
            ...dbSavedAliases,
            ...dbRawAliases,
            ...dbAutoAliases,
            ...(dbM.effectiveAliases || []),
            newDisplayName,
            newCanonicalName
          ].filter(Boolean))),
          visual: {
            min: dbM.visualMin,
            max: dbM.visualMax,
            unit: dbM.visualUnit || ''
          },
          export: {
            name: dbM.exportParameterName,
            min: dbM.exportMin,
            max: dbM.exportMax
          },
          conversion: {
            mode: dbM.conversion,
            formula: dbM.formula || this.getFormulaForMode(dbM.conversion)
          },
          defaultValue: '',
          validationStatus: valStatus,

          // Propagate extended fields
          gearGuid: dbM.gearGuid,
          displayParameterName: dbM.displayParameterName || newDisplayName,
          canonicalParameterName: dbM.canonicalParameterName || newCanonicalName,
          at5XmlAttributeName: dbM.at5XmlAttributeName || dbM.exportParameterName,
          interfaceType: dbM.interfaceType,
          parameterKind: dbM.parameterKind,
          displayMin: dbM.displayMin,
          displayMax: dbM.displayMax,
          displayUnit: dbM.displayUnit,
          displayStep: dbM.displayStep,
          decimalPlaces: dbM.decimalPlaces,
          displayPrecision: dbM.displayPrecision,
          displayDecimalPlaces: dbM.displayDecimalPlaces,
          defaultDisplayValue: dbM.defaultDisplayValue,
          exportUnit: dbM.exportUnit,
          exportStep: dbM.exportStep,
          exportDecimalPlaces: dbM.exportDecimalPlaces,
          exportPrecision: dbM.exportPrecision,
          defaultExportValue: dbM.defaultExportValue,
          translationMode: dbM.translationMode,
          valueMap: dbM.valueMap,
          reverseValueMap: dbM.reverseValueMap,
          helperDescription: dbM.helperDescription,
          exampleInput: dbM.exampleInput,
          exampleOutput: dbM.exampleOutput,
          mappingConfidence: dbM.mappingConfidence,
          source: dbM.source,
          doNotRequestForGear: dbM.doNotRequestForGear,
          unsupportedReason: dbM.unsupportedReason,
          reviewNotes: dbM.reviewNotes,
          optionRows: dbM.optionRows,
          valueMapJson: dbM.valueMapJson,
          reverseValueMapJson: dbM.reverseValueMapJson,
        };
        (newParam as any)._isDbHydrated = true;
        paramsMap.set(newKey, newParam);
        registerParamInIndex(newKey, newParam);
      }
    }

    // Ensure parameters are strictly deduplicated with authoritative priority to DB-hydrated parameters
    const canonicalMap = new Map<string, GearProfileParameter>();
    const extraParams: GearProfileParameter[] = [];

    for (const p of paramsMap.values()) {
      const canonicalKey = (p.canonicalName || p.export?.name || p.canonicalParameterName || p.at5XmlAttributeName || p.displayParameterName || p.displayName || '').toLowerCase().trim();
      if (!canonicalKey) {
        extraParams.push(p);
        continue;
      }

      const existingInMap = canonicalMap.get(canonicalKey);
      if (!existingInMap) {
        canonicalMap.set(canonicalKey, p);
      } else {
        const incomingIsDb = !!(p as any)._isDbHydrated;
        const existingIsDb = !!(existingInMap as any)._isDbHydrated;

        if (incomingIsDb && !existingIsDb) {
          canonicalMap.set(canonicalKey, p);
        } else if (incomingIsDb && existingIsDb) {
          canonicalMap.set(canonicalKey, p);
        }
      }
    }

    return [...Array.from(canonicalMap.values()), ...extraParams];
  },

  /**
   * Helper to evaluate overall list of gaps and determine the correct validation status
   */
  evaluateValidation(
    type: string,
    guid: string,
    aliases: string[],
    parameters: GearProfileParameter[]
  ) {
    const gaps: string[] = [];
    const isRoomOrRoomMic = type === 'room' || type === 'room_mic' || type === 'roomMic';

    // Identity Checks
    if (!isRoomOrRoomMic) {
      if (!guid || guid.trim().length === 0) {
        gaps.push('Missing GUID');
      } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guid)) {
        gaps.push('Invalid GUID structure');
      }
    }

    if (!aliases || aliases.length === 0) {
      if (!isRoomOrRoomMic) {
        gaps.push('Missing aliases');
      }
    }

    // Parameter checks
    if (!parameters || parameters.length === 0) {
      if (type !== 'cab' && type !== 'speaker' && type !== 'mic' && !isRoomOrRoomMic) {
        gaps.push('No parameters mapped');
      }
    } else {
      const partials = parameters.filter(p => p.validationStatus === 'PARTIAL');
      if (partials.length > 0) {
        gaps.push(`Partial parameters: ${partials.map(p => p.displayName).join(', ')}`);
      }
      const warnings = parameters.filter(p => p.validationStatus === 'WARN');
      if (warnings.length > 0) {
        gaps.push(`Estimated conversions: ${warnings.map(p => p.displayName).join(', ')}`);
      }
    }

    // Determine status
    let status: 'PASS' | 'WARN' | 'PARTIAL' | 'CHECK' | 'FAIL' | 'UNKNOWN' = 'UNKNOWN';

    if (gaps.length === 0) {
      status = 'PASS';
    } else if (gaps.some(g => g.includes('Missing GUID') || g.includes('No parameters mapped'))) {
      status = 'PARTIAL';
    } else if (gaps.some(g => g.includes('Partial parameters'))) {
      status = 'PARTIAL';
    } else if (gaps.some(g => g.includes('Estimated conversions') || g.includes('Missing aliases'))) {
      status = 'WARN';
    } else {
      status = 'CHECK';
    }

    // Special verification rules overrides based on real-world test expectations
    if (gaps.length > 0 && guid) {
      // Usable with warnings
      if (status === 'PARTIAL' && parameters.length > 0) {
        status = 'PARTIAL';
      }
    }

    return {
      status,
      gaps,
      reason: gaps.join('. ')
    };
  },

  getFormulaForMode(mode: string): string {
    switch (mode) {
      case 'dbThresholdToLinear':
      case 'db_to_linear':
        return '10^(dB/20)';
      case 'linear_to_db':
        return '20*log10(ratio)';
      case 'khzToHzIfNeeded':
        return 'kHz * 1000';
      case 'noiseGateRelease':
        return 'ms release formula';
      case 'noiseGateDepth':
        return 'attenuation dB';
      default:
        return 'direct correlation';
    }
  },

  /**
   * Saving back to the individual collections
   */
  async saveGearProfile(profile: GearProfile): Promise<void> {
    this.clearCache();
    // 1. Update Gear Identity / Aliases → catalogue if non-empty type/guid and is catalog-eligible
    const isCabSpecMic = ['cab', 'speaker', 'mic'].includes(profile.type);
    
    // Construct standard catalog item structure
    const updatedCatalogGear: AT5CatalogItem = {
      guid: profile.guid,
      displayName: profile.displayName,
      group: profile.type,
      slot: profile.slot,
      otherNames: profile.aliases,
      knobs: profile.parameters.map(p => ({
        name: p.displayName,
        type: 'range',
        min: p.visual?.min ?? 0,
        max: p.visual?.max ?? 10,
        default: String(p.defaultValue ?? '')
      })),
      validationStatus: profile.validationStatus,
      parameterSource: profile.parameterSource,
      guidSource: profile.guidSource,
      lastValidatedAt: profile.lastValidatedAt,
      lastValidatedFromPreset: profile.lastValidatedFromPreset,
      isDraft: profile.discovery?.isDraft,
      importHistory: profile.discovery?.importHistory,
      detectedAt: profile.discovery?.detectedAt,
      sourcePresetFilename: profile.discovery?.sourcePresetFilename,
      dateApplied: profile.discovery?.dateApplied,
      discoverySource: profile.discovery?.discoverySourceType,
      profileStatus: profile.profileStatus,
      confirmedGuid: profile.confirmedGuid,
      confirmedGearType: profile.confirmedGearType,
      discoveredFromParentCab: profile.discoveredFromParentCab,
      discoveredFromField: profile.discoveredFromField,
      validationMethod: profile.validationMethod,
      discoveredParameters: profile.discoveredParameters,
      parameterDefinitions: profile.parameterDefinitions,
      sourceHistory: profile.sourceHistory,
      validationQueueStatus: profile.validationQueueStatus,
      ignoredAliasSuggestions: profile.ignoredAliasSuggestions || []
    } as any;

    if (profile.guid && profile.guid.length > 5) {
      // Save item to catalogue
      await at5DatabaseService.saveGearItem(updatedCatalogGear);
    } else {
      // No valid hardware GUID, save using stable profile.id as synthetic GUID to persist metadata
      const docId = profile.id;
      const updatedGearWithIdGuid = {
        ...updatedCatalogGear,
        guid: docId
      };
      await at5DatabaseService.saveGearItem(updatedGearWithIdGuid);
    }

    // 2. cab/mic/speaker aliases → verified_* where required
    if (isCabSpecMic && profile.guid && profile.guid.length > 5) {
      const dbType = profile.type === 'cab' ? 'cabs' : profile.type === 'speaker' ? 'speakers' : 'mics';
      const mappingItem = {
        guid: profile.guid,
        aliases: profile.aliases,
        brand: profile.rawSources.verifiedProtocol?.brand || (profile.type === 'speaker' ? 'Celestion' : undefined)
      };
      await at5DatabaseService.saveVerifiedMapping(dbType, mappingItem);
    }

    // 3. Prune obsolete and renamed parameter mappings and save current ones
    const dbMappings = await at5DatabaseService.getParameterMappings(true);
    const relevantDb = dbMappings.filter(m => this.isMappingForGear(m, profile.displayName, profile.aliases || [], profile.guid));
    
    // Deduplicate current parameters by canonical export name / XML attribute to ensure unique list
    const deduplicatedParams: GearProfileParameter[] = [];
    const seenParamKeys = new Set<string>();
    for (const p of (profile.parameters || [])) {
      const key = (p.export?.name || p.at5XmlAttributeName || p.canonicalName || p.canonicalParameterName || p.displayParameterName || p.displayName || '').toLowerCase().trim();
      if (key && !seenParamKeys.has(key)) {
        seenParamKeys.add(key);
        deduplicatedParams.push(p);
      } else if (!key) {
        deduplicatedParams.push(p);
      }
    }

    const currentExportNames = new Set(
      deduplicatedParams.flatMap(p => [
        p.export?.name?.toLowerCase().trim(),
        p.at5XmlAttributeName?.toLowerCase().trim(),
        p.canonicalName?.toLowerCase().trim(),
        p.canonicalParameterName?.toLowerCase().trim(),
        p.displayParameterName?.toLowerCase().trim(),
        p.displayName?.toLowerCase().trim()
      ]).filter(Boolean) as string[]
    );

    // Save/update current parameters with canonical doc IDs
    const activeDocIds = new Set<string>();
    for (const p of deduplicatedParams) {
      const exportParamName = p.export?.name || p.at5XmlAttributeName || p.canonicalName || p.displayName || 'Param';
      const canonicalParamName = p.canonicalParameterName || p.canonicalName || exportParamName;
      const displayParamName = p.displayParameterName || p.displayName || exportParamName;

      const rawId = `${profile.displayName}_${exportParamName}`;
      const mappingId = rawId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
      activeDocIds.add(mappingId);

      const mapping: ParameterMapping = {
        id: mappingId,
        gearName: profile.displayName,
        parameter: displayParamName,
        visualMin: p.visual?.min !== undefined ? Number(p.visual.min) : (p.visualMin !== undefined ? Number(p.visualMin) : 0),
        visualMax: p.visual?.max !== undefined ? Number(p.visual.max) : (p.visualMax !== undefined ? Number(p.visualMax) : 10),
        visualUnit: p.visual?.unit || p.unit || '',
        exportMin: p.export?.min !== undefined ? Number(p.export.min) : (p.exportMin !== undefined ? Number(p.exportMin) : 0),
        exportMax: p.export?.max !== undefined ? Number(p.export.max) : (p.exportMax !== undefined ? Number(p.exportMax) : 1),
        exportParameterName: exportParamName,
        conversion: (p.conversion?.mode ?? 'direct') as any,
        formula: p.conversion?.formula ?? '',
        
        // Extended fields
        gearGuid: p.gearGuid || profile.guid,
        displayParameterName: displayParamName,
        canonicalParameterName: canonicalParamName,
        aliases: p.savedAliases || p.aliases || [],
        savedAliases: p.savedAliases || p.aliases || [],
        rawMappingAliases: p.rawMappingAliases || [],
        autoGeneratedAliases: p.autoGeneratedAliases || [],
        effectiveAliases: p.effectiveAliases || Array.from(new Set([...(p.savedAliases || []), ...(p.aliases || []), displayParamName, canonicalParamName, exportParamName].filter(Boolean))),
        at5XmlAttributeName: p.at5XmlAttributeName || exportParamName,
        interfaceType: p.interfaceType,
        parameterKind: p.parameterKind,
        displayMin: p.displayMin,
        displayMax: p.displayMax,
        displayUnit: p.displayUnit,
        displayStep: p.displayStep,
        decimalPlaces: p.decimalPlaces ?? p.displayPrecision,
        displayPrecision: p.displayPrecision,
        displayDecimalPlaces: p.displayDecimalPlaces ?? p.displayPrecision,
        defaultDisplayValue: p.defaultDisplayValue,
        exportUnit: p.exportUnit,
        exportStep: p.exportStep,
        exportDecimalPlaces: p.exportDecimalPlaces ?? p.exportPrecision,
        exportPrecision: p.exportPrecision,
        defaultExportValue: p.defaultExportValue,
        translationMode: p.translationMode,
        valueMap: p.valueMap,
        reverseValueMap: p.reverseValueMap,
        helperDescription: p.helperDescription,
        exampleInput: p.exampleInput,
        exampleOutput: p.exampleOutput,
        validationStatus: p.validationStatus as any,
        mappingConfidence: p.mappingConfidence,
        source: p.source,
        doNotRequestForGear: p.doNotRequestForGear,
        unsupportedReason: p.unsupportedReason,
        reviewNotes: p.reviewNotes,
        optionRows: p.optionRows,
        valueMapJson: p.valueMapJson,
        reverseValueMapJson: p.reverseValueMapJson,
      };

      await at5DatabaseService.saveParameterMapping(mapping);
    }

    // Identify and delete orphaned or duplicate mappings in Firestore
    for (const m of relevantDb) {
      if (m.id && !activeDocIds.has(m.id)) {
        const mKeys = [
          m.parameter?.toLowerCase().trim(),
          m.displayParameterName?.toLowerCase().trim(),
          m.canonicalParameterName?.toLowerCase().trim(),
          m.exportParameterName?.toLowerCase().trim()
        ].filter(Boolean) as string[];

        const matchesAnyCurrent = mKeys.some(k => currentExportNames.has(k));
        // If it does not match any current parameter OR is an outdated duplicate doc ID, prune it
        if (!matchesAnyCurrent || relevantDb.some(other => other.id !== m.id && other.exportParameterName === m.exportParameterName)) {
          try {
            await at5DatabaseService.deleteParameterMapping(m.id);
          } catch (delErr) {
            console.warn(`Could not prune obsolete mapping ${m.id}:`, delErr);
          }
        }
      }
    }

    // Invalidate caches
    this.clearCache();

    // Refreshes the local caches
    await Promise.all([refreshCatalog(true), refreshCoreParameterMappings(true)]);
  }
};
