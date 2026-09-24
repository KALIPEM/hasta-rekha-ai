import test from 'node:test';
import assert from 'node:assert/strict';
import {groundObservations} from '../server/palm-observations';
const line={visibility:'visible',shape:'uncertain',continuity:'uncertain',course:'uncertain',endpoints:'uncertain',branches:'uncertain',crossings:'uncertain',localClarity:'uncertain'};
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

test('fine details and user hand labels survive reversed model order',()=>{
 const left={...hand,head:{...line,course:'slants toward outer lower palm',branches:'a short fork at the outer end'}};
 const right={...hand,imageIndex:1,head:{...line,course:'runs horizontally across centre',branches:'uncertain'}};
 const anchors=groundObservations({hands:[right,left]},2,['Left','Right']);
 assert.match(anchors[0].palmEvidence,/Left palm.*slants toward outer lower palm.*short fork.*Right palm.*horizontally/);
 assert.match(groundObservations({hands:[hand]},1,['Right'])[0].palmEvidence,/Right palm \(photo 1\)/);
 assert.throws(()=>groundObservations({hands:[{...hand,head:{...line,branches:undefined}}]},1));
});
