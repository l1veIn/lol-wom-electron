const input = require('./laInputWin32x64')
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time))
}
async function sendClipboard2Game(message) {
  input.sendKey(13, true)
  input.sendKey(13, false)
  await sleep(65)
  input.sendKeysX(message)
  await sleep(65)
  input.sendKey(13, true)
  input.sendKey(13, false)
}
async function sendClipboard2GameAll(message) {
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
    sendClipboard2Game(message.data)
  } else if (message.sendClipboard2GameAll) {
    sendClipboard2GameAll(message.data)
  }else {
    input.sendKeysX(message.data)
  }
});



