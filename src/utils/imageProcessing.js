

const sharp = require('sharp');

export async function removeBlackOverlayAndWhiteText(inputPath, outputPath) {
    try {
        const image = sharp(inputPath);
        const { data, info } = await image
            .raw()
            .toBuffer({ resolveWithObject: true });

        const outputBuffer = Buffer.alloc(data.length);

        for (let i = 0; i < data.length; i += info.channels) {
            let isTextArea = true;
            for (let c = 0; c < 3; c++) {
                if (Math.abs(data[i + c] - 108) > 10) {
                    isTextArea = false;
                    break;
                }
            }
            for (let c = 0; c < 3; c++) {
                let pixelValue = data[i + c];

                if (isTextArea) {
                    // 文字区域：去除rgba(108, 108, 108, 0.94)遮罩
                    pixelValue = (pixelValue - 0.94 * 108) / 0.06;
                } else {
                    // 背景区域：去除rgba(0, 0, 0, 0.9)遮罩
                    pixelValue = (pixelValue - 0.9 * 0) / 0.1;
                }

                pixelValue = Math.max(0, Math.min(255, pixelValue));
                outputBuffer[i + c] = Math.round(pixelValue);
            }
            // 保持alpha通道不变
            if (info.channels === 4) {
                outputBuffer[i + 3] = data[i + 3];
            }
        }
        await sharp(outputBuffer, {
            raw: {
                width: info.width,
                height: info.height,
                channels: info.channels
            }
        })
            .toFile(outputPath);

        console.log('图像处理完成');
    } catch (error) {
        console.error('处理图像时发生错误:', error);
    }
}


export async function getImageDiff(oldImage, newImage, threshold) {
    if(!oldImage && newImage){
        return true
    }
    const [oldBuffer, newBuffer] = await Promise.all([
        sharp(oldImage).raw().toBuffer({ resolveWithObject: true }),
        sharp(newImage).raw().toBuffer({ resolveWithObject: true })
    ]);
    const { data: oldData, info: oldInfo } = oldBuffer;
    const { data: newData, info: newInfo } = newBuffer;

    if (oldInfo.width !== newInfo.width || oldInfo.height !== newInfo.height) {
        return true
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
    return hasChanged
}
