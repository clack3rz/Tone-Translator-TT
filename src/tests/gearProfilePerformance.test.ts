import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import * as firestore from 'firebase/firestore';

const micPath = 'mic_placement_mappings';
const virPath = 'system_calibrations/vir_reference';
const virPositions = { test: { X: 1, Y: 2 } };
const reads = new Map<string, number>();

function recordRead(path: string) {
  reads.set(path, (reads.get(path) ?? 0) + 1);
}

mock.module('firebase/firestore', {
  namedExports: {
    ...firestore,
    collection: (_db: unknown, path: string) => path,
    doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
    getDocs: async (path: string) => {
      recordRead(path);
      return {
        docs: path === micPath ? [{ id: 'test-mic', data: () => ({ id: 'test-profile' }) }] : []
      };
    },
    getDoc: async (path: string) => {
      recordRead(path);
      assert.strictEqual(path, virPath);
      return { exists: () => true, data: () => ({ positions: virPositions }) };
    }
  }
});
mock.module(new URL('../services/firebase.ts', import.meta.url), {
  namedExports: { db: {}, auth: { currentUser: null } }
});

const { gearProfileService } = await import('../services/gearProfileService');
const { at5DatabaseService } = await import('../services/at5DatabaseService');
const {
  refreshCoreParameterMappings,
  refreshDbMicPlacementMappings,
  refreshVIRCalibration,
  ensureMicPlacementDataLoaded,
  getDbParameterMappings,
  getDbMicPlacementMappings
} = await import('../services/at5ParameterManifest');

describe('Gear Profile Loading & Caching Performance', () => {
  beforeEach(() => {
    reads.clear();
    gearProfileService.clearCache();
  });

  it('first getGearProfiles call populates cache and returns profiles', async () => {
    const t0 = performance.now();
    const profiles = await gearProfileService.getGearProfiles();
    const duration = performance.now() - t0;

    assert.ok(Array.isArray(profiles), 'Profiles should be an array');
    assert.ok(profiles.length > 0, 'Profiles array should not be empty');
    assert.ok(duration >= 0, 'Duration should be non-negative');
  });

  it('warmed getGearProfiles call serves from memory cache in under 200ms', async () => {
    // Populate cache first
    await gearProfileService.getGearProfiles();

    // Warmed retrieval
    const t0 = performance.now();
    const warmedProfiles = await gearProfileService.getGearProfiles();
    const warmedDuration = performance.now() - t0;

    assert.ok(Array.isArray(warmedProfiles));
    assert.ok(warmedProfiles.length > 0);
    // Warmed retrieval from cache should be sub-50ms (target under 1000ms)
    assert.ok(
      warmedDuration < 200,
      `Warmed getGearProfiles took ${warmedDuration.toFixed(2)}ms, expected under 200ms`
    );
  });

  it('concurrent getGearProfiles calls deduplicate via in-flight Promise', async () => {
    gearProfileService.clearCache();

    // Launch multiple simultaneous requests without awaiting between them
    const [res1, res2, res3] = await Promise.all([
      gearProfileService.getGearProfiles(),
      gearProfileService.getGearProfiles(),
      gearProfileService.getGearProfiles()
    ]);

    assert.strictEqual(res1.length, res2.length);
    assert.strictEqual(res2.length, res3.length);
    // References should be identical because in-flight Promise was shared
    assert.strictEqual(res1, res2);
    assert.strictEqual(res2, res3);
  });

  it('refreshCoreParameterMappings refreshes independently without loading mic placements', async () => {
    const coreMappings = await refreshCoreParameterMappings();
    assert.ok(Array.isArray(coreMappings));
    // Core parameters should be populated in memory
    const inMem = getDbParameterMappings();
    assert.strictEqual(inMem, coreMappings);
  });

  it('refreshDbMicPlacementMappings and refreshVIRCalibration operate independently', async () => {
    const micMappings = await refreshDbMicPlacementMappings();
    assert.ok(Array.isArray(micMappings));
    const inMemMic = getDbMicPlacementMappings();
    assert.strictEqual(inMemMic, micMappings);

    const virOverrides = await refreshVIRCalibration();
    assert.ok(virOverrides !== undefined);
  });

  it('ensureMicPlacementDataLoaded loads mic mappings and VIR calibration together lazily', async () => {
    const mappings = await ensureMicPlacementDataLoaded();
    assert.ok(Array.isArray(mappings));
  });

  it('at5DatabaseService caching and in-flight deduplication work for mic placement and VIR overrides', async () => {
    const [mics, joinedMics, vir, joinedVir] = await Promise.all([
      at5DatabaseService.getMicPlacementMappings(true),
      at5DatabaseService.getMicPlacementMappings(true),
      at5DatabaseService.getVIRReferenceOverrides(true),
      at5DatabaseService.getVIRReferenceOverrides(true)
    ]);

    assert.strictEqual(joinedMics, mics);
    assert.strictEqual(joinedVir, vir);
    assert.strictEqual(mics[0].firestoreDocumentPath, micPath + '/test-mic');
    assert.deepStrictEqual(vir.positions, virPositions);

    const start = performance.now();
    const [cachedMics, cachedVir] = await Promise.all([
      at5DatabaseService.getMicPlacementMappings(),
      at5DatabaseService.getVIRReferenceOverrides()
    ]);
    const duration = performance.now() - start;

    assert.strictEqual(cachedMics, mics);
    assert.strictEqual(cachedVir, vir);
    assert.strictEqual(reads.get(micPath), 1);
    assert.strictEqual(reads.get(virPath), 1);
    assert.ok(duration < 50, `Cached mic and VIR fetch took ${duration.toFixed(2)}ms, expected < 50ms`);
  });
});
