const {
    mouse,
    straightTo,
    Point,
    keyboard,
    Key,
} = require("@nut-tree-fork/nut-js");
const path = require('path');

const { GlobalKeyboardListener } = require('node-global-key-listener');
let register_map = {};
const v = new GlobalKeyboardListener();

function getCondition(keypress, message, down) {
    let keyArr = message.key.split('+');
    if (keyArr.length == 1) {
        return keypress.name === message.key && keypress.state == "UP"
    } else {
        return keypress.state == "DOWN" && keypress.name == keyArr[1] && (down[keyArr[0]])
    }
}

function input(message) {
    process.send(message);
}

async function register(message) {
    console.log('register', message);
    let runner;
    // 处理几个特殊键，直接执行
    // else if (message.script == 'sendClipboard2Game') {
    //     runner = async () => { process.send({ sendClipboard2Game: true, ...message }) };
    // } else if (message.script == 'sendClipboard2GameAll') {
    //     runner = async () => { process.send({ sendClipboard2GameAll: true, ...message }) };
    // }
    if (message.key == 'PAGE UP') {
        runner = async () => { process.send({ onPageUp: true }) };
    } else if (message.key == 'PAGE DOWN') {
        runner = async () => { process.send({ onPageDown: true }) };
    } else if (message.script) {
        if (path.isAbsolute(message.script) || message.script.startsWith('./') || message.script.startsWith('../')) {
            runner = require(message.script);
        } else {
            console.log(`${message.script} not a valid path`);
            let reply = { ...message };
            reply[message.script] = true;
            runner = async () => { process.send(reply) };
        }
    }

    if (register_map[message.key]) {
        console.log(`shortcut ${message.key} registed, updating...`);
        unregister(message);
    }
    register_map[message.key] = {
        runner: runner,
        isRunning: false,
        listener: async (keypress, down) => {
            // console.log('keypress', keypress.name);
            if (!getCondition(keypress, message, down)) {
                return
            }
            if (!register_map[message.key].isRunning) {
                console.log(`catch keypress: ${keypress.name}`);
                register_map[message.key].isRunning = true;
                console.log(`run script: ${message.key}`);
                try {
                    runner(mouse, straightTo, Point, keyboard, Key, input);
                } catch (error) {
                    console.error(`script error: ${error}`);
                } finally {
                    register_map[message.key].isRunning = false;
                    console.log(`script finished: ${message.key}`);
                }
            } else if (register_map[message.key].isRunning) {
                console.log(`script ${message.key} running, ignore ${message.key}`);
            }
        }
    };
    v.addListener(register_map[message.key].listener);
    console.log(`registed ${message.key} to run: ${message.script || 'inputer clipborad'}`);
}

function unregister(message) {
    if (register_map[message.key]) {
        v.removeListener(register_map[message.key].listener);
        delete register_map[message.key];
        console.log(`cancel ${message.key}`);
    } else {
        console.log(`no ${message.key} registed`);
    }
}

function stop() {
    console.log("stop all listener and quit...");
    Object.keys(register_map).forEach(key => {
        v.removeListener(register_map[key].listener);
    });
    register_map = {};
}

process.on('message', async (message) => {
    if (message.key) {
        console.log('catch message:', message.key);
        if (message.remove) {
            unregister(message);
        } else {
            register(message);
        }
    } else if (message === 'stop') {
        stop();
        process.exit();
    }
});

console.log("waiting for shortcut...");
