import test from 'node:test';
import assert from 'node:assert/strict';
import {groundObservations} from '../server/palm-observations';
const line={visibility:'visible',shape:'uncertain',continuity:'uncertain'};
const hand={imageIndex:0,heart:line,head:line,life:line,fate:line};
test('uncertainty is retained and line-to-rule mapping cannot switch with prose',()=>{
 const anchors=groundObservations({hands:[hand]},1);
 assert.deepEqual(anchors.map(a=>a.referenceIds),[['HR2'],['HR4'],['HR1'],['HR3']]);
 assert.match(anchors[0].palmEvidence,/shape uncertain; continuity uncertain/);
 const unclear=groundObservations({hands:[{...hand,fate:{...line,visibility:'uncertain'}}]},1);
 assert.equal(unclear[1].palmEvidence,'Not visible; no rule applied.');
 assert.deepEqual(unclear[1].referenceIds,[]);
});
test('separate photos keep their observations and malformed indexing fails closed',()=>{
 const anchors=groundObservations({hands:[hand,{...hand,imageIndex:1,head:{...line,shape:'curved'}}]},2);
 assert.match(anchors[0].palmEvidence,/Photo 1:.*shape uncertain.*Photo 2:.*shape curved/);
 assert.throws(()=>groundObservations({hands:[hand,hand]},2));
 assert.throws(()=>groundObservations({hands:[{...hand,head:{...line,shape:'genius'}}]},1));
});
