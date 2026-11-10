export const SLIDE_IMAGE_LIMIT = 180000;

export function isSlideImageData(data) {
  return typeof data==='string' && data.length<=SLIDE_IMAGE_LIMIT &&
    /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(data);
}

export async function prepareSlideImage(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024) {
    throw Error('Choose a JPG, PNG, or WebP image up to 10 MB.');
  }
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();
    image.src=url;
    await image.decode();
    const {naturalWidth:width,naturalHeight:height}=image;
    if(!width||!height||width*height>30000000)throw Error('Choose an image smaller than 30 megapixels.');
    const canvas=document.createElement('canvas');
    canvas.width=640;
    canvas.height=480;
    const context=canvas.getContext('2d');
    if(!context)throw Error('Image processing is unavailable in this browser.');
    const cropWidth=Math.min(width,height*4/3);
    const cropHeight=cropWidth*3/4;
    context.fillStyle='#fff';
    context.fillRect(0,0,640,480);
    context.drawImage(image,(width-cropWidth)/2,(height-cropHeight)/2,cropWidth,cropHeight,0,0,640,480);
    const standard=canvas.toDataURL('image/jpeg',0.82);
    const data=isSlideImageData(standard)?standard:canvas.toDataURL('image/jpeg',0.65);
    if(!isSlideImageData(data))throw Error('The image is too detailed to save. Try a smaller image.');
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
