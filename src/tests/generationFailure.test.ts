import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyFailure,GenerationError,checkCancelled,abortableWait,withDeadline} from '../services/generationFailure';
test('P1-11 structured status wins over contradictory prose; unknown remains unknown',()=>{
  assert.equal(classifyFailure({status:401,message:'429 Timeout payment'},'generation').category,'authentication');
  assert.equal(classifyFailure({status:403,message:'402'},'profile').category,'permission');
  assert.equal(classifyFailure({message:'credits 429'},'generation').category,'unknown');
  assert.equal(classifyFailure({status:'RESOURCE_EXHAUSTED'},'profile').category,'rate_limit');
});
test('P1-07 distinct operational and defective response categories',()=>{
  for(const [error,expected] of [[{status:402},'payment'],[{status:504},'timeout'],[{status:503},'unavailable'],[new TypeError('Failed to fetch'),'network']] as const)
    assert.equal(classifyFailure(error,'generation').category,expected);
  assert.equal(classifyFailure(new SyntaxError(),'response_decode').category,'decode');
  assert.equal(classifyFailure(new Error(),'postprocess').category,'postprocess');
});
test('P1-08 pre-abort, backoff abort and late operation cannot publish',async()=>{
  const before=new AbortController(); before.abort(); assert.throws(()=>checkCancelled(before.signal),GenerationError);
  const during=new AbortController();const wait=abortableWait(3000,during.signal);during.abort();await assert.rejects(wait,{name:'AbortError'});
  const late=new AbortController();let complete:(v:string)=>void;
  const race=withDeadline(()=>new Promise<string>(resolve=>{complete=resolve;}),late.signal);
  late.abort();complete!('late');await assert.rejects(race,{name:'AbortError'});
});
