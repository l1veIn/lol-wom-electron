<template>
    <view class="text-white radius flex flex-direction padding-sm dragable"
      :style="{ height: '100vh', width: '100vw', 'background-color': `rgba(0, 0, 0, ${opacity})` }">
      OCR{{ position }}
    </view>
  </template>
  
  <script>
  function getVisualLength(str) {
    return str.split('').reduce((acc, char) => {
      return acc + (char.match(/[\u4e00-\u9fa5]/) ? 2 : 1);
    }, 0);
  }
  export default {
    data() {
      return {
        lock: false,
        isOverButton: false,
        opacity: 0.4,
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
  
  .align-stretch {
    align-items: stretch;
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