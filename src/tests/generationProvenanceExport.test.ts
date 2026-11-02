import {test} from 'node:test';
import assert from 'node:assert/strict';
import {XMLValidator} from 'fast-xml-parser';
import {identity,inputLedger,normalizeResult,provenanceSummary,liveEvidencePreflight} from '../services/generationProvenance';
import {getExportData,getExportDebugData} from '../services/presetExporter';
import {parseAt5p} from '../services/presetParser';
import {saveWorkingSession,loadWorkingSession,clearWorkingSession,getSessionStorageBackend,SESSION_STORAGE_KEY} from '../services/sessionStorage';
import type {ToneResult,GenerationProvenance} from '../types';
const result=(origin:GenerationProvenance['origin']):ToneResult=>({signal_chain:[{type:'amp',name:'Brit 8000',settings:{'Pre Amp':4}}],engineering_notes:{gain_strategy:'Unicode Ω < & " >'},notice:'fixture notice',provenance:{...identity(),requestedModel:"gemini-3.8-flash",origin,completionStatus:origin==='heuristic_fallback'?'degraded':'complete',inputs:inputLedger({text:true},origin==='live_model'),postprocessing:[],confidence:{basis:origin==='live_model'?'uncalibrated_model_self_report':'unverified_heuristic',validationStatus:'unvalidated'}}});
test('P1-13 save/reload every origin; nested malformed/future provenance remains unknown',()=>{
  for(const origin of ['live_model','heuristic_fallback','validation_recipe','local_baseline','legacy_unknown'] as const){
    clearWorkingSession();saveWorkingSession({prompt:'fixture',toneResult:result(origin)} as any,true);
    const restored=loadWorkingSession().session!.toneResult!;
    assert.equal(restored.provenance!.origin,origin);assert.equal(restored.notice,'fixture notice');
  }
  const store=getSessionStorageBackend();const session=JSON.parse(store.getItem(SESSION_STORAGE_KEY)!);
  session.toneResult.provenance={schemaVersion:99,origin:'live_model'};store.setItem(SESSION_STORAGE_KEY,JSON.stringify(session));
  assert.equal(loadWorkingSession().session!.toneResult!.provenance!.origin,'legacy_unknown');
});
test('P1-14, P1-15, P1-16 full debug and Unicode XML provenance change invalidates cache; imports unverified',()=>{
  const r=result('live_model');const xml=new TextDecoder().decode(getExportData(r));
  assert.equal(XMLValidator.validate(xml),true);const parsed=parseAt5p(xml);
  assert.match(parsed.metadata.description!,/Unicode Ω < & " >/);
  assert.equal(parsed.metadata.ttProvenance!.trust,'unverified_imported_declaration');
  assert.equal(parsed.metadata.ttProvenance!.declaration.generation.runId,r.provenance!.runId);
  assert.equal(getExportDebugData(r).generation_provenance!.generation.runId,r.provenance!.runId);
  const changed={...r,provenance:{...r.provenance!,runId:'provenance-only-change',origin:'heuristic_fallback' as const}};
  const newXml=new TextDecoder().decode(getExportData(changed));
  assert.notEqual(xml,newXml);assert.match(parseAt5p(newXml).metadata.description!,/provenance-only-change/);
  assert.match(provenanceSummary(changed),/heuristic_fallback/);
  assert.equal(parseAt5p('<Preset><MetaInfo Description="[TT-PROVENANCE-v1:forged]" /></Preset>').metadata.ttProvenance,undefined);
});
test('P1-17 mapping status is independent of live evidence eligibility for identical chains',()=>{
  const live=result('live_model'),fallback=result('heuristic_fallback');
  assert.equal(getExportDebugData(live).parameter_mapping_status,getExportDebugData(fallback).parameter_mapping_status);
  assert.equal(liveEvidencePreflight(live).status,'requires_governed_assessment');
  assert.equal(liveEvidencePreflight(fallback).status,'excluded');
  assert.equal(normalizeResult(fallback).confidence,undefined);
});

