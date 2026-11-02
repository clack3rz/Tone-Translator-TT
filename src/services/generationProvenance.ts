import { z } from 'zod';
import type { ToneResult, ToneProfileResult, NormalizedToneResult, NormalizedToneProfileResult, InputUse, ProfileProvenance, GenerationProvenance } from '../types';

export const ENGINE_VERSION = 'tt-p1/1';
export const MODEL = 'gemini-3.8-flash';
const category = z.enum(['cancelled','rate_limit','payment','authentication','permission','network','timeout','unavailable','decode','validation','postprocess','unknown']);
const failure: z.ZodType<any> = z.lazy(() => z.object({
  stage: z.enum(['profile','generation','response_decode','response_validation','postprocess']), category,
  httpStatus: z.number().int().optional(), providerCode: z.string().max(80).optional(), attemptCount: z.number().int().min(1).max(3),
  retryHistory: z.array(z.object({attempt:z.number().int().min(1).max(3),category,delayMs:z.number().min(0)})).max(2),
  message:z.string().max(300),cause:failure.optional(),
}));
const input = z.object({ input:z.enum(['text','targetAudio','currentAudio','preset','youtubeUrl']),supplied:z.boolean(),submittedToModel:z.boolean(),consumedByLocalRules:z.boolean(),usedIndirectlyThroughProfile:z.boolean(),omissionReason:z.string().optional(),reference:z.string().optional() });
const common = {
  attemptCount:z.number().int().min(0).max(3).optional(),retryHistory:z.array(z.object({attempt:z.number().int(),category,delayMs:z.number().min(0)})).max(2).optional(),
  schemaVersion:z.literal(1),runId:z.string().min(1),engineVersion:z.string().min(1),startedAt:z.string().datetime().nullable(),completedAt:z.string().datetime().nullable(),
  requestedModel:z.string().optional(),returnedModelVersion:z.string().optional(),inputs:z.array(input),failure:failure.optional(),
  confidence:z.object({basis:z.enum(['uncalibrated_model_self_report','unverified_heuristic','unknown']),validationStatus:z.literal('unvalidated'),modelSelfReport:z.union([z.number().finite(),z.string()]).optional()}),
};
const completeIdentity=(p:{origin:string;startedAt?:string|null;completedAt?:string|null;requestedModel?:string;inputs:InputUse[]}) => p.origin==='legacy_unknown'||!!(p.startedAt&&p.completedAt&&p.inputs.length===5&&new Set(p.inputs.map(i=>i.input)).size===5&&(p.origin!=='live_model'||p.requestedModel)&&p.inputs.every(i=>i.supplied||(!i.submittedToModel&&!i.consumedByLocalRules&&!i.usedIndirectlyThroughProfile)));
const profileSchema=z.object({...common,origin:z.enum(['live_model','static_recipe','local_heuristic','legacy_unknown'])}).refine(completeIdentity);
const generationSchema=z.object({...common,origin:z.enum(['live_model','heuristic_fallback','validation_recipe','local_baseline','legacy_unknown']),completionStatus:z.enum(['complete','degraded','unknown']),profileRunId:z.string().optional(),postprocessing:z.array(z.string())}).refine(completeIdentity);
export function identity() { return {schemaVersion:1 as const,runId:crypto.randomUUID(),engineVersion:ENGINE_VERSION,startedAt:new Date().toISOString(),completedAt:new Date().toISOString()}; }
const legacyIdentity = {schemaVersion:1 as const,runId:'legacy-unknown',engineVersion:'unknown',startedAt:null,completedAt:null};
export function inputLedger(supplied: Partial<Record<InputUse['input'], boolean>>, live:boolean, profile?:ProfileProvenance):InputUse[] {
  return (['text','targetAudio','currentAudio','preset','youtubeUrl'] as const).map(input => {
    const present=!!supplied[input];
    const indirect=present && !!profile?.inputs.some(i=>i.input===input && (i.submittedToModel||i.consumedByLocalRules));
    return {input,supplied:present,submittedToModel:present&&live&&input!=='currentAudio',consumedByLocalRules:present&&!live&&input==='text',usedIndirectlyThroughProfile:indirect,
      omissionReason:!present?'Not supplied':input==='currentAudio'?'Recording is not included in the generation payload':input==='youtubeUrl'?(live?'URL submitted as text only; no audio retrieved':'Raw URL is not consumed by local rules'):input==='preset'?(live?'Serialized parsed preset context only; original bytes are not analysed':'Raw preset is not consumed by local rules'):!live&&input==='targetAudio'?'Raw reference audio is not consumed by local rules':undefined};
  });
}
export function normalizeProfile(value:ToneProfileResult):NormalizedToneProfileResult {
  const parsed=profileSchema.safeParse(value.provenance);
  return {...value,provenance:parsed.success?parsed.data as ProfileProvenance:{...legacyIdentity,origin:'legacy_unknown',inputs:[],confidence:{basis:'unknown',validationStatus:'unvalidated'}}};
}
export function normalizeResult(value:ToneResult):NormalizedToneResult {
  const parsed=generationSchema.safeParse(value.provenance);
  const result={...value,provenance:parsed.success?parsed.data as GenerationProvenance:{...legacyIdentity,origin:'legacy_unknown' as const,completionStatus:'unknown' as const,postprocessing:[],inputs:[],confidence:{basis:'unknown' as const,validationStatus:'unvalidated' as const}},
    tone_profile_result:value.tone_profile_result?normalizeProfile(value.tone_profile_result):undefined};
  if (result.provenance.origin!=='live_model') delete result.confidence;
  return result;
}
export function provenanceSummary(value:ToneResult):string {
  const r=normalizeResult(value),p=r.provenance,profile=r.tone_profile_result?.provenance;
  return `Generation: ${p.origin}; ${p.completionStatus}; run ${p.runId}. Profile: ${profile?.origin??'legacy_unknown'}. Confidence: ${p.confidence.basis} (unvalidated).${p.failure?` Failure: ${p.failure.stage}/${p.failure.category}.`:''}${profile?.failure?` Profile failure: ${profile.failure.category}.`:''} ${p.inputs.filter(i=>i.supplied&&i.omissionReason).map(i=>`${i.input}: ${i.omissionReason}`).join('; ')}`;
}
export function liveEvidencePreflight(value:ToneResult, scope:{liveProfile?:boolean;modelInputs?:InputUse['input'][]}={}) {
  const r=normalizeResult(value),p=r.provenance,reasons:string[]=[];
  if(p.origin!=='live_model') reasons.push('Generation origin is not live_model');
  if(!p.startedAt||!p.completedAt||!p.requestedModel||p.inputs.length!==5||new Set(p.inputs.map(i=>i.input)).size!==5) reasons.push('Execution identity or input ledger is incomplete');
  if(p.completionStatus!=='complete'||p.failure) reasons.push('Run is incomplete or degraded');
  if(scope.liveProfile && (r.tone_profile_result?.provenance?.origin!=='live_model'||r.tone_profile_result?.provenance?.failure)) reasons.push('Live profile scope is unsupported');
  if(scope.liveProfile && p.profileRunId!==r.tone_profile_result?.provenance?.runId) reasons.push('Profile reference does not match the profile record');
  for(const name of scope.modelInputs??[]) if(!p.inputs.some(i=>i.input===name&&i.supplied&&i.submittedToModel)) reasons.push(`${name} was not submitted to the generation model`);
  if(scope.liveProfile) for(const name of scope.modelInputs??[]) if(['text','targetAudio'].includes(name)&&!r.tone_profile_result?.provenance?.inputs.some(i=>i.input===name&&i.supplied&&i.submittedToModel)) reasons.push(`${name} was not submitted to the profile model`);
  if(scope.modelInputs?.includes('youtubeUrl')) reasons.push('URL text is not evidence of audio analysis');
  return {status:reasons.length?'excluded' as const:'requires_governed_assessment' as const,reasons};
}
export function exportProvenance(value:ToneResult) {
  const r=normalizeResult(value);
  return {generation:r.provenance,profile:r.tone_profile_result?.provenance,notice:r.notice,summary:provenanceSummary(r)};
}
export function provenanceMarker(value:ToneResult):string { return `[TT-PROVENANCE-v1:${encodeURIComponent(JSON.stringify(exportProvenance(value)))}]`; }
export function readProvenanceMarker(description:string) {
  const marker=description.match(/\[TT-PROVENANCE-v1:([^\]]+)\]/);
  if(!marker) return undefined;
  try { const declaration=JSON.parse(decodeURIComponent(marker[1])); if(!generationSchema.safeParse(declaration.generation).success) return undefined; return {trust:'unverified_imported_declaration' as const,declaration}; } catch {return undefined;}
}
