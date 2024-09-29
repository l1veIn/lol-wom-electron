const { spawn } = require('child_process');
const readline = require('readline');

function startOCREngine() {
  const ocrProcess = spawn('./RapidOCR-json_v0.2.0/RapidOCR-json.exe',['--models=./RapidOCR-json_v0.2.0/models']);

  ocrProcess.stdout.on('data', (data) => {
    console.log(`OCR引擎输出: ${data}`);
  });

  ocrProcess.stderr.on('data', (data) => {
    console.error(`OCR引擎错误: ${data}`);
  });

  ocrProcess.on('close', (code) => {
    console.log(`OCR引擎进程退出,退出码 ${code}`);
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function promptUser() {
    rl.question('请输入OCR命令 (输入 "exit" 退出): ', (input) => {
      if (input.toLowerCase() === 'exit') {
        ocrProcess.kill();
        rl.close();
        return;
      }

      ocrProcess.stdin.write(input + '\n');
      promptUser();
    });
  }

  promptUser();
}

startOCREngine();