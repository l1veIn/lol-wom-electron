<template>
  <view class="text-white radius flex flex-direction padding-sm dragable background align-center justify-center"
    :style="{ height: '100vh', width: '100vw', 'background-color': `rgba(0, 0, 0, ${opacity})` }">
    <!-- <text class="text-white-opacity">OCR</text> -->
    <view style="height: 100px;width: 100px;background-color: rgba(255, 255, 255, 0.4);"></view>
    <!-- <svg>
      <text x="10" y="50" font-size="90" fill="rgba(255, 255, 255, 0.4)">OCR</text>
    </svg> -->
    <!-- <svg width="200" height="50">
      <path id="textPath" d="M0,25 H200" fill="none" />
      <text>
        <textPath href="#textPath" fill="rgba(255, 255, 255, 0.4)">您的文字</textPath>
      </text>
    </svg> -->
  </view>
</template>

<script>
export default {
  data() {
    return {
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
      console.log('OCR 结果', data);
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

.text-white-opacity {
  color: rgba(255, 255, 255, 0.4);
  /* -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale; */

  font-size: 90px;
  transform: translate(0.5px, 0.5px);
  font-weight: bold;
  transform: scale(0.8);
  transform-origin: left top;
  
  image-rendering: pixelated;
  image-rendering: crisp-edges;

}

.background {
  background-image: url('../../assets/images/background.png');
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