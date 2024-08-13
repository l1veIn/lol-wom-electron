// 使用nut.js模拟键盘输入
const input = require('./child_process/nut/laInputWin32x64')

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time))
}


async function runner(mouse, straightTo, Point, keyboard, Key) {
    console.log('sendMsg')
    await sleep(3000)
    // keyboard.config.autoDelayMs = 0;
    // await keyboard.pressKey(Key.Enter);
    // await keyboard.type('ASDW ASXCZXCW ASFG QWG ASSA GWG?')
    input.sendKey(13, true)
    input.sendKey(13, false)
    await sleep(65)
    // await keyboard.type('ASDW ASXCZXCW ASFG QWG ASSA GWG?')
    input.sendKeysX('你好你啊你好你啊你好你啊你好你啊你好你啊你好你啊你好你啊你好你啊')
    await sleep(65)
    input.sendKey(13, true)
    input.sendKey(13, false)
    // await keyboard.pressKey(Key.Enter);
}

// module.exports = runner

runner()


