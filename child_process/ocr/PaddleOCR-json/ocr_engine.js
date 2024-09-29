const OCR = require('paddleocrjson');


const ocr = new OCR('PaddleOCR-json.exe', [/* '-port=9985', '-addr=loopback' */], {
    cwd: './PaddleOCR-json',
}, /* debug */true);

ocr.flush({ image_path: 'C:/Users/A/Desktop/testOcr.png' })
    .then((data) => console.log(data))
    .then(() => ocr.terminate());

// debug = true
ocr.stdout.on('data', (chunk) =>{
    console.log(chunk.toString());
});
ocr.stderr.on('data', (data) =>{
    console.log(data.toString());
});
ocr.on('exit', (code) =>{
    console.log('exit code: ', code);
});
