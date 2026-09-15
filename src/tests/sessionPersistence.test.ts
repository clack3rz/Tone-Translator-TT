import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  saveWorkingSession,
  loadWorkingSession,
  clearWorkingSession,
  validateSessionSchema,
  CURRENT_SESSION_SCHEMA_VERSION,
  SESSION_STORAGE_KEY,
  getSessionStorageBackend,
  WorkingSessionPayload
} from '../services/sessionStorage';
import { ToneResult } from '../types';

describe('Working Session Persistence & Recovery', () => {
  beforeEach(() => {
    clearWorkingSession();
  });

  const sampleToneResult: ToneResult = {
    preset_name: "Master Rhythm",
    description: "Tight punchy 80s thrash tone",
    confidence: 95,
    tone_summary: {
      style: "Thrash Metal",
      amp_family: "High Gain American",
      cab_family: "4x12 Vintage 30",
      speaker_family: "Celestion V30",
      mic_strategy: "Dual Mics On-Axis",
      effects_applied: ["Overdrive", "Gate"]
    } as any,
    signal_chain: [
      {
        model: "Noise Gate",
        name: "Noise Gate",
        type: "pedal",
        settings: {
          Threshold: -50,
          Release: 20
        }
      },
      {
        model: "Overdrive",
        name: "Overdrive",
        type: "pedal",
        settings: {
          Drive: 3.5,
          Tone: 6.0,
          Level: 8.0
        }
      },
      {
        model: "Darrell 100",
        name: "Darrell 100",
        type: "amp",
        settings: {
          Channel: 0,
          Gain: 7.5,
          Bass: 6.0,
          Mid: 4.5,
          Treble: 7.0,
          Master: 5.0
        }
      },
      {
        model: "4x12 Brit 8000",
        name: "4x12 Brit 8000",
        type: "cab",
        settings: {
          Mic_0: "Dynamic 57",
          Mic_0_Placement: "Cap Edge, Close, On Axis",
          Mic_1: "Ribbon 121",
          Mic_1_Placement: "Cone, Close, 45° Off Axis"
        }
      }
    ],
    engineering_notes: {
      low_end_treatment: "Tightened with TS-style boost",
      midrange_focus: "Slight scoop around 800Hz",
      high_frequency_smoothing: "Smooth top end via ribbon mic off-axis",
      saturation_strategy: "Amp preamp saturated, boost level high drive low"
    } as any
  };

  it('Test A: Normal editing & saving does not interfere with working state', () => {
    const payload: WorkingSessionPayload = {
      revision: 0,
      prompt: "Metallica Master of Puppets bridge tone",
      youtubeUrl: "https://youtube.com/watch?v=mock123",
      useValidationRecipes: true,
      activeVariation: "primary",
      exportFilename: "TT_Master_Bridge",
      toneResult: sampleToneResult,
      diffs: []
    };

    saveWorkingSession(payload, true);

    const storage = getSessionStorageBackend();
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    assert.ok(raw, "Working session must be written to storage");

    const parsed = JSON.parse(raw);
    assert.equal(parsed.schemaVersion, CURRENT_SESSION_SCHEMA_VERSION);
    assert.equal(parsed.prompt, "Metallica Master of Puppets bridge tone");
    assert.equal(parsed.toneResult.signal_chain.length, 4);
    assert.equal(parsed.toneResult.signal_chain[2].settings.Gain, 7.5);
  });

  it('Test B: Deliberate application reload restores working session accurately', () => {
    const payload: WorkingSessionPayload = {
      revision: 1,
      prompt: "Crunch rock tone",
      useValidationRecipes: false,
      activeVariation: "primary",
      toneResult: sampleToneResult,
      exportFilename: "TT_Crunch"
    };

    saveWorkingSession(payload, true);

    const recoveryResult = loadWorkingSession();
    assert.equal(recoveryResult.restored, true);
    assert.ok(recoveryResult.session);
    assert.equal(recoveryResult.session.prompt, "Crunch rock tone");
    assert.equal(recoveryResult.session.toneResult?.signal_chain?.length, 4);
    assert.equal(recoveryResult.session.toneResult?.signal_chain[0].name, "Noise Gate");
    assert.equal(recoveryResult.session.toneResult?.signal_chain[2].name, "Darrell 100");
  });

  it('Test C: Empty session starts cleanly when cleared or uninitialized', () => {
    clearWorkingSession();

    const recoveryResult = loadWorkingSession();
    assert.equal(recoveryResult.restored, false);
    assert.equal(recoveryResult.session, null);
    assert.equal(recoveryResult.reason, 'empty');
  });

  it('Test D: Recovery integrity preserves gear items, slots, settings and parameters', () => {
    const payload: WorkingSessionPayload = {
      revision: 5,
      prompt: "High Gain Lead Tone",
      useValidationRecipes: true,
      activeVariation: "v1",
      toneResult: sampleToneResult,
      userPreset: {
        metadata: {
          source: "user_upload",
          presetName: "OriginalLead"
        },
        signalChain: [{ model: "Vintage Tube Lead", type: "Amp" }]
      }
    };

    saveWorkingSession(payload, true);

    const recovery = loadWorkingSession();
    assert.equal(recovery.restored, true);
    assert.ok(recovery.session);
    const restoredTone = recovery.session.toneResult!;
    
    // Verify gear count & order
    assert.equal(restoredTone.signal_chain.length, 4);
    assert.deepEqual(
      restoredTone.signal_chain.map(g => g.name),
      ["Noise Gate", "Overdrive", "Darrell 100", "4x12 Brit 8000"]
    );

    // Verify parameter fidelity
    const amp = restoredTone.signal_chain.find(g => g.name === "Darrell 100")!;
    assert.equal(amp.settings.Channel, 0);
    assert.equal(amp.settings.Gain, 7.5);
    assert.equal(amp.settings.Treble, 7.0);

    // Verify mic placement fidelity
    const cab = restoredTone.signal_chain.find(g => g.name === "4x12 Brit 8000")!;
    assert.equal(cab.settings.Mic_0, "Dynamic 57");
    assert.equal(cab.settings.Mic_0_Placement, "Cap Edge, Close, On Axis");

    // Verify user preset metadata preserved
    assert.equal(recovery.session.userPreset?.metadata?.presetName, "OriginalLead");
  });

  it('Test E: Stale/incompatible saved schema fails safely without crashing', () => {
    const storage = getSessionStorageBackend();

    // 1. Incompatible schema version
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 9999, // future/unsupported version
        prompt: "Future session",
        toneResult: sampleToneResult
      })
    );

    const staleResult = loadWorkingSession();
    assert.equal(staleResult.restored, false);
    assert.equal(staleResult.session, null);
    assert.match(staleResult.reason || '', /Unsupported schemaVersion/);

    // 2. Corrupt JSON
    storage.setItem(SESSION_STORAGE_KEY, "{ this is corrupt json... ");
    const corruptResult = loadWorkingSession();
    assert.equal(corruptResult.restored, false);
    assert.equal(corruptResult.session, null);
    assert.equal(corruptResult.reason, 'corrupt_json');

    // 3. Malformed signal_chain structure
    storage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
        prompt: "Broken chain",
        toneResult: {
          signal_chain: "not an array"
        }
      })
    );
    const brokenChainResult = loadWorkingSession();
    assert.equal(brokenChainResult.restored, false);
    assert.equal(brokenChainResult.session, null);
  });
});
