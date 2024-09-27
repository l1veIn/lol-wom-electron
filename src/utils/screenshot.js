import { desktopCapturer } from 'electron';
import fs from 'fs/promises';

export async function captureScreen(bounds, display) {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: bounds.width, height: bounds.height }
  });

  const source = sources.find(s => s.display_id === display.id.toString());
  if (!source) throw new Error('无法找到匹配的屏幕源');

  // 这里返回的是一个NativeImage对象,您可能需要根据OCR库的要求转换格式
  return source.thumbnail.crop(bounds);
}


export async function captureAndSaveScreen(bounds, display, savePath) {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: bounds.width, height: bounds.height }
  });

  const source = sources.find(s => s.display_id === display.id.toString());
  if (!source) throw new Error('无法找到匹配的屏幕源');

  const image = source.thumbnail.crop(bounds);
  const pngBuffer = image.toPNG();
  
  await fs.writeFile(savePath, pngBuffer);
}