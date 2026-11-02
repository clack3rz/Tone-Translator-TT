import {test} from 'node:test';
import assert from 'node:assert/strict';
import {identity,inputLedger,normalizeResult,liveEvidencePreflight,provenanceMarker,readProvenanceMarker} from '../services/generationProvenance';
test('P1-13 missing, malformed and future provenance remain recoverable and unknown',()=>{
  for(const provenance of [undefined,{}, {schemaVersion:2,origin:'live_model'}]) {
    const r=normalizeResult({signal_chain:[],notice:'Retained notice',provenance:provenance as any});
    assert.equal(r.provenance.origin,'legacy_unknown');assert.equal(r.notice,'Retained notice');
    assert.equal(liveEvidencePreflight(r).status,'excluded');
  }
});
test('P1-12 input ledger reports recording omission, URL text and serialized preset limits',()=>{
  const inputs=inputLedger({text:true,targetAudio:true,currentAudio:true,youtubeUrl:true,preset:true},true);
  assert.equal(inputs.find(i=>i.input==='currentAudio')!.submittedToModel,false);
  assert.match(inputs.find(i=>i.input==='youtubeUrl')!.omissionReason!,/text only/);
  assert.match(inputs.find(i=>i.input==='preset')!.omissionReason!,/parsed preset/);
});
test('P1-04, P1-16, P1-17 non-live origins excluded and import claims unverified',()=>{
  for(const origin of ['heuristic_fallback','validation_recipe','local_baseline','legacy_unknown'] as const){
    const r={signal_chain:[],provenance:{...identity(),origin,completionStatus:'complete' as const,postprocessing:[],inputs:[],confidence:{basis:'unverified_heuristic' as const,validationStatus:'unvalidated' as const}}};
    assert.equal(liveEvidencePreflight(r).status,'excluded');
    assert.equal(readProvenanceMarker(provenanceMarker(r))!.trust,'unverified_imported_declaration');
  }
  assert.equal(readProvenanceMarker('[TT-PROVENANCE-v1:damaged]'),undefined);
});
