import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  Timestamp,
  getDoc,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { AT5CatalogItem, ParameterMapping, MicPlacementMapping, IKMPAKCandidate, RequestedParameterReview } from '../types';
import { VerifiedMapping } from './at5VerifiedProtocols';

// Enum for Operation Types (Mandatory for error logging)
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Removes 'undefined' values from an object while preserving Firestore FieldValue sentinels.
 * Firestore will reject 'undefined' but ignores missing keys.
 */
function sanitize(data: any): any {
  if (data === null || typeof data !== 'object') return data;
  
  // If it's a Firestore FieldValue (e.g. serverTimestamp), don't recurse into it.
  // FieldValue objects in the browser SDK often have a custom constructor like FieldValueImpl 
  // or they just don't have 'Object' as their constructor.
  if (data.constructor && data.constructor.name !== 'Object' && data.constructor.name !== 'Array') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      result[key] = sanitize(value);
    }
  }
  return result;
}

let catalogueCache: { data: AT5CatalogItem[]; timestamp: number } | null = null;
let parameterMappingsCache: { data: ParameterMapping[]; timestamp: number } | null = null;
let micPlacementMappingsCache: { data: MicPlacementMapping[]; timestamp: number } | null = null;
let virReferenceOverridesCache: { 
  data: { positions?: Record<string, { X: number; Y: number }>; distances?: Record<string, { Distance: number }>; angles?: Record<string, { Angle: number }> }; 
  timestamp: number 
} | null = null;
let discoveryCandidatesCache: { data: IKMPAKCandidate[]; timestamp: number } | null = null;

let inFlightCataloguePromise: Promise<AT5CatalogItem[]> | null = null;
let inFlightParameterMappingsPromise: Promise<ParameterMapping[]> | null = null;
let inFlightMicPlacementMappingsPromise: Promise<MicPlacementMapping[]> | null = null;
let inFlightVIRReferenceOverridesPromise: Promise<{ positions?: Record<string, { X: number; Y: number }>; distances?: Record<string, { Distance: number }>; angles?: Record<string, { Angle: number }> }> | null = null;
let inFlightDiscoveryCandidatesPromise: Promise<IKMPAKCandidate[]> | null = null;
const CACHE_TTL_MS = 60000;

export const at5DatabaseService = {
  clearCache() {
    catalogueCache = null;
    parameterMappingsCache = null;
    micPlacementMappingsCache = null;
    virReferenceOverridesCache = null;
    discoveryCandidatesCache = null;
    inFlightCataloguePromise = null;
    inFlightParameterMappingsPromise = null;
    inFlightMicPlacementMappingsPromise = null;
    inFlightVIRReferenceOverridesPromise = null;
    inFlightDiscoveryCandidatesPromise = null;
  },

  isCatalogueCached(): boolean {
    return Boolean(catalogueCache && (Date.now() - catalogueCache.timestamp < CACHE_TTL_MS));
  },

  isParameterMappingsCached(): boolean {
    return Boolean(parameterMappingsCache && (Date.now() - parameterMappingsCache.timestamp < CACHE_TTL_MS));
  },

  isMicPlacementMappingsCached(): boolean {
    return Boolean(micPlacementMappingsCache && (Date.now() - micPlacementMappingsCache.timestamp < CACHE_TTL_MS));
  },

  isVIRReferenceOverridesCached(): boolean {
    return Boolean(virReferenceOverridesCache && (Date.now() - virReferenceOverridesCache.timestamp < CACHE_TTL_MS));
  },

  /**
   * Main Catalogue
   */
  async getCatalogue(forceRefresh = false): Promise<AT5CatalogItem[]> {
    const t0 = performance.now();
    if (!forceRefresh && catalogueCache && (Date.now() - catalogueCache.timestamp < CACHE_TTL_MS)) {
      console.log(JSON.stringify({
        operation: 'getCatalogue',
        durationMs: Math.round(performance.now() - t0),
        docCount: catalogueCache.data.length,
        source: 'cache'
      }));
      return catalogueCache.data;
    }

    if (inFlightCataloguePromise) {
      console.log(JSON.stringify({
        operation: 'getCatalogue',
        durationMs: Math.round(performance.now() - t0),
        source: 'joined-in-flight'
      }));
      return inFlightCataloguePromise;
    }

    const path = 'catalogue';
    inFlightCataloguePromise = (async () => {
      try {
        const snapshot = await getDocs(collection(db, path));
        const data = snapshot.docs.map(doc => doc.data() as AT5CatalogItem);
        catalogueCache = { data, timestamp: Date.now() };
        console.log(JSON.stringify({
          operation: 'getCatalogue',
          durationMs: Math.round(performance.now() - t0),
          docCount: data.length,
          source: 'firestore'
        }));
        return data;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return [];
      } finally {
        inFlightCataloguePromise = null;
      }
    })();

    return inFlightCataloguePromise;
  },

  async saveGearItem(gear: AT5CatalogItem) {
    catalogueCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to save gear");
    if (!gear.guid || gear.guid.length < 5) throw new Error(`Invalid GUID: ${gear.guid}`);
    
    const path = `catalogue/${gear.guid}`;
    try {
      const data = sanitize({
        ...gear,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid
      });
      await setDoc(doc(db, 'catalogue', gear.guid), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  /**
   * Verified Mappings
   */
  async getVerifiedMappings(type: 'cabs' | 'speakers' | 'mics'): Promise<VerifiedMapping[]> {
    const path = `verified_${type}`;
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => doc.data() as VerifiedMapping);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveVerifiedMapping(type: 'cabs' | 'speakers' | 'mics', mapping: VerifiedMapping) {
    if (!auth.currentUser) throw new Error("Must be signed in to verify protocols");
    if (!mapping.guid || mapping.guid.length < 5) throw new Error(`Invalid GUID: ${mapping.guid}`);

    const path = `verified_${type}/${mapping.guid}`;
    try {
      const data = sanitize({
        ...mapping,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid
      });
      await setDoc(doc(db, `verified_${type}`, mapping.guid), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteGearItem(guid: string) {
    catalogueCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to delete gear");
    const path = `catalogue/${guid}`;
    try {
      await deleteDoc(doc(db, 'catalogue', guid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteVerifiedMapping(type: 'cabs' | 'speakers' | 'mics', guid: string) {
    if (!auth.currentUser) throw new Error("Must be signed in to delete mappings");
    const path = `verified_${type}/${guid}`;
    try {
      await deleteDoc(doc(db, `verified_${type}`, guid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Seeding utility (Uses Batches for efficiency)
   */
  async seedDatabase(staticCatalog: AT5CatalogItem[], staticMappings: { cabs: VerifiedMapping[], speakers: VerifiedMapping[], mics: VerifiedMapping[] }) {
    if (!auth.currentUser) throw new Error("Must be signed in to seed");
    
    console.log("Seeding began (Using Batches)...");
    const batchSize = 400; // Firestore limit is 500
    
    const seedCollection = async (items: any[], type: 'gear' | 'mapping', mappingType?: 'cabs' | 'speakers' | 'mics') => {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = items.slice(i, i + batchSize);
        
        chunk.forEach(item => {
          const docRef = type === 'gear' 
            ? doc(db, 'catalogue', item.guid)
            : doc(db, `verified_${mappingType}`, item.guid);
            
          batch.set(docRef, sanitize({
            ...item,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser!.uid
          }));
        });
        
        await batch.commit();
        console.log(`Committed batch ${i / batchSize + 1}`);
      }
    };

    try {
      await seedCollection(staticCatalog, 'gear');
      await seedCollection(staticMappings.cabs, 'mapping', 'cabs');
      await seedCollection(staticMappings.speakers, 'mapping', 'speakers');
      await seedCollection(staticMappings.mics, 'mapping', 'mics');
      console.log("Seeding complete!");
    } catch (error) {
       console.error("Batch seed failed:", error);
       handleFirestoreError(error, OperationType.WRITE, "BATCH_SEED");
    }
  },

  /**
   * Gear Discovery Parameter Mappings
   */
  async getParameterMappings(forceRefresh = false): Promise<ParameterMapping[]> {
    const t0 = performance.now();
    if (!forceRefresh && parameterMappingsCache && (Date.now() - parameterMappingsCache.timestamp < CACHE_TTL_MS)) {
      console.log(JSON.stringify({
        operation: 'getParameterMappings',
        durationMs: Math.round(performance.now() - t0),
        parameterMappingCount: parameterMappingsCache.data.length,
        source: 'cache'
      }));
      return parameterMappingsCache.data;
    }

    if (inFlightParameterMappingsPromise) {
      console.log(JSON.stringify({
        operation: 'getParameterMappings',
        durationMs: Math.round(performance.now() - t0),
        source: 'joined-in-flight'
      }));
      return inFlightParameterMappingsPromise;
    }

    const path = 'parameter_mappings';
    inFlightParameterMappingsPromise = (async () => {
      try {
        const snapshot = await getDocs(collection(db, path));
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            ...d,
            id: doc.id
          } as ParameterMapping;
        });
        parameterMappingsCache = { data, timestamp: Date.now() };

        console.log(JSON.stringify({
          operation: 'getParameterMappings',
          durationMs: Math.round(performance.now() - t0),
          parameterMappingCount: data.length,
          source: 'firestore'
        }));
        return data;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return [];
      } finally {
        inFlightParameterMappingsPromise = null;
      }
    })();

    return inFlightParameterMappingsPromise;
  },

  async saveParameterMapping(mapping: ParameterMapping) {
    parameterMappingsCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to save parameter mappings");
    
    // Generate a unique doc id based on gearName + canonical AT5 XML export attribute / canonical name
    const exportParamKey = mapping.exportParameterName || mapping.at5XmlAttributeName || mapping.canonicalParameterName || mapping.parameter || 'param';
    const rawId = mapping.id || `${mapping.gearName || 'gear'}_${exportParamKey}`;
    const mappingId = rawId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
    
    const path = `parameter_mappings/${mappingId}`;
    try {
      const exportParamName = mapping.exportParameterName || mapping.at5XmlAttributeName || mapping.canonicalParameterName || mapping.parameter || 'unknown';
      const conversionMode = mapping.conversion || 'direct';
      const data = sanitize({
        ...mapping,
        exportParameterName: exportParamName,
        conversion: conversionMode,
        id: mappingId,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid
      });

      await setDoc(doc(db, 'parameter_mappings', mappingId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteParameterMapping(id: string) {
    parameterMappingsCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to delete parameter mappings");
    const path = `parameter_mappings/${id}`;
    try {
      await deleteDoc(doc(db, 'parameter_mappings', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getMicPlacementMappings(forceRefresh = false): Promise<MicPlacementMapping[]> {
    const t0 = performance.now();
    if (!forceRefresh && micPlacementMappingsCache && (Date.now() - micPlacementMappingsCache.timestamp < CACHE_TTL_MS)) {
      console.log(JSON.stringify({
        operation: 'getMicPlacementMappings',
        durationMs: Math.round(performance.now() - t0),
        mappingCount: micPlacementMappingsCache.data.length,
        source: 'cache'
      }));
      return micPlacementMappingsCache.data;
    }

    if (inFlightMicPlacementMappingsPromise) {
      console.log(JSON.stringify({
        operation: 'getMicPlacementMappings',
        durationMs: Math.round(performance.now() - t0),
        source: 'joined-in-flight'
      }));
      return inFlightMicPlacementMappingsPromise;
    }

    const path = 'mic_placement_mappings';
    inFlightMicPlacementMappingsPromise = (async () => {
      try {
        const snapshot = await getDocs(collection(db, path));
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          const persistentDocId = doc.id;
          return {
            ...docData,
            id: persistentDocId,
            firestoreDocumentId: persistentDocId,
            firestoreDocumentPath: `mic_placement_mappings/${persistentDocId}`,
            originalProfileId: (docData.id as string) || persistentDocId
          } as unknown as MicPlacementMapping;
        });

        micPlacementMappingsCache = {
          data,
          timestamp: Date.now()
        };

        console.log(JSON.stringify({
          operation: 'getMicPlacementMappings',
          durationMs: Math.round(performance.now() - t0),
          mappingCount: data.length,
          source: 'firestore'
        }));

        return data;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        if (micPlacementMappingsCache) {
          return micPlacementMappingsCache.data;
        }
        return [];
      } finally {
        inFlightMicPlacementMappingsPromise = null;
      }
    })();

    return inFlightMicPlacementMappingsPromise;
  },

  async saveMicPlacementMapping(mapping: MicPlacementMapping) {
    micPlacementMappingsCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to save mic placement mappings");
    
    const mappingId = mapping.id || `${mapping.gear}_${mapping.friendly_setting}_${mapping.friendly_value}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
    
    const path = `mic_placement_mappings/${mappingId}`;
    try {
      const explicitStatus = mapping.status || mapping.validation_status || mapping.validationStatus;
      const statusValue = explicitStatus || "needs_review";

      // If an existing mapping ID is provided, enforce that identity fields cannot be modified
      let protectedIdentity: Partial<MicPlacementMapping> = {};
      let existingSnap: any = undefined;
      if (mapping.id) {
        try {
          existingSnap = await getDoc(doc(db, 'mic_placement_mappings', mapping.id));
          if (existingSnap.exists()) {
            const existingData = existingSnap.data();
            protectedIdentity = {
              gear: existingData.gear,
              cabName: existingData.cabName || existingData.gear,
              cabGuid: existingData.cabGuid,
              micSlot: existingData.micSlot,
              micIndex: existingData.micIndex,
              friendly_setting: existingData.friendly_setting,
              target: existingData.target || existingData.friendly_setting,
              micModelName: existingData.micModelName,
              micModelGuid: existingData.micModelGuid,
              micModelScope: existingData.micModelScope,
              speakerModelName: existingData.speakerModelName,
              speakerModelGuid: existingData.speakerModelGuid
            };
          }
        } catch (e) {
          // Continue with incoming identity if read fails
        }
      }

      const data = sanitize({
        ...mapping,
        ...protectedIdentity,
        id: mappingId,
        friendly_setting: protectedIdentity.friendly_setting || mapping.friendly_setting || mapping.target,
        friendly_value: mapping.friendly_value || mapping.friendly_name || mapping.canonicalPlacementName,
        canonicalPlacementName: mapping.canonicalPlacementName || mapping.friendly_value || mapping.friendly_name,
        maps_to: mapping.maps_to || mapping.xml_values || {},
        target: protectedIdentity.target || mapping.friendly_setting || mapping.target,
        friendly_name: mapping.friendly_value || mapping.friendly_name || mapping.canonicalPlacementName,
        xml_values: mapping.maps_to || mapping.xml_values || {},
        status: statusValue,
        validation_status: statusValue,
        notes: mapping.notes !== undefined ? mapping.notes : (existingSnap?.exists() ? existingSnap.data().notes : undefined),
        source: mapping.source || "User Manual Entry",
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid
      });
      await setDoc(doc(db, 'mic_placement_mappings', mappingId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteMicPlacementMapping(id: string) {
    micPlacementMappingsCache = null;
    const trimmedId = id?.trim();
    if (!trimmedId) throw new Error("A valid document ID is required to delete mic placement mappings");
    if (!auth.currentUser && process.env.NODE_ENV !== 'test') {
      throw new Error("Must be signed in to delete mic placement mappings");
    }
    const path = `mic_placement_mappings/${trimmedId}`;
    try {
      await deleteDoc(doc(db, 'mic_placement_mappings', trimmedId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * Durable TT-managed VIR Reference Calibration Persistence (Firestore)
   */
  async getVIRReferenceOverrides(forceRefresh = false): Promise<{ positions?: Record<string, { X: number; Y: number }>; distances?: Record<string, { Distance: number }>; angles?: Record<string, { Angle: number }> }> {
    const t0 = performance.now();
    if (!forceRefresh && virReferenceOverridesCache && (Date.now() - virReferenceOverridesCache.timestamp < CACHE_TTL_MS)) {
      console.log(JSON.stringify({
        operation: 'getVIRReferenceOverrides',
        durationMs: Math.round(performance.now() - t0),
        source: 'cache'
      }));
      return virReferenceOverridesCache.data;
    }

    if (inFlightVIRReferenceOverridesPromise) {
      console.log(JSON.stringify({
        operation: 'getVIRReferenceOverrides',
        durationMs: Math.round(performance.now() - t0),
        source: 'joined-in-flight'
      }));
      return inFlightVIRReferenceOverridesPromise;
    }

    const path = 'system_calibrations/vir_reference';
    inFlightVIRReferenceOverridesPromise = (async () => {
      try {
        const snap = await getDoc(doc(db, 'system_calibrations', 'vir_reference'));
        let res = {};
        if (snap.exists()) {
          const d = snap.data();
          res = {
            positions: d.positions || {},
            distances: d.distances || {},
            angles: d.angles || {}
          };
        }

        virReferenceOverridesCache = {
          data: res,
          timestamp: Date.now()
        };

        console.log(JSON.stringify({
          operation: 'getVIRReferenceOverrides',
          durationMs: Math.round(performance.now() - t0),
          source: 'firestore'
        }));

        return res;
      } catch (error) {
        console.warn('Could not read VIR reference overrides from Firestore, using baseline:', error);
        if (virReferenceOverridesCache) {
          return virReferenceOverridesCache.data;
        }
        return {};
      } finally {
        inFlightVIRReferenceOverridesPromise = null;
      }
    })();

    return inFlightVIRReferenceOverridesPromise;
  },

  async saveVIRReferenceOverrides(overrides: { positions?: Record<string, { X: number; Y: number }>; distances?: Record<string, { Distance: number }>; angles?: Record<string, { Angle: number }> }) {
    virReferenceOverridesCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to save VIR reference calibration");
    const path = 'system_calibrations/vir_reference';
    try {
      const data = sanitize({
        id: 'vir_reference',
        positions: overrides.positions || {},
        distances: overrides.distances || {},
        angles: overrides.angles || {},
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid
      });
      await setDoc(doc(db, 'system_calibrations', 'vir_reference'), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async resetVIRReferenceOverrides() {
    virReferenceOverridesCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to reset VIR reference calibration");
    const path = 'system_calibrations/vir_reference';
    try {
      await deleteDoc(doc(db, 'system_calibrations', 'vir_reference'));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  /**
   * IKMPAK Gear Discovery Accelerator Candidates (Staging)
   */
  async getDiscoveryCandidates(forceRefresh = false): Promise<IKMPAKCandidate[]> {
    const t0 = performance.now();
    if (!forceRefresh && discoveryCandidatesCache && (Date.now() - discoveryCandidatesCache.timestamp < CACHE_TTL_MS)) {
      console.log(JSON.stringify({
        operation: 'getDiscoveryCandidates',
        durationMs: Math.round(performance.now() - t0),
        docCount: discoveryCandidatesCache.data.length,
        source: 'cache'
      }));
      return discoveryCandidatesCache.data;
    }

    if (inFlightDiscoveryCandidatesPromise) {
      console.log(JSON.stringify({
        operation: 'getDiscoveryCandidates',
        durationMs: Math.round(performance.now() - t0),
        source: 'joined-in-flight'
      }));
      return inFlightDiscoveryCandidatesPromise;
    }

    const path = 'gear_discovery_candidates';
    inFlightDiscoveryCandidatesPromise = (async () => {
      try {
        const snapshot = await getDocs(collection(db, path));
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            ...d,
            id: doc.id
          } as IKMPAKCandidate;
        });
        discoveryCandidatesCache = { data, timestamp: Date.now() };
        console.log(JSON.stringify({
          operation: 'getDiscoveryCandidates',
          durationMs: Math.round(performance.now() - t0),
          docCount: data.length,
          source: 'firestore'
        }));
        return data;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
        return [];
      } finally {
        inFlightDiscoveryCandidatesPromise = null;
      }
    })();

    return inFlightDiscoveryCandidatesPromise;
  },

  async saveDiscoveryCandidate(candidate: IKMPAKCandidate) {
    discoveryCandidatesCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to save discovery candidate");
    const docId = candidate.id || candidate.guid || `${candidate.candidateGearType}-${candidate.name}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const path = `gear_discovery_candidates/${docId}`;
    try {
      const data = sanitize({
        ...candidate,
        id: docId,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid
      });
      await setDoc(doc(db, 'gear_discovery_candidates', docId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveDiscoveryCandidates(candidates: IKMPAKCandidate[]) {
    discoveryCandidatesCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to save candidates");
    const batchSize = 400;
    try {
      for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = candidates.slice(i, i + batchSize);
        chunk.forEach(candidate => {
          const docId = candidate.id || candidate.guid || `${candidate.candidateGearType}-${candidate.name}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
          const docRef = doc(db, 'gear_discovery_candidates', docId);
          batch.set(docRef, sanitize({
            ...candidate,
            id: docId,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser!.uid
          }));
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'BATCH_SAVE_CANDIDATES');
    }
  },

  async deleteDiscoveryCandidate(id: string) {
    discoveryCandidatesCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to delete discovery candidate");
    const path = `gear_discovery_candidates/${id}`;
    try {
      await deleteDoc(doc(db, 'gear_discovery_candidates', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async clearAllDiscoveryCandidates() {
    discoveryCandidatesCache = null;
    if (!auth.currentUser) throw new Error("Must be signed in to clear candidates");
    const path = 'gear_discovery_candidates';
    try {
      const snapshot = await getDocs(collection(db, path));
      const batchSize = 400;
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + batchSize);
        chunk.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'CLEAR_CANDIDATES');
    }
  },

  /**
   * Requested Parameter Reviews
   */
  async getRequestedParameterReviews(): Promise<RequestedParameterReview[]> {
    const path = 'requested_parameter_reviews';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id
        } as RequestedParameterReview;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveRequestedParameterReview(review: RequestedParameterReview) {
    if (!auth.currentUser) throw new Error("Must be signed in to save parameter review");
    const docId = review.id || `${review.gearGuid || review.gearName}_${review.requestedParameterName}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const path = `requested_parameter_reviews/${docId}`;
    try {
      const data = sanitize({
        ...review,
        id: docId,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid
      });
      await setDoc(doc(db, 'requested_parameter_reviews', docId), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteRequestedParameterReview(id: string) {
    if (!auth.currentUser) throw new Error("Must be signed in to delete parameter review");
    const path = `requested_parameter_reviews/${id}`;
    try {
      await deleteDoc(doc(db, 'requested_parameter_reviews', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async recordRequestedParameterForReview(
    gearName: string,
    gearGuid: string | undefined,
    requestedParameterName: string,
    requestedValue: any,
    suggestedMatches: string[] = [],
    sourceToneRequest?: string
  ): Promise<void> {
    try {
      const cleanParamName = requestedParameterName.trim();
      const reviews = await this.getRequestedParameterReviews();
      const docId = `${gearGuid || gearName}_${cleanParamName}`.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const existing = reviews.find(r => r.id === docId);

      const nowStr = new Date().toISOString();

      if (existing) {
        existing.occurrenceCount = (existing.occurrenceCount || 0) + 1;
        existing.lastSeen = nowStr;
        existing.requestedValue = requestedValue;
        if (sourceToneRequest) {
          existing.sourceToneRequest = sourceToneRequest;
        }
        await this.saveRequestedParameterReview(existing);
      } else {
        const newReview: RequestedParameterReview = {
          id: docId,
          gearName,
          gearGuid,
          requestedParameterName: cleanParamName,
          requestedValue,
          occurrenceCount: 1,
          firstSeen: nowStr,
          lastSeen: nowStr,
          sourceToneRequest: sourceToneRequest || 'Direct Export Request',
          suggestedMatches,
          status: 'CHECK',
          notes: ''
        };
        await this.saveRequestedParameterReview(newReview);
      }
    } catch (e) {
      console.error("Failed to record requested parameter for review:", e);
    }
  }
};


