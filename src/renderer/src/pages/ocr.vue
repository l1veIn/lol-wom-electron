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
          <span :ref="`text-${index}`" :style="{'color':fontColor}">{{ item.text }}</span>
        </div>
      </div>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: true,
      ocrResult: [],
      blackOverlay: [255, 255, 0, 0.4],
      processedOcrResult: [],
      fontColor: 'rgba(0, 0, 255, 0.8)',
      boxType: 'background',
      boxColor: 'rgba(0, 0, 0, 0.9)',
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
          LCU.invoke('ocr-window-fixed')
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
      this.blackOverlay = data.blackOverlay
      this.boxType = data.boxType
      this.boxColor = data.boxColor
      this.fontColor = data.fontColor
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
      });
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
}

.text-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* writing-mode: vertical-rl;
  text-orientation: upright; */
}

.text-container span {
  word-break: break-all;
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
}
</style>