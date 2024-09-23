<template>
  <view class="text-white radius flex flex-direction padding-sm"
    :style="{ height: '100vh', width: '100vw', 'background-color': `rgba(0, 0, 0, ${opacity})` }">
    <view class="flex justify-end text-xl" @click="changeStatus">
      <view class="flex-sub" :class="{ 'dragable': !lock }"></view>
      <view class="fix-btn">
        <text :class="{ 'opacity': lock }"> {{ lock ? '🔒' : '🔓' }} </text>
      </view>
    </view>
    <view class="flex-sub flex flex-direction lyricsBox" :class="{ 'dragable': !lock }">
      <view class="text-gray long-modelName" :style="{ fontSize: fontSize * previous_lyrics_size_rate + 'px' }"
        v-for="lyrics in previous_lyrics">
        {{ lyrics }}
      </view>
      <view class="flex-sub" :class="getVisualLength(current_lyrics) > 42 ? 'text-xl' : 'text-xxl'"
        :style="{ fontSize: fontSize + 'px' }">
        <view>{{ current_lyrics || '等待中...' }}</view>
      </view>
    </view>
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
      lastStateChangeTime: 0,
      last_lyrics: '',
      current_lyrics: '',
      previous_lyrics: [],
      opacity: 0.4,
      fontSize: 24,
      maxPreviousLines: 1,
      previous_lyrics_size_rate: 0.8,
    }
  },
  mounted() {
    LCU.on('asr-message', this.handleMsg)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.lock = false
        LCU.invoke('set-ignore-mouse-events', false, {
          forward: false
        });
      }
    })
  },
  methods: {
    getVisualLength,
    changeStatus() {
      console.log(this.lock)
      this.lock = !this.lock
      if (this.lock) {
        LCU.invoke('set-ignore-mouse-events', true, {
          forward: true
        });
      }
    },
    handleMsg(msg) {
      console.log(msg)
      if (msg != 'ASR-started') {
        this.previous_lyrics.push(this.current_lyrics)
        if (this.previous_lyrics.length > this.maxPreviousLines) {
          this.previous_lyrics.shift()
        }
        this.current_lyrics = msg
      }
    },
    setConfig(config) {
      this.maxPreviousLines = config.maxPreviousLines
      this.previous_lyrics_size_rate = config.previous_lyrics_size_rate
      this.fontSize = config.fontSize
      this.opacity = config.opacity
    },
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