import { AT5_VERIFIED_GEAR, VerifiedParamDef } from './at5VerifiedParameterOverrides';
import { getVerifiedCabs, getVerifiedMics, getVerifiedSpeakers } from './at5VerifiedProtocols';
import { getAt5Catalog, refreshCatalog } from './at5Catalog';
import { refreshDbParameterMappings } from './at5ParameterManifest';
import { at5DatabaseService } from './at5DatabaseService';
import { GearProfile, GearProfileParameter, AT5CatalogItem, ParameterMapping } from '../types';

export const gearProfileService = {
  /**
   * Retrieves all items merged on-the-fly into GearProfile objects
   */
  async getGearProfiles(): Promise<GearProfile[]> {
    // 1. Fetch latest details
    const catalogItems = getAt5Catalog() || [];
    const cabs = getVerifiedCabs() || [];
    const speakers = getVerifiedSpeakers() || [];
    const mics = getVerifiedMics() || [];
    
    // Asynchronously download remote overrides from firestore
    const dbMappings = await at5DatabaseService.getParameterMappings();

    const profiles: GearProfile[] = [];
    const seenGuids = new Set<string>();

    // Helper to normalize GUIDs for solid matching
    const normGuid = (g: string) => g ? g.toLowerCase().replace(/-/g, '').trim() : '';

    // Combine all inputs
    // Start with catalogItems
    for (const item of catalogItems) {
      const guid = item.guid || '';
      const nGuid = normGuid(guid);
      
      const type = item.group; // 'amp', 'stomp', 'rack', 'cab', etc.
      const displayName = item.displayName;
      const aliases = Array.from(new Set([
        ...(item.otherNames || []),
        ...(item.examplePresets || [])
      ]));

      const id = nGuid ? `gear-${nGuid}` : `gear-${normaliseName(displayName)}-${type}`;

      // Build parameters base for this item
      const parameters = this.mergeParameters(item, displayName, nGuid, dbMappings);

      // Check validation
      const validation = this.evaluateValidation(type, guid, aliases, parameters);

      profiles.push({
        id,
        displayName,
        type,
        guid,
        slot: item.slot || '',
        aliases,
        parameters,
        validation,
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

    return profiles;
  },

  /**
   * Helper to check if a DB mapping matches a gear's name or aliases
   */
  isMappingForGear(m: ParameterMapping, displayName: string, aliases: string[]): boolean {
    const rawG = normaliseName(m.gearName);
    if (!rawG) return false;
    if (rawG === normaliseName(displayName)) return true;
    return aliases.some(a => normaliseName(a) === rawG);
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
      (normaliseName(v.name) === normaliseName(displayName))
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
      ...(item.otherNames || []).map(normaliseName),
      ...(item.examplePresets || []).map(normaliseName)
    ]);
    const relevantDb = dbMappings.filter(m => aliasSet.has(normaliseName(m.gearName)));

    for (const dbM of relevantDb) {
      const key = dbM.parameter.toLowerCase().trim();
      const existing = paramsMap.get(key);

      const valStatus = (dbM.conversion && dbM.conversion !== 'unknown') ? 'PASS' : 'WARN';

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
      } else {
        paramsMap.set(key, {
          displayName: dbM.parameter,
          canonicalName: dbM.exportParameterName,
          aliases: [],
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
          validationStatus: valStatus
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

    // Identity Checks
    if (!guid || guid.trim().length === 0) {
      gaps.push('Missing GUID');
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guid)) {
      gaps.push('Invalid GUID structure');
    }

    if (!aliases || aliases.length === 0) {
      gaps.push('Missing aliases');
    }

    // Parameter checks
    if (!parameters || parameters.length === 0) {
      if (type !== 'cab' && type !== 'speaker' && type !== 'mic') {
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
      }))
    };

    if (profile.guid && profile.guid.length > 5) {
      // Save item to catalogue
      await at5DatabaseService.saveGearItem(updatedCatalogGear);
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
    const relevantDb = dbMappings.filter(m => this.isMappingForGear(m, profile.displayName, profile.aliases || []));
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
          formula: p.conversion?.formula ?? ''
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
