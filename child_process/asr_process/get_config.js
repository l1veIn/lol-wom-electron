
const { join } = require('path');
function get_config(message) {
    const config = {
        'featConfig': {
          'sampleRate': 16000,
          'featureDim': 80,
        },
        'modelConfig': {
          'senseVoice': {
            'model': join(message.modelDir,message.model,'model.int8.onnx'),
            'useInverseTextNormalization': 1,
          },
          'tokens': join(message.modelDir,message.model,'tokens.txt'),
          'numThreads': 2,
          'provider': 'cpu',
          'debug': 1,
        }
      };
    return config;
}
module.exports = get_config;