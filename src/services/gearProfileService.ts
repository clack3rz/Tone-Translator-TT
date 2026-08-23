import { AT5_VERIFIED_GEAR, VerifiedParamDef } from './at5VerifiedParameterOverrides';
import { getVerifiedCabs, getVerifiedMics, getVerifiedSpeakers } from './at5VerifiedProtocols';
import { getAt5Catalog, refreshCatalog, cleanGearNameForMatching } from './at5Catalog';
import { refreshDbParameterMappings } from './at5ParameterManifest';
import { at5DatabaseService } from './at5DatabaseService';
import { GearProfile, GearProfileParameter, AT5CatalogItem, ParameterMapping } from '../types';

let profilesCache: { data: GearProfile[]; timestamp: number } | null = null;

export const gearProfileService = {
  clearCache() {
    profilesCache = null;
    at5DatabaseService.clearCache();
  },

  /**
   * Retrieves all items merged on-the-fly into GearProfile objects
   */
  async getGearProfiles(forceRefresh = false): Promise<GearProfile[]> {
    const t0 = performance.now();
    if (!forceRefresh && profilesCache && (Date.now() - profilesCache.timestamp < 60000)) {
      console.log(JSON.stringify({
        operation: 'getGearProfiles',
        durationMs: Math.round(performance.now() - t0),
        profileCount: profilesCache.data.length,
        source: 'cache'
      }));
      return profilesCache.data;
    }

    // 1. Fetch latest details
    await refreshCatalog();
    await refreshDbParameterMappings();
    const catalogItems = getAt5Catalog() || [];
    const cabs = getVerifiedCabs() || [];
    const speakers = getVerifiedSpeakers() || [];
    const mics = getVerifiedMics() || [];
    
    // Asynchronously download remote overrides from firestore
    const dbMappings = await at5DatabaseService.getParameterMappings(forceRefresh);

    const profiles: GearProfile[] = [];
    const seenGuids = new Set<string>();

    // Helper to normalize GUIDs for solid matching
    const normGuid = (g: string) => g ? g.toLowerCase().replace(/-/g, '').trim() : '';

    // Combine all inputs
    // Start with catalogItems
    for (const item of catalogItems) {
      const guid = item.guid || '';
      const nGuid = normGuid(guid);
      
      let type = item.group; // 'amp', 'stomp', 'rack', 'cab', etc.
      let displayName = item.displayName;
      const aliases = Array.from(new Set([
        ...(item.otherNames || []),
        ...(item.examplePresets || [])
      ]));

      let id = nGuid ? 
        (guid.startsWith('gear-') || guid.startsWith('name-') || guid.startsWith('name_') ? guid : `gear-${nGuid}`) : 
        `gear-${normaliseName(displayName)}-${type}`;

      // Darrell 100 normalization
      const cleanName = displayName.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      if (cleanName === "darrell100" || cleanName === "darrell 100" || displayName === "Darrell 100") {
        id = "amp_darrell_100";
        displayName = "Darrell 100";
        type = "amp";
      }

      // Build parameters base for this item
      const parameters = this.mergeParameters(item, displayName, nGuid, dbMappings);

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
          mappings: dbMappings.filter(m => this.isMappingForGear(m, displayName, aliases)),
          verified: AT5_VERIFIED_GEAR.find(v => 
            (v.realId && normGuid(v.realId) === nGuid) || 
            (normaliseName(v.name) === normaliseName(displayName))
          )
        }
      });

      if (nGuid) {
        seenGuids.add(nGuid);
      }
    }

    // Add unmatched verified cabs
    for (const cab of cabs) {
      const nGuid = normGuid(cab.guid);
      if (nGuid && seenGuids.has(nGuid)) continue;

      const id = `gear-${nGuid}`;
      const displayName = cab.aliases?.[0] || 'Unknown Verified Cabinet';
      const type = 'cab';
      const aliases = cab.aliases || [];

      const parameters = this.mergeParameters({ displayName, guid: cab.guid, group: 'cab', slot: 'CabA' }, displayName, nGuid, dbMappings);
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
          mappings: dbMappings.filter(m => this.isMappingForGear(m, displayName, aliases)),
          verifiedProtocol: cab
        }
      });
      if (nGuid) seenGuids.add(nGuid);
    }

    // Add unmatched verified speakers
    for (const speaker of speakers) {
      const nGuid = normGuid(speaker.guid);
      if (nGuid && seenGuids.has(nGuid)) continue;

      const id = `gear-${nGuid}`;
      const displayName = speaker.aliases?.[0] || 'Unknown Verified Speaker';
      const type = 'speaker';
      const aliases = speaker.aliases || [];

      const parameters = this.mergeParameters({ displayName, guid: speaker.guid, group: 'speaker', slot: 'Speaker' }, displayName, nGuid, dbMappings);
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
          mappings: dbMappings.filter(m => this.isMappingForGear(m, displayName, aliases)),
          verifiedProtocol: speaker
        }
      });
      if (nGuid) seenGuids.add(nGuid);
    }

    // Add unmatched verified mics
    for (const mic of mics) {
      const nGuid = normGuid(mic.guid);
      if (nGuid && seenGuids.has(nGuid)) continue;

      const id = `gear-${nGuid}`;
      const displayName = mic.aliases?.[0] || 'Unknown Verified Mic';
      const type = 'mic';
      const aliases = mic.aliases || [];

      const parameters = this.mergeParameters({ displayName, guid: mic.guid, group: 'mic', slot: 'Mic' }, displayName, nGuid, dbMappings);
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
          mappings: dbMappings.filter(m => this.isMappingForGear(m, displayName, aliases)),
          verifiedProtocol: mic
        }
      });
      if (nGuid) seenGuids.add(nGuid);
    }

    profilesCache = { data: profiles, timestamp: Date.now() };
    console.log(JSON.stringify({
      operation: 'getGearProfiles',
      durationMs: Math.round(performance.now() - t0),
      profileCount: profiles.length,
      parameterMappingCount: dbMappings.length,
      source: 'firestore'
    }));

    return profiles;
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
    dbMappings: ParameterMapping[]
  ): GearProfileParameter[] {
    const paramsMap = new Map<string, GearProfileParameter>();

    // 1. Load AT5_VERIFIED_GEAR override parameters if present
    const verifiedGear = AT5_VERIFIED_GEAR.find(v => 
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
    const aliasSet = new Set([
      normaliseName(displayName),
      cleanGearNameForMatching(displayName),
      ...(item.otherNames || []).map(normaliseName),
      ...(item.otherNames || []).map(cleanGearNameForMatching),
      ...(item.examplePresets || []).map(normaliseName),
      ...(item.examplePresets || []).map(cleanGearNameForMatching)
    ]);
    const relevantDb = dbMappings.filter(m => {
      if (aliasSet.has(normaliseName(m.gearName))) return true;
      if (aliasSet.has(cleanGearNameForMatching(m.gearName))) return true;
      if (m.gearGuid && normalizedGuid && m.gearGuid.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedGuid.toLowerCase().replace(/[^a-z0-9]/g, '')) return true;
      return false;
    });

    for (const dbM of relevantDb) {
      const targetKeys = [
        dbM.parameter,
        dbM.exportParameterName,
        dbM.canonicalParameterName,
        dbM.displayParameterName
      ].filter(Boolean).map(s => s!.toLowerCase().trim());

      let existing: GearProfileParameter | undefined = undefined;
      for (const k of targetKeys) {
        if (paramsMap.has(k)) {
          existing = paramsMap.get(k);
          break;
        }
      }

      if (!existing) {
        for (const p of paramsMap.values()) {
          const namesToCompare = [
            p.displayName,
            p.canonicalName,
            p.export?.name,
            ...(p.aliases || []),
            ...(p.effectiveAliases || [])
          ].filter(Boolean).map(s => s.toLowerCase().trim());

          if (targetKeys.some(tk => namesToCompare.includes(tk))) {
            existing = p;
            break;
          }
        }
      }

      const valStatus = (dbM.conversion && dbM.conversion !== 'unknown') ? 'PASS' : 'WARN';

      const dbAliases = Array.isArray(dbM.aliases) ? dbM.aliases : [];

      if (existing) {
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
        existing.canonicalName = dbM.exportParameterName || existing.canonicalName;
        existing.validationStatus = valStatus;

        const dbSavedAliases = (dbM.savedAliases && dbM.savedAliases.length > 0) ? dbM.savedAliases : (dbM.aliases || []);
        const dbRawAliases = dbM.rawMappingAliases || dbM.aliases || [];
        const dbAutoAliases = dbM.autoGeneratedAliases || [];

        const mergedSaved = Array.from(new Set([
          ...dbSavedAliases,
          ...(existing.savedAliases || []),
          ...(existing.aliases || [])
        ].filter(Boolean)));

        existing.aliases = mergedSaved;
        existing.savedAliases = mergedSaved;
        existing.rawMappingAliases = Array.from(new Set([...(existing.rawMappingAliases || []), ...dbRawAliases].filter(Boolean)));
        existing.autoGeneratedAliases = Array.from(new Set([...(existing.autoGeneratedAliases || []), ...dbAutoAliases].filter(Boolean)));
        existing.effectiveAliases = Array.from(new Set([
          ...mergedSaved,
          ...(existing.rawMappingAliases || []),
          ...(existing.autoGeneratedAliases || []),
          ...(dbM.effectiveAliases || []),
          ...(existing.effectiveAliases || []),
          existing.displayName,
          existing.canonicalName,
          existing.export?.name
        ].filter(Boolean)));

        // Propagate extended fields
        existing.gearGuid = dbM.gearGuid;
        existing.displayParameterName = dbM.displayParameterName;
        existing.canonicalParameterName = dbM.canonicalParameterName;
        existing.at5XmlAttributeName = dbM.at5XmlAttributeName;
        existing.interfaceType = dbM.interfaceType;
        existing.parameterKind = dbM.parameterKind;
        existing.displayMin = dbM.displayMin;
        existing.displayMax = dbM.displayMax;
        existing.displayUnit = dbM.displayUnit;
        existing.displayStep = dbM.displayStep;
        existing.decimalPlaces = dbM.decimalPlaces;
        existing.displayPrecision = dbM.displayPrecision;
        existing.displayDecimalPlaces = dbM.displayDecimalPlaces;
        existing.defaultDisplayValue = dbM.defaultDisplayValue;
        existing.exportUnit = dbM.exportUnit;
        existing.exportStep = dbM.exportStep;
        existing.exportDecimalPlaces = dbM.exportDecimalPlaces;
        existing.exportPrecision = dbM.exportPrecision;
        existing.defaultExportValue = dbM.defaultExportValue;
        existing.translationMode = dbM.translationMode;
        existing.valueMap = dbM.valueMap;
        existing.reverseValueMap = dbM.reverseValueMap;
        existing.helperDescription = dbM.helperDescription;
        existing.exampleInput = dbM.exampleInput;
        existing.exampleOutput = dbM.exampleOutput;
        existing.mappingConfidence = dbM.mappingConfidence;
        existing.source = dbM.source;
        existing.doNotRequestForGear = dbM.doNotRequestForGear;
        existing.unsupportedReason = dbM.unsupportedReason;
        existing.reviewNotes = dbM.reviewNotes;
        existing.optionRows = dbM.optionRows;
        existing.valueMapJson = dbM.valueMapJson;
        existing.reverseValueMapJson = dbM.reverseValueMapJson;
      } else {
        const dbSavedAliases = (dbM.savedAliases && dbM.savedAliases.length > 0) ? dbM.savedAliases : (dbM.aliases || []);
        const dbRawAliases = dbM.rawMappingAliases || dbM.aliases || [];
        const dbAutoAliases = dbM.autoGeneratedAliases || [];

        const newKey = (dbM.exportParameterName || dbM.parameter).toLowerCase().trim();
        paramsMap.set(newKey, {
          displayName: dbM.parameter,
          canonicalName: dbM.exportParameterName,
          aliases: dbSavedAliases,
          savedAliases: dbSavedAliases,
          rawMappingAliases: dbRawAliases,
          autoGeneratedAliases: dbAutoAliases,
          effectiveAliases: Array.from(new Set([
            ...dbSavedAliases,
            ...dbRawAliases,
            ...dbAutoAliases,
            ...(dbM.effectiveAliases || []),
            dbM.parameter,
            dbM.exportParameterName
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
          displayParameterName: dbM.displayParameterName,
          canonicalParameterName: dbM.canonicalParameterName,
          at5XmlAttributeName: dbM.at5XmlAttributeName,
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
          reverseValueMapJson: dbM.reverseValueMapJson
        });
      }
    }

    return Array.from(paramsMap.values());
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

    // 3. Prune obsolete parameter mappings and save current ones
    const dbMappings = await at5DatabaseService.getParameterMappings();
    const relevantDb = dbMappings.filter(m => this.isMappingForGear(m, profile.displayName, profile.aliases || [], profile.guid));
    const currentParamNames = new Set(
      profile.parameters.map(p => p.displayName.toLowerCase().trim())
    );

    // Identify and delete mappings that are no longer in the parameters list
    for (const m of relevantDb) {
      if (!currentParamNames.has(m.parameter.toLowerCase().trim()) && m.id) {
        await at5DatabaseService.deleteParameterMapping(m.id);
      }
    }

    // Save/update current parameters
    for (const p of profile.parameters) {
      // Only save if it has a valid mapping/export name set
      if (p.export && p.export.name) {
        const mapping: ParameterMapping = {
          gearName: profile.displayName,
          parameter: p.displayName,
          visualMin: p.visual?.min ?? 0,
          visualMax: p.visual?.max ?? 10,
          visualUnit: p.visual?.unit || '',
          exportMin: p.export?.min ?? 0,
          exportMax: p.export?.max ?? 1,
          exportParameterName: p.export?.name || p.canonicalName,
          conversion: (p.conversion?.mode ?? 'direct') as any,
          formula: p.conversion?.formula ?? '',
          
          // Extended fields
          gearGuid: p.gearGuid || profile.guid,
          displayParameterName: p.displayParameterName || p.displayName,
          canonicalParameterName: p.canonicalParameterName || p.canonicalName || p.export?.name,
          aliases: Array.from(new Set([...(p.savedAliases || []), ...(p.aliases || []), ...(p.effectiveAliases || [])].filter(Boolean))),
          savedAliases: p.savedAliases || p.aliases || [],
          rawMappingAliases: p.rawMappingAliases || [],
          autoGeneratedAliases: p.autoGeneratedAliases || [],
          effectiveAliases: p.effectiveAliases || Array.from(new Set([...(p.savedAliases || []), ...(p.aliases || []), p.displayName, p.canonicalName, p.export?.name].filter(Boolean))),
          at5XmlAttributeName: p.at5XmlAttributeName,
          interfaceType: p.interfaceType,
          parameterKind: p.parameterKind,
          displayMin: p.displayMin,
          displayMax: p.displayMax,
          displayUnit: p.displayUnit,
          displayStep: p.displayStep,
          decimalPlaces: p.decimalPlaces,
          displayPrecision: p.displayPrecision,
          displayDecimalPlaces: p.displayDecimalPlaces,
          defaultDisplayValue: p.defaultDisplayValue,
          exportUnit: p.exportUnit,
          exportStep: p.exportStep,
          exportDecimalPlaces: p.exportDecimalPlaces,
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
    }

    // Refreshes the local caches
    await Promise.all([refreshCatalog(), refreshDbParameterMappings()]);
  }
};

const normaliseName = (value: string) =>
  value
    ? value
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
    : "";
