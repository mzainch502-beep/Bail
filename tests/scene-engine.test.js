import test from 'node:test';import assert from 'node:assert/strict';import {describe,hash,paintScene} from '../web/scene-engine.js';import {validateProject} from '../web/core.js';
test('scene descriptions choose subjects and atmosphere from prompts',()=>{assert.equal(describe('Neon city in the rain at night').theme,'city');assert.equal(describe('Ocean beach at sunset').theme,'ocean');assert.equal(describe('Planet in space').theme,'space');assert.equal(describe('Snowy mountains').snow,true);assert.equal(describe('Forest with falling snow').theme,'forest');assert.equal(describe('Coffee cup at sunrise').sunset,true);assert.equal(describe('A dancing unicorn').theme,'abstract');});
test('variation seeds are deterministic and meaningfully distinct',()=>{assert.equal(hash('City'),hash('City'));assert.notEqual(describe('City',1).seed,describe('City',2).seed);});
test('backups preserve illustrated mode and variation',()=>{const p=validateProject({version:1,visualMode:'illustrated',seed:23,scenes:[{text:'Forest',duration:4}]});assert.equal(p.visualMode,'illustrated');assert.equal(p.seed,23);});

test('every scene theme renders using valid gradient colors',()=>{
 const gradient=()=>({addColorStop(offset,color){assert.match(color,/^#[0-9a-f]{6}([0-9a-f]{2})?$/i);}});
 const ctx=new Proxy({createRadialGradient:gradient,createLinearGradient:gradient},{get(target,key){return key in target?target[key]:(()=>{});}});
 for(const prompt of ['City at night with rain','Mountains with snow','Forest at sunset','Ocean at sunrise','Planet in space','Desert at noon','Coffee cup','Product bottle','An unusual abstract idea'])paintScene(ctx,720,1280,prompt,1);
});
