const {
    mouse,
    straightTo,
    Point,
    keyboard,
    Key,
} = require("@nut-tree-fork/nut-js");

const { GlobalKeyboardListener } = require('node-global-key-listener');

let register_map = {};
const v = new GlobalKeyboardListener();

function keyToString(key) {
    return Array.isArray(key) ? key.join('+') : key;
}
function getCondition(keypress, message, down) {
    let keyArr = message.key.split('+');
    if (keyArr.length == 1) {
        return keypress.name === message.key && keypress.state == "DOWN"
    } else {
        return keypress.state == "DOWN" && keypress.name == keyArr[1] && (down[keyArr[0]])
    }
}

async function register(message) {
    let runner;
    if (message.script) {
        runner = require(message.script);
    } else {
        runner = () => { console.log('no script') };
    }
    // const { runner } = require(message.script);
    if (register_map[message.key]) {
        console.log(`shortcut ${message.key} registed, updating...`);
        unregister(message);
    }
    register_map[message.key] = {
        runner: runner,
        isRunning: false,
        listener: async (keypress, down) => {
            // console.log(`catch keypress: ${keypress.name}`);
            if(!getCondition(keypress, message, down)){
                return
            }
            if (!register_map[message.key].isRunning) {
                console.log(`catch keypress: ${keypress.name}`);
                register_map[message.key].isRunning = true;
                console.log(`run script: ${message.script}`);
                try {
                    await runner(mouse, straightTo, Point, keyboard, Key);
                } catch (error) {
                    console.error(`script error: ${error}`);
                } finally {
                    register_map[message.key].isRunning = false;
                    console.log(`script finished: ${message.script}`);
                }
            } else if (register_map[message.key].isRunning) {
                console.log(`script ${message.script} running, ignore ${message.key}`);
            }
        }
    };
    v.addListener(register_map[message.key].listener);
    console.log(`registed ${message.key} to run: ${message.script}`);
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

function stopASR() {
    console.log("stop all listener and quit...");
    Object.keys(register_map).forEach(key => {
        v.removeListener(register_map[key].listener);
    });
    register_map = {};
}

process.on('message', (message) => {
    if (message.key) {
        console.log('catch message:', message.key);
        if (message.remove) {
            unregister(message);
        } else {
            register(message);
        }
    } else if (message === 'stop') {
        stopASR();
        process.exit();
    }
});

console.log("waiting for message...");