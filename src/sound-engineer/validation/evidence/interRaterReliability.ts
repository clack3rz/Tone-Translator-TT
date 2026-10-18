// src/sound-engineer/validation/evidence/interRaterReliability.ts
// Governed inter-rater reliability calculation for Phase 1C.5h WP-12:
// Supports multi-evaluator panels with zero hardcoded thresholds.
// Bound to frozen specification v0.1j Section 16 and Implementation Plan v0.1h WP-12.

/**
 * Result of an inter-rater reliability calculation.
 */
export type ReliabilityCalculationResult =
  | {
      readonly isCalculated: true;
      readonly score: number;
      readonly method: string;
      readonly evaluatorCount: number;
    }
  | {
      readonly isCalculated: false;
      readonly reason: string;
      readonly evaluatorCount: number;
    };

/**
 * Computes Pearson correlation coefficient between two numeric rating vectors.
 */
export function computePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2) {
    return 0;
  }
  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) {
    return 1.0; // Identical flat ratings
  }

  return Math.max(-1.0, Math.min(1.0, numerator / denominator));
}

/**
 * Computes observed percentage agreement between two evaluators across shared categorical ratings.
 */
export function computePercentageAgreement(
  a: (string | number)[],
  b: (string | number)[]
): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) {
      matches++;
    }
  }
  return matches / a.length;
}

/**
 * Computes Cohen's Kappa for two raters across discrete categories.
 */
export function computeCohensKappa(
  raterA: (string | number)[],
  raterB: (string | number)[]
): number {
  if (raterA.length !== raterB.length || raterA.length === 0) {
    return 0;
  }
  const n = raterA.length;
  const categories = Array.from(new Set([...raterA, ...raterB]));
  const k = categories.length;

  if (k <= 1) {
    return 1.0; // Perfect trivial agreement
  }

  // Observed agreement
  const pObserved = computePercentageAgreement(raterA, raterB);

  // Expected chance agreement
  let pExpected = 0;
  for (const cat of categories) {
    const countA = raterA.filter((v) => v === cat).length;
    const countB = raterB.filter((v) => v === cat).length;
    pExpected += (countA / n) * (countB / n);
  }

  if (pExpected >= 1.0) {
    return 1.0;
  }

  return (pObserved - pExpected) / (1.0 - pExpected);
}

/**
 * Calculates inter-rater reliability across multiple evaluator rating records.
 * Truthfully returns isCalculated: false when single evaluator is present (never fabricates reliability).
 */
export function calculateInterRaterReliability(
  evaluatorRatings: ReadonlyArray<Record<string, number | string>>,
  method: "PEARSON_CORRELATION" | "KAPPA" | "PERCENTAGE_AGREEMENT" = "PEARSON_CORRELATION"
): ReliabilityCalculationResult {
  const evaluatorCount = evaluatorRatings.length;

  if (evaluatorCount < 2) {
    return {
      isCalculated: false,
      reason: "Inter-rater reliability requires at least two distinct evaluators. Single evaluator evaluation cannot compute reliability.",
      evaluatorCount,
    };
  }

  // Collect all rated dimension keys
  const dimensionKeys = Array.from(
    new Set(evaluatorRatings.flatMap((r) => Object.keys(r)))
  ).sort();

  if (dimensionKeys.length === 0) {
    return {
      isCalculated: false,
      reason: "No shared rated dimensions found across evaluator evaluations.",
      evaluatorCount,
    };
  }

  // Pairwise evaluation
  let pairCount = 0;
  let totalScore = 0;

  for (let i = 0; i < evaluatorCount; i++) {
    for (let j = i + 1; j < evaluatorCount; j++) {
      const rater1 = evaluatorRatings[i];
      const rater2 = evaluatorRatings[j];

      if (method === "PEARSON_CORRELATION") {
        const vec1: number[] = [];
        const vec2: number[] = [];
        for (const k of dimensionKeys) {
          const v1 = Number(rater1[k] ?? 0);
          const v2 = Number(rater2[k] ?? 0);
          vec1.push(v1);
          vec2.push(v2);
        }
        totalScore += computePearsonCorrelation(vec1, vec2);
      } else if (method === "KAPPA") {
        const vec1 = dimensionKeys.map((k) => rater1[k] ?? "UNDEFINED");
        const vec2 = dimensionKeys.map((k) => rater2[k] ?? "UNDEFINED");
        totalScore += computeCohensKappa(vec1, vec2);
      } else {
        const vec1 = dimensionKeys.map((k) => rater1[k] ?? "UNDEFINED");
        const vec2 = dimensionKeys.map((k) => rater2[k] ?? "UNDEFINED");
        totalScore += computePercentageAgreement(vec1, vec2);
      }
      pairCount++;
    }
  }

  const averageScore = pairCount > 0 ? totalScore / pairCount : 0;

  return {
    isCalculated: true,
    score: averageScore,
    method,
    evaluatorCount,
  };
}
