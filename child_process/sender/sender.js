// 参考自 https://github.com/Hanxven/LeagueAkari/tree/main/addons/input

const input = require('./laInputWin32x64')
const { censor } = require('./censor');
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}
async function sendClipboard2Game(message) {
  let msg = message.data
  if (message.censor_active) {
    msg = censor(msg)
  }
  let press_interval = message.press_interval || 65
  input.sendKey(13, true)
  input.sendKey(13, false)
  await sleep(press_interval)
  input.sendKeysX(msg)
  await sleep(press_interval)
  // 延迟需要根据实际情况调整
  input.sendKey(13, true)
  input.sendKey(13, false)
}
async function sendClipboard2GameAll(message) {
  let msg = message.data
  if (message.censor_active) {
    msg = censor(msg)
  }
  let press_interval = message.press_interval || 65
  input.sendKey(160, true)
  input.sendKey(13, true)
  input.sendKey(13, false)
  input.sendKey(160, false)
  await sleep(press_interval)
  input.sendKeysX(msg)
  await sleep(press_interval)
  input.sendKey(13, true)
  input.sendKey(13, false)
}

process.on('message', (message) => {
  if (message.sendClipboard2Game) {
    sendClipboard2Game(message)
  } else if (message.sendClipboard2GameAll) {
    sendClipboard2GameAll(message)
  }else {
    input.sendKeysX(message.data)
  }
});



