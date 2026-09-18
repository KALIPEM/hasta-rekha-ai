import sharp from 'sharp';
import {HttpError} from './validation';

export async function validatePhotoQuality(images: Array<{base64:string}>) {
  for(const image of images) {
    try {
      const photo=sharp(Buffer.from(image.base64,'base64'),{limitInputPixels:24000000,failOn:'warning'});
      const metadata=await photo.metadata();
      if(!metadata.width || !metadata.height || Math.min(metadata.width,metadata.height)<256 || (metadata.pages ?? 1)>1) {
        throw new HttpError(422,'Please use a still photo at least 256 pixels wide and high.');
      }
      const stats=await photo.flatten({background:'#fff'}).resize(256,256,{fit:'inside'}).greyscale().stats();
      if(stats.channels[0].stdev<8 || stats.channels[0].max-stats.channels[0].min<30) {
        throw new HttpError(422,'This photo is too blank or low contrast to read. Please photograph your open palm in good lighting.');
      }
    } catch(error) {
      if(error instanceof HttpError) throw error;
      throw new HttpError(422,'This photo could not be decoded. Please upload a clear JPG, PNG or WebP photo.');
    }
  }
}
