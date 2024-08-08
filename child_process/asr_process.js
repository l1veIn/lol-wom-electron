const setupASR = require('./ASR');
let ai;

process.on('message', (message) => {
  if (message === 'start-asr') {
    ai = setupASR();
    ai.start();
  } else if (message === 'stop-asr') {
    if (ai) {
      ai.quit();
      ai = null;
      process.send('asr-stopped');
    }
  }
});
