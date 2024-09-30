<template>
  <view class="text-white radius flex flex-direction padding-sm dragable align-center justify-center"
    :style="{ height: '100vh', width: '100vw', 'background-color': `rgba(0, 0, 0, ${opacity})` }">
    <!-- <text class="text-white-opacity">...</text> -->
    <view class="flex align-center" v-if="loading">
      <view class="middle-box"></view>
      <view class="middle-box middle-box1"></view>
      <view class="middle-box"></view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      loading: true,
      lock: false,
      isOverButton: false,
      opacity: 0.9,
      fontSize: 24,
      position: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    }
  },
  mounted() {
    LCU.removeAllListeners('ocr-window-info')
    LCU.on('ocr-window-info', (data) => {
      console.log('OCR 窗口位置变化', data);
      this.position = data;
    });
    LCU.removeAllListeners('ocr-result')
    LCU.on('ocr-result', (data) => {
      try {
        console.log('OCR 结果', JSON.parse(data));
        this.ocrResult = JSON.parse(data);
        this.loading = false;
        LCU.invoke('ocr-window-fixed')
      } catch (error) {
        console.log('OCR 结果', data);
      }
    });
    LCU.removeAllListeners('ocr-window-status')
    LCU.on('ocr-window-status', (data) => {
      console.log('OCR 窗口状态', data);
      this.loading = data === 'loading';
    });
  },
  methods: {
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
</style>