// 参考自 https://github.com/Hanxven/LeagueAkari/tree/main/addons/input

const input = require('./laInputWin32x64')
const { censor } = require('./censor');
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}
async function sendClipboard2Game(message, censor_active) {
  if (censor_active) {
    message = censor(message)
  }
  input.sendKey(13, true)
  input.sendKey(13, false)
  await sleep(65)
  input.sendKeysX(message)
  await sleep(65)
  // 延迟需要根据实际情况调整
  input.sendKey(13, true)
  input.sendKey(13, false)
}
async function sendClipboard2GameAll(message, censor_active) {
  if (censor_active) {
    message = censor(message)
  }
  input.sendKey(160, true)
  input.sendKey(13, true)
  input.sendKey(13, false)
  input.sendKey(160, false)
  await sleep(65)
  input.sendKeysX(message)
  await sleep(65)
  input.sendKey(13, true)
  input.sendKey(13, false)
}

process.on('message', (message) => {
  if (message.sendClipboard2Game) {
    sendClipboard2Game(message.data, message.censor_active)
  } else if (message.sendClipboard2GameAll) {
    sendClipboard2GameAll(message.data, message.censor_active)
  }else {
    input.sendKeysX(message.data, message.censor_active)
  }
});



