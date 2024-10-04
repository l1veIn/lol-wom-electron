

const sharp = require('sharp');

function getMixedMask(blackOverlay, whiteText) {
    // 计算混合后的alpha值
    let mixedAlpha = (blackOverlay[3] + whiteText[3] * (1 - blackOverlay[3])).toFixed(2);
    let get_channel = (i) => {
        return ((blackOverlay[i] * blackOverlay[3] + whiteText[i] * whiteText[3]) / mixedAlpha).toFixed(1)
    }
    // 计算混合后的通道值
    let mixedMask = [get_channel(0), get_channel(1), get_channel(2), mixedAlpha]
    console.log(`mixedMask: ${mixedMask}`);
    return mixedMask
}

export async function removeBlackOverlayAndWhiteText(inputPath, outputPath, blackOverlay = [0, 0, 0, 0.9], whiteText = [255, 255, 255, 0.4]) {
    // 计算混合后的alpha值
    // let mixedMask = getMixedMask(blackOverlay, whiteText)
    let textPixels = 0
    try {
        const image = sharp(inputPath);
        const { data, info } = await image
            .raw()
            .toBuffer({ resolveWithObject: true });

        const outputBuffer = Buffer.alloc(data.length);

        for (let i = 0; i < data.length; i += info.channels) {
            // let isTextArea = true;
            // for (let c = 0; c < 3; c++) {
            //     if (Math.abs(data[i + c] - mixedMask[c]) > 10) {
            //         isTextArea = false;
            //         break;
            //     }
                
            //     console.log(data[i + c], mixedMask[c])
            // }
            // if(isTextArea){
            //     textPixels++
            // }
            for (let c = 0; c < 3; c++) {
                let pixelValue = data[i + c];
                // if (isTextArea) {
                //     pixelValue = (pixelValue - mixedMask[3] * mixedMask[c]) / (1 - mixedMask[3]);
                // } else {
                //     pixelValue = (pixelValue - blackOverlay[3] * 0) / (1 - blackOverlay[3]);
                // }
                pixelValue = (pixelValue - blackOverlay[3] *  blackOverlay[c]) / (1 - blackOverlay[3]);

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

        console.log('图像处理完成,textPixels:', textPixels);
    } catch (error) {
        console.error('处理图像时发生错误:', error);
    }
}


export async function getImageDiff(oldImage, newImage, threshold) {
    if (!oldImage && newImage) {
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
            Math.abs(oldData[i] - newData[i]) > 5 ||
            Math.abs(oldData[i + 1] - newData[i + 1]) > 5 ||
            Math.abs(oldData[i + 2] - newData[i + 2]) > 5
        ) {
            changedPixels++;
        }
    }
    const hasChanged = changedPixels / (oldData.length / 3) > threshold;
    return hasChanged
}
