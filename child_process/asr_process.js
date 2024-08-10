const portAudio = require('naudiodon2');
const { join } = require('path');
const sherpa_onnx = require('sherpa-onnx-node');
function createRecognizer() {
  const config = {
    'featConfig': {
      'sampleRate': 16000,
      'featureDim': 80,
    },
    'modelConfig': {
      'senseVoice': {
        'model': join(__dirname, '../resources/model/model.int8.onnx'),
        'useInverseTextNormalization': 1,
      },
      'tokens': join(__dirname, '../resources/tokens.txt'),
      'numThreads': 2,
      'provider': 'cpu',
      'debug': 1,
    }
  };
  return new sherpa_onnx.OfflineRecognizer(config);
}

function createVad() {
  const config = {
    sileroVad: {
      model: join(__dirname, '../resources/model/silero_vad.onnx'),
      threshold: 0.5,
      minSpeechDuration: 0.25,
      minSilenceDuration: 0.5,
      windowSize: 512,
    },
    sampleRate: 16000,
    debug: true,
    numThreads: 1,
  };

  const bufferSizeInSeconds = 60;

  return new sherpa_onnx.Vad(config, bufferSizeInSeconds);
}
let recognizer = null;
let vad = null;
let buffer = null;
let ai = null;

function setupASR(win) {
  recognizer = createRecognizer();
  vad = createVad();
  const bufferSizeInSeconds = 30;
  buffer = new sherpa_onnx.CircularBuffer(bufferSizeInSeconds * vad.config.sampleRate);
  ai = new portAudio.AudioIO({
    inOptions: {
      channelCount: 1,
      closeOnError: false,
      deviceId: -1,
      sampleFormat: portAudio.SampleFormatFloat32,
      sampleRate: vad.config.sampleRate,
      framesPerBuffer: 1024
    }
  });
  let printed = false;
  let index = 0;
  ai.on('data', data => {
    const windowSize = vad.config.sileroVad.windowSize;
    buffer.push(new Float32Array(data.buffer));
    while (buffer.size() > windowSize) {
      const samples = buffer.get(buffer.head(), windowSize);
      buffer.pop(windowSize);
      vad.acceptWaveform(samples);
    }

    while (!vad.isEmpty()) {
      const segment = vad.front();
      vad.pop();
      const stream = recognizer.createStream();
      stream.acceptWaveform({
        samples: segment.samples,
        sampleRate: recognizer.config.featConfig.sampleRate
      });
      recognizer.decode(stream);
      const r = recognizer.getResult(stream);
      if (r.text.length > 0) {
        let text = r.text.toLowerCase().trim();
        process.send(text);
        console.log(`${index}: ${text}`);
        index += 1;
      }
    }
  });
  ai.start();
  process.send('ASR-started');
  console.log('ASR started');
}

function stopASR() {
  ai.quit();
  recognizer = null
  vad = null
  buffer = null
  ai = null
  console.log('ASR stopped');
}

process.on('message', (message) => {
  if (message === 'start-asr') {
    setupASR();
  } else if (message === 'stop-asr') {
    stopASR()
    process.exit();
  }
});
