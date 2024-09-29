const { parentPort } = require('worker_threads');
const sharp = require('sharp');

parentPort.on('message', async ({ oldImage, newImage, threshold }) => {
  try {
    const [oldBuffer, newBuffer] = await Promise.all([
      sharp(oldImage).raw().toBuffer({ resolveWithObject: true }),
      sharp(newImage).raw().toBuffer({ resolveWithObject: true })
    ]);

    const { data: oldData, info: oldInfo } = oldBuffer;
    const { data: newData, info: newInfo } = newBuffer;

    if (oldInfo.width !== newInfo.width || oldInfo.height !== newInfo.height) {
      parentPort.postMessage(true);
    }

    let changedPixels = 0;
    for (let i = 0; i < oldData.length; i += 3) {
      if (
        Math.abs(oldData[i] - newData[i]) > 10 ||
        Math.abs(oldData[i + 1] - newData[i + 1]) > 10 ||
        Math.abs(oldData[i + 2] - newData[i + 2]) > 10
      ) {
        changedPixels++;
      }
    }

    const hasChanged = changedPixels / (oldData.length / 3) > threshold;
    parentPort.postMessage(hasChanged);
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
});