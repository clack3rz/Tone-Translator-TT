// src/sound-engineer/validation/execution/platformValidationAdapter.ts
// Abstract platform adapter contract and simulated test adapter implementation for Phase 1C.5h WP-10.
// Bound to frozen specification v0.1j Section 14, Section 31, and Implementation Plan v0.1h WP-10.

import {
  PlatformValidationAdapter,
  RenderRequest,
  RenderResult,
} from "./types";

export type { PlatformValidationAdapter, RenderRequest, RenderResult };

/**
 * Options for configuring SimulatedPlatformValidationAdapter behavior in tests.
 */
export interface SimulatedAdapterOptions {
  readonly platformId?: string;
  readonly platformVersion?: string;
  readonly defaultSampleRate?: number;
  readonly defaultChannelCount?: number;
  /** Artificial latency delay in milliseconds */
  readonly simulatedRenderDelayMs?: number;
  /** If true, candidate rendering throws an unhandled error */
  readonly shouldFailCandidate?: boolean;
  readonly candidateErrorMessage?: string;
  /** If true, baseline rendering throws an unhandled error */
  readonly shouldFailBaseline?: boolean;
  readonly baselineErrorMessage?: string;
  /** If true, candidate rendering hangs indefinitely (to test timeout cancellation) */
  readonly shouldHangCandidate?: boolean;
  /** If true, baseline rendering hangs indefinitely */
  readonly shouldHangBaseline?: boolean;
  /** Anomaly messages to inject into render results */
  readonly injectedAnomalies?: string[];
  /** Custom candidate audio buffer generator */
  readonly candidateAudioGenerator?: (req: RenderRequest) => Uint8Array;
  /** Custom baseline audio buffer generator */
  readonly baselineAudioGenerator?: (req: RenderRequest) => Uint8Array;
}

/**
 * Helper to synthesize deterministic synthetic PCM/WAV byte patterns for test verification.
 */
function createSyntheticAudioBytes(length: number, seed: number = 42): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = (seed + i * 17) % 256;
  }
  return bytes;
}

/**
 * In-Memory Simulated Platform Validation Adapter.
 * Explicitly truthful naming: this is an in-memory simulation for headless unit and integration testing.
 * Does not pretend to be a real operating system subprocess or DAW driver.
 */
export class SimulatedPlatformValidationAdapter implements PlatformValidationAdapter {
  public readonly platformId: string;
  public readonly platformVersion: string;

  private options: SimulatedAdapterOptions;
  public candidateCallCount = 0;
  public baselineCallCount = 0;
  public lastCandidateRequest?: RenderRequest;
  public lastBaselineRequest?: RenderRequest;
  public cancelledRenderIds: string[] = [];

  constructor(options: SimulatedAdapterOptions = {}) {
    this.platformId = options.platformId ?? "simulated-audio-engine-v1";
    this.platformVersion = options.platformVersion ?? "1.0.0-sim";
    this.options = { ...options };
  }

  public updateOptions(newOptions: Partial<SimulatedAdapterOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  public async renderCandidate(request: RenderRequest): Promise<RenderResult> {
    this.candidateCallCount++;
    this.lastCandidateRequest = request;

    // Check for immediate abort
    if (request.signal?.aborted) {
      throw new Error(`Candidate render aborted before start: ${request.renderId}`);
    }

    if (this.options.shouldHangCandidate) {
      return new Promise((_, reject) => {
        if (request.signal) {
          request.signal.addEventListener("abort", () => {
            reject(new Error(`Candidate render aborted by signal: ${request.renderId}`));
          });
        }
      });
    }

    if (this.options.simulatedRenderDelayMs && this.options.simulatedRenderDelayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.options.simulatedRenderDelayMs);
        if (request.signal) {
          request.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error(`Candidate render aborted during delay: ${request.renderId}`));
          });
        }
      });
    }

    if (this.options.shouldFailCandidate) {
      throw new Error(
        this.options.candidateErrorMessage ??
          `Simulated candidate render error for case ${request.caseId}`
      );
    }

    const audio = this.options.candidateAudioGenerator
      ? this.options.candidateAudioGenerator(request)
      : createSyntheticAudioBytes(Math.max(128, request.fixturePayload.length), 101);

    const sampleRate = this.options.defaultSampleRate ?? 48000;
    const channelCount = this.options.defaultChannelCount ?? 2;
    const sampleCount = Math.floor(audio.length / (channelCount * 2));

    return {
      renderId: request.renderId,
      audioBuffer: audio,
      sampleRate,
      channelCount,
      sampleCount,
      durationMs: (sampleCount / sampleRate) * 1000,
      renderMetadata: {
        platformId: this.platformId,
        platformVersion: this.platformVersion,
        subjectId: request.subjectId,
        candidatePipeline: "TONE_TRANSLATOR_SHADOW_CANDIDATE",
      },
      anomalies: [...(this.options.injectedAnomalies ?? [])],
    };
  }

  public async renderBaseline(request: RenderRequest): Promise<RenderResult> {
    this.baselineCallCount++;
    this.lastBaselineRequest = request;

    if (request.signal?.aborted) {
      throw new Error(`Baseline render aborted before start: ${request.renderId}`);
    }

    if (this.options.shouldHangBaseline) {
      return new Promise((_, reject) => {
        if (request.signal) {
          request.signal.addEventListener("abort", () => {
            reject(new Error(`Baseline render aborted by signal: ${request.renderId}`));
          });
        }
      });
    }

    if (this.options.simulatedRenderDelayMs && this.options.simulatedRenderDelayMs > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.options.simulatedRenderDelayMs);
        if (request.signal) {
          request.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error(`Baseline render aborted during delay: ${request.renderId}`));
          });
        }
      });
    }

    if (this.options.shouldFailBaseline) {
      throw new Error(
        this.options.baselineErrorMessage ??
          `Simulated baseline render error for case ${request.caseId}`
      );
    }

    const audio = this.options.baselineAudioGenerator
      ? this.options.baselineAudioGenerator(request)
      : createSyntheticAudioBytes(Math.max(128, request.fixturePayload.length), 202);

    const sampleRate = this.options.defaultSampleRate ?? 48000;
    const channelCount = this.options.defaultChannelCount ?? 2;
    const sampleCount = Math.floor(audio.length / (channelCount * 2));

    return {
      renderId: request.renderId,
      audioBuffer: audio,
      sampleRate,
      channelCount,
      sampleCount,
      durationMs: (sampleCount / sampleRate) * 1000,
      renderMetadata: {
        platformId: this.platformId,
        platformVersion: this.platformVersion,
        subjectId: request.subjectId,
        baselineSource: "PATH_PROD_FROZEN_REFERENCE",
      },
      anomalies: [],
    };
  }

  public async cancelRender(renderId: string): Promise<void> {
    this.cancelledRenderIds.push(renderId);
  }
}
