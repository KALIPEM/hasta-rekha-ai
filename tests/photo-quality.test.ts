import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {validatePhotoQuality} from '../server/photo-quality';

test('blank, tiny and corrupt images are rejected before inference',async()=>{
 for(const [width,height] of [[512,512],[64,64]]) {
  const buffer=await sharp({create:{width,height,channels:3,background:'#000'}}).png().toBuffer();
  await assert.rejects(validatePhotoQuality([{base64:buffer.toString('base64')}]),{status:422});
 }
 await assert.rejects(validatePhotoQuality([{base64:Buffer.from('not an image').toString('base64')}]),{status:422});
});

test('a detailed image passes quality checks for subsequent palm inspection',async()=>{
 const pixels=Buffer.alloc(512*512*3);
 for(let i=0;i<pixels.length;i++)pixels[i]=(Math.floor(i/3)%512)%256;
 const buffer=await sharp(pixels,{raw:{width:512,height:512,channels:3}}).png().toBuffer();
 await validatePhotoQuality([{base64:buffer.toString('base64')}]);
});
