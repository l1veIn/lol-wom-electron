// 使用nut.js模拟键盘输入
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time))
}
async function runner(mouse, straightTo, Point, keyboard, Key,input) {
    console.log('sendMsg')
    await sleep(3000)

    input.sendKey(13, true)
    input.sendKey(13, false)
    await sleep(65)
    input.sendKeysX('你好你啊你好你啊你好你啊你好你啊你好你啊你好你啊你好你啊你好你啊')
    await sleep(65)
    input.sendKey(13, true)
    input.sendKey(13, false)
}

module.exports = runner












