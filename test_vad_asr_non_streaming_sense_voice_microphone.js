// Copyright (c)  2023-2024  Xiaomi Corporation (authors: Fangjun Kuang)
//
const portAudio = require('naudiodon2');
// console.log(portAudio.getDevices());

const sherpa_onnx = require('sherpa-onnx-node');

function createRecognizer() {
  // Please download test files from
  // https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models
  const config = {
    'featConfig': {
      'sampleRate': 16000,
      'featureDim': 80,
    },
    'modelConfig': {
      'senseVoice': {  
        'model':
            './resources/model/model.int8.onnx',
        'useInverseTextNormalization': 1,
      },
      'tokens':
          './resources/tokens.txt',
      'numThreads': 2,
      'provider': 'cpu',
      'debug': 1,
    }
  };

  return new sherpa_onnx.OfflineRecognizer(config);
}

function createVad() {
  // please download silero_vad.onnx from
  // https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx
  const config = {
    sileroVad: {
      model: './resources/model/silero_vad.onnx',
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

const recognizer = createRecognizer();
const vad = createVad();

const bufferSizeInSeconds = 30;
const buffer =
    new sherpa_onnx.CircularBuffer(bufferSizeInSeconds * vad.config.sampleRate);

const ai = new portAudio.AudioIO({
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
      const text = r.text.toLowerCase().trim();
      console.log(`${index}: ${text}`);
      index += 1;
    }
  }
}); 
ai.start();
console.log('Started! Please speak')
