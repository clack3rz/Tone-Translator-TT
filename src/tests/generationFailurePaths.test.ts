import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import {buildToneProfile} from '../services/toneProfileBuilder';
import {translateTone} from '../services/geminiService';
import {requestModel,GenerationError,errorEnvelope,failureHttpStatus,classifyFailure} from '../services/generationFailure';
import {exportProvenance,liveEvidencePreflight} from '../services/generationProvenance';
const originalFetch=globalThis.fetch;
const originalWindow=globalThis.window;
let profile:any;
before(async()=>{delete (globalThis as any).window;profile=await buildToneProfile('unmatched fixture');(globalThis as any).window={};});
after(()=>{globalThis.fetch=originalFetch;if(originalWindow===undefined) delete (globalThis as any).window;else globalThis.window=originalWindow;});
const chain={signal_chain:[{type:'amp',name:'Brit 8000',settings:{'Pre Amp':4}}],confidence:91,provenance:{origin:'forged'}};
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
function mockGeneration(value:any,status=200,profileStatus=200,profileResponse=profile){
  const calls:any[]=[];
  globalThis.fetch=async(url,options)=>{calls.push({url,payload:JSON.parse(String(options?.body))});return String(url).includes('tone-profile')?response(profileResponse,profileStatus):response(value,status);};
  return calls;
}
test('P1-01 live records, model execution metadata, observed inputs override model claims',async()=>{
  const calls=mockGeneration({text:JSON.stringify(chain),execution:{returnedModelVersion:'fixture-model'}});
  const audio={base64:'Zml4dHVyZQ==',mimeType:'audio/wav'};
  const r=await translateTone('unmatched fixture',audio,audio,{metadata:{presetName:'fixture'}},undefined,'https://example.test/video');
  assert.equal(r.provenance.origin,'live_model');assert.equal(r.tone_profile_result!.provenance!.origin,'live_model');
  assert.notEqual(r.provenance.runId,r.provenance.profileRunId);assert.equal(r.provenance.returnedModelVersion,'fixture-model');
  assert.equal(r.provenance.confidence.modelSelfReport,91);assert.equal(r.confidence,undefined);
  assert.equal(r.provenance.inputs.find(i=>i.input==='currentAudio')!.submittedToModel,false);
  assert.equal(calls[1].payload.contents[0].parts.filter((p:any)=>p.inlineData).length,1);
  assert.equal(liveEvidencePreflight(r,{liveProfile:true}).status,'requires_governed_assessment');
});
test('P1-02 static profile remains static when generation recipes are off',async()=>{
  const calls=mockGeneration({text:JSON.stringify(chain)});
  const r=await translateTone('AC/DC',undefined,undefined,undefined,undefined,undefined,false);
  assert.equal(calls.length,1);assert.equal(r.tone_profile_result!.provenance!.origin,'static_recipe');
  assert.equal(r.provenance.origin,'live_model');assert.equal(liveEvidencePreflight(r,{liveProfile:true}).status,'excluded');
});
test('P1-03 profile payment/network fallback is separate from successful live generation',async()=>{
  for(const cause of ['payment','network']){
    globalThis.fetch=async(url)=>{if(String(url).includes('tone-profile')){if(cause==='network')throw new TypeError('Failed to fetch');return response({},402);}return response({text:JSON.stringify(chain)});};
    const r=await translateTone('unmatched fixture');
    assert.equal(r.provenance.origin,'live_model');assert.equal(r.provenance.completionStatus,'degraded');
    assert.equal(r.tone_profile_result!.provenance!.failure!.category,cause);
  }
});
test('P1-04 all recipe branches and non-browser baseline are explicitly non-live',async()=>{
  for(const prompt of ['AC/DC','Pantera Cowboys From Hell','Metallica Kill em all rhythm']){
    mockGeneration({text:JSON.stringify(chain)});
    const r=await translateTone(prompt,undefined,undefined,undefined,undefined,undefined,true);
    assert.equal(r.provenance.origin,'validation_recipe');assert.equal(r.confidence,undefined);assert.equal(liveEvidencePreflight(r).status,'excluded');
  }
  delete (globalThis as any).window;try{assert.equal((await translateTone('fixture')).provenance.origin,'local_baseline');}finally{(globalThis as any).window={};}
});
test('P1-05 exactly three attempts and 1.5/3 second backoff, then success or exhaustion',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  try{
    for(const succeeds of [true,false]){
      let count=0;globalThis.fetch=async()=>response(++count===3&&succeeds?{text:'ok'}:{},count===3&&succeeds?200:429);
      const pending=requestModel('/fixture',{},'generation');const settled=pending.then(v=>v,e=>e);
      const flush=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};
      await flush();assert.equal(count,1);t.mock.timers.tick(1500);await flush();assert.equal(count,2);
      t.mock.timers.tick(3000);await flush();const result=await settled;
      assert.equal(count,3);assert.deepEqual((result instanceof GenerationError?result.failure:result).retryHistory.map((r:any)=>r.delayMs),[1500,3000]);
      if(!succeeds)assert.equal(result.failure.category,'rate_limit');
    }
  }finally{t.mock.timers.reset();}
});
test('P1-06, P1-07 payment degrades; auth/permission terminate; network/timeout/5xx distinct',async()=>{
  for(const [status,category,degraded] of [[402,'payment',true],[401,'authentication',false],[403,'permission',false],[504,'timeout',true],[503,'unavailable',true]] as const){
    const calls=mockGeneration({},status);
    if(degraded){const r=await translateTone('fixture');assert.equal(r.provenance.origin,'heuristic_fallback');assert.equal(r.provenance.failure!.category,category);assert.equal(r.confidence,undefined);}
    else await assert.rejects(translateTone('fixture'),(e:any)=>e.failure.category===category);
    assert.equal(calls.length,2);
  }
});
for (const [prompt, style, amp, cab, pedal] of [
  ['clean jazz', 'jazz', "'65 Twin Reverb", '2x12 Open Vintage', 'Chorus'],
  ['fingerstyle bass', 'bass', 'Bass Amp 500', '4x10+TW Bass', null],
  ['vintage classic rock', 'classic rock', 'British Lead S100', '4x12 Brit 8000', null],
  ['Texas blues', 'blues', "'65 Twin Reverb", '2x12 Open Vintage', 'Tube Vintage OD'],
  ['Pantera thrash', 'heavy metal', 'Darrell 100', '4x12 Brit 8000', 'OverScream'],
] as const) {
  test(`payment fallback restores the baseline rig for ${prompt}`, async () => {
    mockGeneration({}, 402, 200, { ...profile, tone_profile: { ...profile.tone_profile, style: [style] } });
    const result = await translateTone(prompt);
    const pedals = result.signal_chain.filter(element => element.type === 'pedal');
    assert.equal(result.signal_chain.find(element => element.type === 'amp')?.name, amp);
    assert.equal(result.signal_chain.find(element => element.type === 'cab')?.name, cab);
    if (pedal) assert.ok(pedals.some(element => element.name === pedal));
    else assert.deepEqual(pedals, []);
    assert.equal(result.provenance.origin, 'heuristic_fallback');
    assert.equal(result.provenance.completionStatus, 'degraded');
    assert.equal(result.provenance.failure?.category, 'payment');
    assert.deepEqual(result.provenance.confidence, {
      basis: 'unverified_heuristic',
      validationStatus: 'unvalidated',
      modelSelfReport: undefined,
    });
    assert.equal(result.confidence, undefined);
    assert.match(result.notice ?? '', /Unverified heuristic/);
  });
}

test('generation network and exhausted rate limit preserve the style and failure', async () => {
  for (const category of ['network', 'rate_limit']) {
    let attempts = 0;
    globalThis.fetch = async url => {
      if (String(url).includes('tone-profile')) return response({ ...profile, tone_profile: { ...profile.tone_profile, style: ['jazz'] } });
      attempts++;
      if (category === 'network') throw new TypeError('Failed to fetch');
      return response({}, 429);
    };
    const result = await translateTone('clean jazz');
    assert.equal(result.signal_chain.find(element => element.type === 'amp')?.name, "'65 Twin Reverb");
    assert.equal(result.provenance.origin, 'heuristic_fallback');
    assert.equal(result.provenance.failure?.category, category);
    assert.equal(attempts, category === 'rate_limit' ? 3 : 1);
  }
});

test('generation ledger separates confirmed delivery, unknown delivery and local rig inputs', async () => {
  const audio = { base64: 'Zml4dHVyZQ==', mimeType: 'audio/wav' };
  const inputs = ['text', 'targetAudio', 'preset', 'youtubeUrl'];
  for (const outcome of ['confirmed', 'payment', 'network'] as const) {
    const calls = mockGeneration(outcome === 'confirmed' ? { text: JSON.stringify(chain) } : {}, outcome === 'payment' ? 402 : 200);
    if (outcome === 'network') {
      const fetchFixture = globalThis.fetch;
      globalThis.fetch = async (url, options) => {
        const reply = await fetchFixture(url, options);
        if (String(url).endsWith('/generate')) throw new TypeError('Failed to fetch');
        return reply;
      };
    }
    const result = await translateTone('clean jazz', audio, audio, { metadata: { presetName: 'fixture' } }, undefined, 'https://example.test/video');
    const provenance = exportProvenance(result).generation;
    assert.equal(calls.length, 2);
    assert.equal(provenance.failure?.category, outcome === 'confirmed' ? undefined : outcome);
    for (const entry of provenance.inputs) {
      const included = inputs.includes(entry.input);
      assert.equal(entry.submittedToModel, included && outcome === 'confirmed');
      assert.equal(entry.consumedByLocalRules, entry.input === 'text' && outcome !== 'confirmed');
      assert.equal(/delivery to Gemini is unknown/.test(entry.omissionReason ?? ''), included && outcome !== 'confirmed');
    }
    if (outcome !== 'confirmed') {
      assert.equal(provenance.origin, 'heuristic_fallback');
      assert.equal(provenance.completionStatus, 'degraded');
      assert.equal(provenance.confidence.validationStatus, 'unvalidated');
      assert.equal(liveEvidencePreflight(result).status, 'excluded');
    }
  }
});

test('P1-08 cancellation during profile/generation fetch wins late response',async()=>{
  for(const stage of ['tone-profile','generate']){
    let resolve:any;const controller=new AbortController();
    globalThis.fetch=async(url)=>String(url).includes(stage)?new Promise<Response>(r=>{resolve=r;}):response(profile);
    const pending=translateTone('fixture',undefined,undefined,undefined,controller.signal);
    for(let n=0;n<30&&!resolve;n++)await Promise.resolve();
    controller.abort();resolve(response(stage==='tone-profile'?profile:{text:JSON.stringify(chain)}));
    await assert.rejects(pending,{name:'AbortError'});
  }
});
test('P1-09 bad envelopes, model JSON, empty objects and invalid chains terminate',async()=>{
  for(const value of [{}, {text:'not JSON'}, {text:'{}'}, {text:'{"signal_chain":[{}]}'}, {text:'{"signal_chain":[]}'}]){
    mockGeneration(value);await assert.rejects(translateTone('fixture'),(e:any)=>['decode','validation'].includes(e.failure.category));
  }
  globalThis.fetch=async()=>new Response('not json');
  await assert.rejects(buildToneProfile('fixture'),(e:any)=>e.failure.category==='decode');
  globalThis.fetch=async()=>response({});
  await assert.rejects(buildToneProfile('fixture'),(e:any)=>e.failure.category==='validation');
});
test('P1-10 injected postprocess error is terminal, never availability fallback',async()=>{
  mockGeneration({text:JSON.stringify({...chain,signal_chain:[{type:'amp',name:'Brit 8000',settings:{bad:4}}]})});
  // A getter simulates a programming failure after validated response transport.
  const original=JSON.parse;let injected=false;
  JSON.parse=function(text:string,...args:any[]){const value=original(text,...args);if(typeof text==='string'&&text.includes('"provenance":{"origin":"forged"}')&&value.signal_chain&&!injected){injected=true;Object.defineProperty(value,'confidence',{get(){throw new Error('injected');},configurable:true});}return value;};
  try{await assert.rejects(translateTone('fixture'),(e:any)=>e.failure?.category==='postprocess');}finally{JSON.parse=original;}
});
test('P1-12 all 32 input combinations agree with observed live payload inclusion',async()=>{
  const audio={base64:'Zml4dHVyZQ==',mimeType:'audio/wav'};
  for(let mask=0;mask<32;mask++){
    const calls=mockGeneration({text:JSON.stringify(chain)});
    const r=await translateTone(mask&1?'fixture':'',mask&2?audio:undefined,mask&4?audio:undefined,mask&8?{metadata:{presetName:'fixture'}}:undefined,undefined,mask&16?'https://example.test/video':undefined);
    const parts=calls[1].payload.contents[0].parts;
    assert.equal(parts.some((p:any)=>p.inlineData),!!(mask&2));
    assert.equal(parts.some((p:any)=>p.text?.startsWith('Existing Preset Context:')),!!(mask&8));
    assert.equal(parts.some((p:any)=>p.text?.startsWith('Additional YouTube Context:')),!!(mask&16));
    for(const [index,input] of ['text','targetAudio','currentAudio','preset','youtubeUrl'].entries()){
      const use=r.provenance.inputs.find(i=>i.input===input)!;
      assert.equal(use.supplied,!!(mask&(1<<index)));assert.equal(use.submittedToModel,!!(mask&(1<<index))&&input!=='currentAudio');
    }
  }
});
test('P1-10 fallback postprocessing exception retains preceding payment failure',async()=>{
  const original=String.prototype.toLowerCase;let failLocal=false;
  globalThis.fetch=async(url)=>{if(String(url).includes('tone-profile'))return response(profile);failLocal=true;return response({},402);};
  String.prototype.toLowerCase=function(){if(failLocal&&String(this)==='fallback fixture')throw new Error('injected fallback');return original.call(this);};
  try{await assert.rejects(translateTone('fallback fixture'),(e:any)=>e.failure.category==='postprocess'&&e.failure.cause.category==='payment');}finally{String.prototype.toLowerCase=original;}
});
test('P1-08 abort during each actual retry wait prevents another request',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  try{
    for(const abortAfterAttempt of [1,2]){
      let attempts=0;const controller=new AbortController();globalThis.fetch=async()=>{attempts++;return response({},429);};
      const settled=requestModel('/fixture',{},'profile',controller.signal).then(v=>v,e=>e);
      const flush=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};
      await flush();if(abortAfterAttempt===2){t.mock.timers.tick(1500);await flush();}
      controller.abort();const error=await settled;assert.equal(error.name,'AbortError');t.mock.timers.tick(30000);await flush();assert.equal(attempts,abortAfterAttempt);
    }
  }finally{t.mock.timers.reset();}
});



// Uses the same serializer and status mapper as all three server endpoint catches.
function providerResponse(error: unknown, stage: 'profile' | 'generation') {
  const envelope = errorEnvelope(error, stage);
  return response(envelope, failureHttpStatus(envelope.failure));
}
test('P1 boundary: symbolic auth/permission terminate profile and generation despite contradictory prose', async()=>{
  for (const stage of ['profile','generation'] as const) for (const code of ['UNAUTHENTICATED','PERMISSION_DENIED']) {
    let calls=0;
    globalThis.fetch=async(url)=>{
      calls++;
      if(stage==='generation' && String(url).includes('tone-profile')) return response(profile);
      return providerResponse({error:{code},message:'429 RESOURCE_EXHAUSTED timeout secret-token'},stage);
    };
    await assert.rejects(translateTone('boundary fixture'),(e:any)=>{
      assert.equal(e.failure.category,code==='UNAUTHENTICATED'?'authentication':'permission');
      assert.equal(e.failure.stage,stage);assert.equal(e.failure.providerCode,code);
      assert.equal(e.failure.attemptCount,1);assert.equal(e.failure.message.includes('secret-token'),false);
      return true;
    });
    assert.equal(calls,stage==='profile'?1:2);
  }
});
test('P1 boundary: symbolic exhaustion retries three times before explicitly degraded output',async(t)=>{
  t.mock.timers.enable({apis:['setTimeout']});
  try {
    for(const stage of ['profile','generation'] as const){
      let failedCalls=0;
      globalThis.fetch=async(url)=>{
        const isProfile=String(url).includes('tone-profile');
        if(isProfile===(stage==='profile')) {failedCalls++;return providerResponse({status:'RESOURCE_EXHAUSTED',message:'401 PERMISSION_DENIED secret'},stage);}
        return response(isProfile?profile:{text:JSON.stringify(chain)});
      };
      const settled=translateTone('boundary fixture').then(v=>v,e=>{throw e;});
      const flush=async()=>{for(let n=0;n<100;n++)await Promise.resolve();};
      await flush();assert.equal(failedCalls,1);
      t.mock.timers.tick(1499);await flush();assert.equal(failedCalls,1);
      t.mock.timers.tick(1);await flush();assert.equal(failedCalls,2);
      t.mock.timers.tick(3000);await flush();const result=await settled;
      assert.equal(failedCalls,3);assert.equal(result.provenance.completionStatus,'degraded');
      const failure=stage==='profile'?result.tone_profile_result!.provenance!.failure!:result.provenance.failure!;
      assert.equal(failure.category,'rate_limit');assert.equal(failure.providerCode,'RESOURCE_EXHAUSTED');
      assert.equal(failure.stage,stage);assert.equal(failure.attemptCount,3);
      assert.deepEqual(failure.retryHistory.map(r=>r.delayMs),[1500,3000]);
      if(stage==='generation')assert.equal(result.provenance.origin,'heuristic_fallback');
    }
  }finally{t.mock.timers.reset();}
});
test('P1 boundary: structured conflicts stay terminal and abort remains cancellation',()=>{
  for(const error of [{httpStatus:502,status:'UNAUTHENTICATED'}, {httpStatus:429,error:{status:'PERMISSION_DENIED'}}, {httpStatus:401,status:'RESOURCE_EXHAUSTED'}]){
    const failure=classifyFailure(error,'generation');
    assert.ok(['authentication','permission'].includes(failure.category));
    assert.ok([401,403].includes(failureHttpStatus(failure)));
  }
  assert.equal(classifyFailure({name:'AbortError',status:429},'generation').category,'cancelled');
});

test('certificate lookup failure terminates generation with a live or static profile, while Gemini 503 degrades', async () => {
  for (const [prompt, expectedRequests] of [['unmatched fixture', 2], ['AC/DC', 1]] as const) {
    const denied = mockGeneration({ error: 'Authentication temporarily unavailable', code: 'CERTIFICATES_UNAVAILABLE' }, 503);
    await assert.rejects(translateTone(prompt, undefined, undefined, undefined, undefined, undefined, false), (error: unknown) => {
      assert.ok(error instanceof GenerationError);
      assert.equal(error.failure.stage, 'generation');
      assert.equal(error.failure.category, 'authentication');
      assert.equal(error.failure.providerCode, 'CERTIFICATES_UNAVAILABLE');
      assert.equal(error.failure.httpStatus, 503);
      return true;
    });
    assert.equal(denied.length, expectedRequests);

    const unavailable = mockGeneration({ status: 'UNAVAILABLE' }, 503);
    const result = await translateTone(prompt, undefined, undefined, undefined, undefined, undefined, false);
    assert.equal(result.provenance.origin, 'heuristic_fallback');
    assert.equal(result.provenance.failure?.category, 'unavailable');
    assert.equal(result.tone_profile_result?.provenance?.origin, expectedRequests === 1 ? 'static_recipe' : 'live_model');
    assert.equal(unavailable.length, expectedRequests);
  }
});

test('terminal generation decode failure keeps malformed provider text and parse exceptions out of the console', async (t) => {
  const sentinel = 'SENSITIVE_PROVIDER_SENTINEL';
  const consoleMethods = (['error', 'warn', 'log', 'info', 'debug'] as const)
    .map(method => t.mock.method(console, method, () => {}));
  mockGeneration({ text: '{"value":' + sentinel + '}' });

  await assert.rejects(translateTone('AC/DC', undefined, undefined, undefined, undefined, undefined, false), (error: unknown) => {
    assert.ok(error instanceof GenerationError);
    assert.equal(error.failure.stage, 'response_decode');
    assert.equal(error.failure.category, 'decode');
    assert.equal(error.message, 'Tone request failed (response_decode/decode).');
    return true;
  });

  const logged = consoleMethods.flatMap(method => method.mock.calls.map(call =>
    call.arguments.map(argument => JSON.stringify(argument, (_key, value) =>
      value instanceof Error ? value.stack : value)).join(' ')));
  assert.doesNotMatch(logged.join('\n'), /SENSITIVE_PROVIDER_SENTINEL|SyntaxError|rawPreview/);
});
