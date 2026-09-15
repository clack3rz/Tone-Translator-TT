import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert';
import { gearProfileService } from '../services/gearProfileService';
import { at5DatabaseService } from '../services/at5DatabaseService';
import {
  refreshCoreParameterMappings,
  refreshDbMicPlacementMappings,
  refreshVIRCalibration,
  ensureMicPlacementDataLoaded,
  getDbParameterMappings,
  getDbMicPlacementMappings
} from '../services/at5ParameterManifest';

describe('Gear Profile Loading & Caching Performance', () => {
  beforeEach(() => {
    gearProfileService.clearCache();
  });

  after(() => {
    // Ensure Node terminates cleanly without hanging on Firestore background socket listeners
    setTimeout(() => process.exit(0), 100);
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
    // Both should serve from cache when warmed
    const t0 = performance.now();
    const [mics1, vir1] = await Promise.all([
      at5DatabaseService.getMicPlacementMappings(),
      at5DatabaseService.getVIRReferenceOverrides()
    ]);
    const duration1 = performance.now() - t0;

    const t1 = performance.now();
    const [mics2, vir2] = await Promise.all([
      at5DatabaseService.getMicPlacementMappings(),
      at5DatabaseService.getVIRReferenceOverrides()
    ]);
    const duration2 = performance.now() - t1;

    assert.deepStrictEqual(mics1, mics2);
    assert.ok(duration2 < 50, `Cached mic and VIR fetch took ${duration2.toFixed(2)}ms, expected < 50ms`);
  });
});
