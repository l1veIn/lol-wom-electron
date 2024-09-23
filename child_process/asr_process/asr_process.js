const portAudio = require('naudiodon2');
const { join, basename } = require('path');
const sherpa_onnx = require('sherpa-onnx-node');
const get_config = require('./get_config');
const fs = require('fs');
const S = require("simplebig");
// const logger = require('../../src/utils/logger');
const { censor } = require('./censor');


const winston = require('winston');
let logger = null;


function initLogger(path) {
  logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ filename: join(path, 'asr_process.log') })
    ]
  });
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}


function createRecognizer(message) {
  logger.info('开始创建识别器', { message });
  const config = get_config(message);
  logger.info('识别器配置', { config });
  console.log({ config })
  const recognizer = new sherpa_onnx.OfflineRecognizer(config);
  logger.info('识别器创建完成');
  return recognizer;
}

let speaker_path = join(__dirname, '../../resources/model/3dspeaker_speech_eres2net_base_sv_zh-cn_3dspeaker_16k.onnx')

function createSpeakerEmbeddingExtractor() {
  const config = {
    model: speaker_path.replace('app.asar', 'app.asar.unpacked'),
    numThreads: 1,
    debug: true,
  };
  logger.info('开始创建说话人识别');
  return new sherpa_onnx.SpeakerEmbeddingExtractor(config);
}

function computeEmbedding(extractor, filename) {
  const stream = extractor.createStream();
  const wave = sherpa_onnx.readWave(filename, enableExternalBuffer = false);
  stream.acceptWaveform({ sampleRate: wave.sampleRate, samples: wave.samples });
  return extractor.compute(stream);
}

function addSpeakers(path, extractor, manager) {
  logger.info('开始添加预设说话人');

  // 获取路径下的所有文件夹(说话人)
  const speakers = fs.readdirSync(path, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  speakers.forEach(speaker => {
    const speakerPath = join(path, speaker);
    // 获取说话人文件夹下的所有.wav文件
    const wavFiles = fs.readdirSync(speakerPath)
      .filter(file => file.endsWith('.wav'))
      .map(file => join(speakerPath, file));

    logger.info(`处理说话人: ${speaker}, 音频文件数: ${wavFiles.length}`);

    // 计算每个音频文件的嵌入向量
    const embeddingList = wavFiles.map(file => {
      const embedding = computeEmbedding(extractor, file);
      logger.info(`计算嵌入向量: ${basename(file)}`);
      return embedding;
    });

    // 将说话人及其嵌入向量列表添加到管理器
    manager.addMulti({ name: speaker, v: embeddingList });
    logger.info(`已添加说话人: ${speaker}`);
  });

  logger.info(`预设说话人添加完成,总数: ${speakers.length}`);
}

let vad_path = join(__dirname, '../../resources/model/silero_vad.onnx')

function createVad(message) {
  logger.info('开始创建 VAD');
  const config = {
    sileroVad: {
      model: vad_path.replace('app.asar', 'app.asar.unpacked'),
      threshold: message.vad_threshold || 0.5,
      minSpeechDuration: message.vad_minSpeechDuration || 0.25,
      minSilenceDuration: message.vad_minSilenceDuration || 0.5,
      windowSize: 512,
    },
    sampleRate: 16000,
    debug: true,
    numThreads: 1,
  };
  logger.info('VAD 配置', { config });
  const bufferSizeInSeconds = 60;
  const vad = new sherpa_onnx.Vad(config, bufferSizeInSeconds);
  logger.info('VAD 创建完成');
  return vad;
}

let recognizer = null;
let vad = null;
let buffer = null;
let ai = null;
let extractor = null;
let manager = null;

function setupASR(message) {
  logger.info('开始设置 ASR', { message });
  recognizer = createRecognizer(message);
  vad = createVad(message);
  const bufferSizeInSeconds = 30;
  buffer = new sherpa_onnx.CircularBuffer(bufferSizeInSeconds * vad.config.sampleRate);
  ai = new portAudio.AudioIO({
    inOptions: {
      channelCount: 1,
      closeOnError: false,
      deviceId: message.device,
      sampleFormat: portAudio.SampleFormatFloat32,
      sampleRate: vad.config.sampleRate,
      framesPerBuffer: 1024
    }
  });
  logger.info('音频输入设置完成', { deviceId: message.device });

  if (message.use_speaker_diarization) {
    extractor = createSpeakerEmbeddingExtractor();
    manager = new sherpa_onnx.SpeakerEmbeddingManager(extractor.dim);
    if (message.speaker_sound_path) {
      // TODO: 实现从路径批量计算说话人语音向量并添加
      // logger.info('需要实现从指定路径加载预设说话人音频');
      addSpeakers(message.speaker_sound_path, extractor, manager)
    }
  }
  let index = 0;
  ai.on('data', data => {
    const windowSize = vad.config.sileroVad.windowSize;
    buffer.push(new Float32Array(data.buffer));
    // console.log('buffer.size()', buffer.size())

    while (buffer.size() > windowSize) {
      const samples = buffer.get(buffer.head(), windowSize);
      buffer.pop(windowSize);
      vad.acceptWaveform(samples);
    }

    // console.log('vad.isEmpty()',vad.isEmpty())
    while (!vad.isEmpty()) {
      const segment = vad.front();
      vad.pop();
      const stream = recognizer.createStream();
      stream.acceptWaveform({
        samples: segment.samples,
        sampleRate: recognizer.config.featConfig.sampleRate
      });


      let currentSpeaker = "";
      if (message.use_speaker_diarization) {
        const stream2 = extractor.createStream();
        stream2.acceptWaveform({
          samples: segment.samples,
          sampleRate: recognizer.config.featConfig.sampleRate
        });
        const embedding = extractor.compute(stream2);

        let speakerNum = manager.getNumSpeakers();
        if (speakerNum === 0 && message.use_auto_speaker_diarization) {
          currentSpeaker = "说话人1";
          manager.add({ name: currentSpeaker, v: embedding });
          logger.info('初始化说话人列表', { speaker: currentSpeaker });
        } else {
          const result = manager.search({ v: embedding, threshold: message.speaker_sound_threshold });
          if (result === "") {
            if (message.use_auto_speaker_diarization) {
              currentSpeaker = `说话人${speakerNum + 1}`;
              manager.add({ name: currentSpeaker, v: embedding });
              logger.info('添加新说话人', { speaker: currentSpeaker });
            } else {
              currentSpeaker = "未知";
            }
          } else {
            currentSpeaker = result;
          }
        }
        logger.info('识别到说话人', { speaker: currentSpeaker });
      }
      recognizer.decode(stream);
      const r = recognizer.getResult(stream);
      if (r.text.length > 0) {
        let text = r.text.toLowerCase().trim();
        if (message.use_censor_words) {
          text = censor(text)
        }
        if (message.use_simplified_chinese_to_traditional) {
          text = S.s2t(text)
        }
        if (message.use_speaker_diarization) {
          process.send({ text: text, speaker: currentSpeaker });
        } else {
          process.send({ text: text });
        }
        logger.info('识别结果', { index, text, currentSpeaker });
        index += 1;
      }
    }
  });

  ai.start();
  process.send('ASR-started');
  logger.info('ASR 启动完成');
}

function stopASR() {
  logger.info('开始停止 ASR');
  ai.quit();
  recognizer = null
  vad = null
  buffer = null
  ai = null
  logger.info('ASR 已停止');
}

process.on('message', (message) => {
  if (message.model) {
    initLogger(message.logPath);
    logger.info('收到模型信息', { model: message.model });
    setupASR(message);
  } else if (message === 'stop-asr') {
    logger.info('收到停止 ASR 命令');
    stopASR()
    process.exit();
  }
});

console.log('ASR 进程初始化完成');
