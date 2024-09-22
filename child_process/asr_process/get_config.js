
const { join } = require('path');
let modelConfigMap = {
    "sherpa-onnx-whisper-tiny": "tiny",
    "sherpa-onnx-whisper-base": "base",
    "sherpa-onnx-whisper-small": "small",
    "sherpa-onnx-whisper-large-v3": "large-v3"
};
function get_config(message) {
    switch (message.model) {
        case "sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17":
            return {
                'featConfig': {
                    'sampleRate': 16000,
                    'featureDim': 80,
                },
                'modelConfig': {
                    'senseVoice': {
                        'model': join(message.modelDir, message.model, 'model.int8.onnx'),
                        'useInverseTextNormalization': 1,
                    },
                    'tokens': join(message.modelDir, message.model, 'tokens.txt'),
                    'numThreads': message.cpu_numThreads || 2,
                    'provider': 'cpu',
                    'debug': 1,
                }
            };
        case "sherpa-onnx-whisper-tiny":
        case "sherpa-onnx-whisper-base":
        case "sherpa-onnx-whisper-small":
            modelSize = modelConfigMap[message.model];
            console.log(modelSize)
            return {
                'featConfig': {
                    'sampleRate': 16000,
                    'featureDim': 80,
                },
                'modelConfig': {
                    'whisper': {
                        'encoder': join(message.modelDir, message.model, `${modelSize}-encoder.int8.onnx`),
                        'decoder': join(message.modelDir, message.model, `${modelSize}-decoder.onnx`),
                    },
                    'tokens': join(message.modelDir, message.model, `${modelSize}-tokens.txt`),
                    'numThreads': message.cpu_numThreads || 2,
                    'provider': 'cpu',
                    'debug': 1,
                }
            };
        case "sherpa-onnx-whisper-large-v3":
            modelSize = modelConfigMap[message.model];
            return {
                'featConfig': {
                    'sampleRate': 16000,
                    'featureDim': 80,
                },
                'modelConfig': {
                    'whisper': {
                        'encoder': join(message.modelDir, message.model, `${modelSize}-encoder.int8.onnx`),
                        'decoder': join(message.modelDir, message.model, `${modelSize}-decoder.int8.onnx`),
                    },
                    'tokens': join(message.modelDir, message.model, `${modelSize}-tokens.txt`),
                    'numThreads': message.cpu_numThreads || 2,
                    'provider': 'cpu',
                    'debug': 1,
                }
            };

        case "sherpa-onnx-zipformer-multi-zh-hans-2023-9-2":
            return {
                'featConfig': {
                    'sampleRate': 16000,
                    'featureDim': 80,
                },
                'modelConfig': {
                    'transducer': {
                        'encoder':
                            join(message.modelDir, message.model, 'encoder-epoch-20-avg-1.int8.onnx'),
                        'decoder':
                            join(message.modelDir, message.model, 'decoder-epoch-20-avg-1.onnx'),
                        'joiner':
                            join(message.modelDir, message.model, 'joiner-epoch-20-avg-1.int8.onnx'),
                    },
                    'tokens': join(message.modelDir, message.model, 'tokens.txt'),
                    'numThreads': message.cpu_numThreads || 2,
                    'provider': 'cpu',
                    'debug': 1,
                }
            }
        case "sherpa-onnx-zipformer-cantonese-2024-03-13":
            return {
                'featConfig': {
                    'sampleRate': 16000,
                    'featureDim': 80,
                },
                'modelConfig': {
                    'transducer': {
                        'encoder':
                            join(message.modelDir, message.model, 'encoder-epoch-45-avg-35.int8.onnx'),
                        'decoder':
                            join(message.modelDir, message.model, 'decoder-epoch-45-avg-35.onnx'),
                        'joiner':
                            join(message.modelDir, message.model, 'joiner-epoch-45-avg-35.int8.onnx'),
                    },
                    'tokens': join(message.modelDir, message.model, 'tokens.txt'),
                    'numThreads': message.cpu_numThreads || 2,
                    'provider': 'cpu',
                    'debug': 1,
                }
            }
        case "sherpa-onnx-paraformer-zh-2024-03-09":
        case "sherpa-onnx-paraformer-zh-small-2024-03-09":
            return {
                'featConfig': {
                    'sampleRate': 16000,
                    'featureDim': 80,
                },
                'modelConfig': {
                    'paraformer': {
                        'model': join(message.modelDir, message.model, 'model.int8.onnx'),
                    },
                    'tokens': join(message.modelDir, message.model, 'tokens.txt'),
                    'numThreads': message.cpu_numThreads || 2,
                    'provider': 'cpu',
                    'debug': 1,
                }
            }
    }
}
module.exports = get_config;