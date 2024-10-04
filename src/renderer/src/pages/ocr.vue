<template>
  <view class="text-white radius flex flex-direction dragable align-center justify-center"
    :style="{ height: '100vh', width: '100vw', 'background-color': `rgba(${blackOverlay})` }">
    <!-- <text class="text-white-opacity">...</text> -->
    <view class="flex align-center" v-if="loading">
      <view class="middle-box"></view>
      <view class="middle-box middle-box1"></view>
      <view class="middle-box"></view>
    </view>
    <view v-else class="ocr_result">
      <div v-for="(item, index) in processedOcrResult" :key="index" class="ocr-item" :style="item.boxStyle">
        <div class="text-container">
          <span :ref="`text-${index}`" :style="{ 'color': fontColor, 'text-align': 'left' }">{{ item.text }}</span>
        </div>
      </div>
    </view>
  </view>
</template>

<script>
const divideFlag = '**';
export default {
  data() {
    return {
      loading: true,
      ocrResult: [],
      blackOverlay: [0, 0, 0, 0.6],
      processedOcrResult: [],
      fontColor: 'rgba(0, 0, 0, 0.9)',
      boxType: 'background',
      boxColor: 'rgba(255, 255, 255, 0.9)',
    }
  },
  watch: {
    ocrResult: {
      handler(newResult) {
        this.processOcrResult(newResult);
      },
      deep: true
    }
  },
  mounted() {
    LCU.removeAllListeners('ocr-window-info')
    LCU.on('ocr-window-info', (data) => {
      console.log('OCR 窗口位置变化', data);
      this.ocrResult = []
      this.loading = false;
    });

    LCU.removeAllListeners('ocr-result')
    LCU.on('ocr-result', (data) => {
      try {
        console.log('OCR 结果', JSON.parse(data));
        if (JSON.parse(data).code == 100) {
          this.ocrResult = JSON.parse(data).data;
          // 渲染ocr结果
          this.loading = false;
        } else {
          this.ocrResult = []
          this.loading = false;
          LCU.invoke('ocr-window-fixed')
        }
      } catch (error) {
        console.log('OCR 结果', data);
      }
    });

    LCU.removeAllListeners('ocr-window-status')
    LCU.on('ocr-window-status', (data) => {
      console.log('OCR 窗口状态', data);
      this.loading = data === 'loading';
    });

    LCU.removeAllListeners('need-ocr')
    LCU.on('need-ocr', () => {
      console.log('需要OCR');
      // 展示一个空屏用来截图
      this.ocrResult = []
      LCU.invoke('apply-ocr', { blackOverlay: [...this.blackOverlay] })
    });

    LCU.removeAllListeners('ocr-window-config')
    LCU.on('ocr-window-config', (data) => {
      console.log('设置OCR窗口', data);
      if (data.blackOverlay) this.blackOverlay = data.blackOverlay
      if (data.boxType) this.boxType = data.boxType
      if (data.boxColor) this.boxColor = data.boxColor
      if (data.fontColor) this.fontColor = data.fontColor
    });
  },
  methods: {
    getBoxStyle(box) {
      const [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] = box;
      const centerX = (x1 + x2 + x3 + x4) / 4;
      const centerY = (y1 + y2 + y3 + y4) / 4;
      const width = Math.max(Math.abs(x2 - x1), Math.abs(x4 - x3));
      const height = Math.max(Math.abs(y3 - y1), Math.abs(y4 - y2));
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
      let style = {
        position: 'absolute',
        left: `${centerX - width / 2}px`,
        top: `${centerY - height / 2}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'center center',
        overflow: 'hidden',
      };

      if (this.boxType === 'line') {
        style.border = '1px solid ' + this.boxColor
        style.borderRadius = '1px'
      } else if (this.boxType === 'background') {
        style.backgroundColor = this.boxColor
      }

      return style
    },
    fitTextToBox(textElement, boxWidth, boxHeight) {
      let fontSize = Math.min(boxWidth, boxHeight) * 0.9; // 初始字体大小
      textElement.style.fontSize = `${fontSize}px`;
      textElement.style.lineHeight = '1.2';

      while ((textElement.scrollHeight > boxHeight || textElement.scrollWidth > boxWidth) && fontSize > 1) {
        fontSize--;
        textElement.style.fontSize = `${fontSize}px`;
      }
    },
    processOcrResult(result) {
      // 定义一个辅助函数来检查字符是否为标点符号
      const isPunctuation = (char) => {
        const punctuationRegex = /[。，、；：？！""''（）《》【】1234567890\,\.]/;
        return punctuationRegex.test(char);
      };

      const getLeftTopDistance = (point1, point2) => {
        return Math.sqrt((point1[0] - point2[0]) ** 2 + (point1[1] - point2[1]) ** 2);
      };

      // 合并相邻的box
      const mergedResult = [];
      for (let i = 0; i < result.length; i++) {
        if (i != 0) {
          console.log(getLeftTopDistance(result[i - 1].box[3], result[i].box[0]))
        }
        if (i === 0 || isPunctuation(result[i - 1].text.slice(-1)) || isPunctuation(result[i].text[0]) || getLeftTopDistance(result[i - 1].box[3], result[i].box[0]) > 10) {
          mergedResult.push({ ...result[i] });
        } else {
          // 合并当前项与前一项
          const prevItem = mergedResult[mergedResult.length - 1];
          prevItem.text = prevItem.text + ' ' + result[i].text;
          // 更新box，取两个box的外围边界
          prevItem.box = [
            [Math.min(prevItem.box[0][0], result[i].box[0][0]), Math.min(prevItem.box[0][1], result[i].box[0][1])],
            [Math.max(prevItem.box[1][0], result[i].box[1][0]), Math.min(prevItem.box[1][1], result[i].box[1][1])],
            [Math.max(prevItem.box[2][0], result[i].box[2][0]), Math.max(prevItem.box[2][1], result[i].box[2][1])],
            [Math.min(prevItem.box[3][0], result[i].box[3][0]), Math.max(prevItem.box[3][1], result[i].box[3][1])]
          ];
        }
      }
      // 使用合并后的结果替换原始结果
      result = mergedResult;
      this.processedOcrResult = result.map(item => ({
        ...item,
        boxStyle: this.getBoxStyle(item.box)
      }));
      this.$nextTick(() => {
        this.processedOcrResult.forEach((item, index) => {
          const textElement = this.$refs[`text-${index}`]?.[0];
          if (textElement) {
            this.fitTextToBox(textElement, parseFloat(item.boxStyle.width), parseFloat(item.boxStyle.height));
          }
        });
        if (this.processedOcrResult.length > 0) {
          this.translateText()
        } else {

          // LCU.invoke('ocr-window-fixed')
        }

      });
    },
    async translateText() {
      // 设置一个独特的分隔符，用来区分内容
      let text = this.processedOcrResult.map(item => {
        return item.text.trim().replaceAll(divideFlag, '')
      }).join(divideFlag)
      let res = await LCU.invoke('base_translate', { text, sourceLang: 'kor', targetLang: 'zh', service: 'baidu', options: { timeout: 5000 } })
      console.log(res)
      if (res.success && res.result.data) {
        let translateText = []
        if (res.result.data[0].result.length == this.processedOcrResult.length) {
          translateText = res.result.data[0].result
        } else {
          translateText = res.result.data[0].dst.trim().split(divideFlag)
        }
        console.log('翻译结果', translateText)
        this.processedOcrResult.forEach((item, index) => {
          item.text = translateText[index]

          const textElement = this.$refs[`text-${index}`]?.[0];
          if (textElement) {

            this.$nextTick(() => {
              this.fitTextToBox(textElement, parseFloat(item.boxStyle.width), parseFloat(item.boxStyle.height));
            })
          }
        })
        LCU.invoke('ocr-window-fixed')

        // this.$nextTick(() => {
        //   // 目前转中文效果最好，因为中文信息密度大，字能看清，英文信息密度小，字太小
        //   // this.adjustBox()
        // })
      }
    },
    adjustBox() {
      const adjustedBoxes = []

      this.processedOcrResult.forEach((item, index) => {
        const textElement = this.$refs[`text-${index}`]?.[0]
        if (!textElement) return

        const originalBox = item.boxStyle
        const originalLeft = parseFloat(originalBox.left)
        const originalTop = parseFloat(originalBox.top)
        let newWidth = parseFloat(originalBox.width)
        let newHeight = parseFloat(originalBox.height)

        // 初始化新的 box 样式
        const newBoxStyle = { ...originalBox }

        // 逐步增加宽度和高度,直到文本适合或达到限制
        while (
          (textElement.scrollWidth > textElement.clientWidth ||
            textElement.scrollHeight > textElement.clientHeight) &&
          newWidth < window.innerWidth &&
          newHeight < window.innerHeight
        ) {
          console.log('调整box', newWidth, newHeight)
          newWidth += 1
          newHeight += 1

          // 检查是否与其他 box 重叠
          const isOverlapping = adjustedBoxes.some(otherBox => this.checkOverlap(
            originalLeft, originalTop, newWidth, newHeight,
            parseFloat(otherBox.left), parseFloat(otherBox.top),
            parseFloat(otherBox.width), parseFloat(otherBox.height)
          ))

          if (isOverlapping) {
            // 如果重叠,回退到上一个有效大小
            newWidth -= 1
            newHeight -= 1
            break
          }

          newBoxStyle.width = `${newWidth}px`
          newBoxStyle.height = `${newHeight}px`
          this.fitTextToBox(textElement, newWidth, newHeight)
        }

        // 更新 box 样式
        item.boxStyle = newBoxStyle
        adjustedBoxes.push(newBoxStyle)

        // 重新应用文本适应
        this.$nextTick(() => {
          this.fitTextToBox(textElement, newWidth, newHeight)
        })
      })
    },
    checkOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
      return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1)
    }
  }
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #333;
  color: white;
  font-family: Arial, sans-serif;
}

page {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0);
}

.middle-box {
  animation: pulse 0.5s infinite ease-in-out;
}

@keyframes pulse {

  0%,
  100% {
    height: 10px;
  }

  50% {
    height: 20px;
  }
}

.middle-box1 {
  animation: pulse1 0.5s infinite ease-in-out;
}

@keyframes pulse1 {

  0%,
  100% {
    height: 20px;
  }

  50% {
    height: 10px;
  }
}

.ocr_result {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.middle-box {
  width: 10px;
  height: 10px;
  background-color: rgba(255, 255, 255, 0.4);
  margin: 10px;
}


.text-white-opacity {
  font-family: 'PixelFont', sans-serif;
  color: rgba(255, 255, 255, 0.4);
  font-size: 90px;
}

.background {
  background-size: 100% 100%;
}

.dragable {
  app-region: drag;
  -webkit-app-region: drag;
  user-select: none;
}

.bg-glasses {
  background-color: rgba(0, 0, 0, 0.4);
}

.long-modelName {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lyricsBox {
  margin-top: -20px;
  width: calc(100% - 30px);
  overflow: hidden;
}

.text-white {
  color: #ffffff;
}

.radius {
  border-radius: 6px;
}

.flex {
  display: flex;
}

.flex-direction {
  flex-direction: column;
}

.align-center {
  align-items: center;
}

.align-stretch {
  align-items: stretch;
}

.justify-center {
  justify-content: center;
}

.padding-sm {
  padding: 10px;
}

.justify-end {
  justify-content: flex-end;
}

.text-xl {
  font-size: 16px;
}

.text-xxl {
  font-size: 24px;
}

.flex-sub {
  flex: 1;
}

.text-gray {
  color: #aaaaaa;
}

.lock-icon::before {
  content: "🔒";
}

.unlock-icon::before {
  content: "🔓";
}

.opacity {
  opacity: 0.4;
}

.fix-btn {
  cursor: pointer;
  z-index: 999;
}

.ocr-item {
  box-sizing: border-box;
  display: flex;
  justify-content: start;
  align-items: start;
}

.text-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: start;
  justify-content: start;
  /* writing-mode: vertical-rl;
  text-orientation: upright; */
}

.text-container span {
  word-break: break-all;
  text-align: left;
  color: rgba(255, 255, 255, 0.8);
}
</style>