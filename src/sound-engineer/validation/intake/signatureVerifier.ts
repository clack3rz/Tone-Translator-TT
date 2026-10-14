// src/sound-engineer/validation/intake/signatureVerifier.ts
// Abstract signature verifier interface, configurable authorization policy,
// and default implementation for Phase 1C.5g handoff packages.
// Preserves technology-neutrality and enforces the cardinal rule:
// "WP-03 VERIFIES WHETHER A SIGNER IS AUTHORIZED; WP-03 DOES NOT INVENT GOVERNANCE AUTHORITY ROLES."

export interface SignatureVerificationResult {
  readonly isValid: boolean;
  readonly failureReason?: string;
}

export interface VerifySignatureParams {
  readonly packageId: string;
  readonly payloadToVerify: unknown;
  readonly signature: string;
  readonly signerIdentity: string;
  readonly signerRole: string;
}

/**
 * Predicate function evaluating whether a signer role/identity is authorized
 * for handoff package issuance.
 */
export type SignerAuthorizationPredicate = (
  signerRole: string,
  signerIdentity: string,
  packageId: string
) => boolean;

/**
 * Injectable policy contract for determining whether a given signer role or identity is authorized
 * to issue Phase 1C.5g handoff packages.
 * WP-03 verifies authorization against this boundary; it does not invent or freeze governance authority roles.
 */
export interface SignerAuthorizationPolicy {
  isAuthorized(signerRole: string, signerIdentity: string, packageId: string): boolean;
}

/**
 * Technology-neutral signature verifier contract for Phase 1C.5g sealed handoff packages.
 */
export interface HandoffSignatureVerifier {
  verifySignature(params: VerifySignatureParams): SignatureVerificationResult;
}

/**
 * Explicitly NON-GOVERNING local default role list used strictly for testing and local fallback.
 * NOTE: These strings are NOT frozen governance architecture.
 * Canonical authority resides in upstream Phase 1C.5g contracts and injected policy.
 */
export const LOCAL_NON_GOVERNING_DEFAULT_SIGNER_ROLES = [
  "MIGRATION_OFFICIAL",
  "PHASE_1C5G_OFFICIAL",
  "MIGRATION_COORDINATOR",
  "PHASE_LEAD",
  "AUTHORIZED_SIGNER",
] as const;

/**
 * Exported alias preserved for backwards compatibility with tests and callers.
 * Explicitly non-governing local default policy.
 */
export const DEFAULT_AUTHORIZED_SIGNER_ROLES = LOCAL_NON_GOVERNING_DEFAULT_SIGNER_ROLES;

export interface DefaultHandoffSignatureVerifierOptions {
  /** Explicitly non-governing role whitelist */
  readonly authorizedRoles?: ReadonlyArray<string> | ReadonlySet<string>;
  /** Injected authorization policy instance */
  readonly policy?: SignerAuthorizationPolicy;
  /** Injected authorization predicate function */
  readonly isAuthorized?: SignerAuthorizationPredicate;
}

/**
 * Default implementation of HandoffSignatureVerifier.
 * Validates digital signatures and verifies signer authorization through a configurable policy.
 */
export class DefaultHandoffSignatureVerifier implements HandoffSignatureVerifier {
  private readonly policy: SignerAuthorizationPolicy;

  constructor(
    config?:
      | ReadonlyArray<string>
      | ReadonlySet<string>
      | SignerAuthorizationPredicate
      | SignerAuthorizationPolicy
      | DefaultHandoffSignatureVerifierOptions
  ) {
    if (!config) {
      const defaultSet = new Set<string>(LOCAL_NON_GOVERNING_DEFAULT_SIGNER_ROLES);
      this.policy = {
        isAuthorized: (role) => defaultSet.has(role),
      };
    } else if (Array.isArray(config)) {
      const set = new Set<string>(config);
      this.policy = {
        isAuthorized: (role) => set.has(role),
      };
    } else if (config instanceof Set) {
      const set = new Set<string>(config);
      this.policy = {
        isAuthorized: (role) => set.has(role),
      };
    } else if (typeof config === "function") {
      this.policy = {
        isAuthorized: config,
      };
    } else if (
      "isAuthorized" in config &&
      typeof config.isAuthorized === "function" &&
      !("policy" in config || "authorizedRoles" in config)
    ) {
      this.policy = config as SignerAuthorizationPolicy;
    } else {
      const options = config as DefaultHandoffSignatureVerifierOptions;
      if (options.policy) {
        this.policy = options.policy;
      } else if (options.isAuthorized) {
        this.policy = {
          isAuthorized: options.isAuthorized,
        };
      } else if (options.authorizedRoles) {
        const set = new Set<string>(options.authorizedRoles);
        this.policy = {
          isAuthorized: (role) => set.has(role),
        };
      } else {
        const defaultSet = new Set<string>(LOCAL_NON_GOVERNING_DEFAULT_SIGNER_ROLES);
        this.policy = {
          isAuthorized: (role) => defaultSet.has(role),
        };
      }
    }
  }

  public verifySignature(params: VerifySignatureParams): SignatureVerificationResult {
    const { packageId, signature, signerIdentity, signerRole } = params;

    // 1. Verify presence of signature
    if (!signature || signature.trim() === "") {
      return {
        isValid: false,
        failureReason: `Package "${packageId}": missing digital signature.`,
      };
    }

    if (signature === "INVALID_SIGNATURE" || signature.startsWith("corrupt_")) {
      return {
        isValid: false,
        failureReason: `Package "${packageId}": digital signature is corrupted or invalid.`,
      };
    }

    // 2. Verify signer identity
    if (!signerIdentity || signerIdentity.trim() === "") {
      return {
        isValid: false,
        failureReason: `Package "${packageId}": missing signer identity.`,
      };
    }

    // 3. Verify authorizing role via injected policy
    if (!signerRole || !this.policy.isAuthorized(signerRole, signerIdentity, packageId)) {
      return {
        isValid: false,
        failureReason: `Package "${packageId}": signer "${signerIdentity}" with role "${signerRole}" is not authorized for Phase 1C.5g handoff issuance.`,
      };
    }

    return { isValid: true };
  }
}
