// 方法1：在脚本开头设置控制台编码
// 请注意，这种方法可能不适用于所有 Windows 版本
process.stdout.setEncoding('utf8');
console.log('\x1b[33m%s\x1b[0m', '方法1: 设置控制台编码');
console.log('你好，世界！');
console.log('Hello, World!');
console.log('こんにちは、世界！');
console.log('안녕하세요, 세계!');

// 方法2：使用 iconv-lite 库
const iconv = require('iconv-lite');

console.log('\x1b[33m%s\x1b[0m', '\n方法2: 使用 iconv-lite 库');
console.log(iconv.encode('你好，世界！', 'utf8').toString());
console.log(iconv.encode('Hello, World!', 'utf8').toString());
console.log(iconv.encode('こんにちは、世界！', 'utf8').toString());
console.log(iconv.encode('안녕하세요, 세계!', 'utf8').toString());

// 方法3：使用 console.dir
console.log('\x1b[33m%s\x1b[0m', '\n方法3: 使用 console.dir');
console.dir('你好，世界！', { encoding: 'utf8' });
console.dir('Hello, World!', { encoding: 'utf8' });
console.dir('こんにちは、世界！', { encoding: 'utf8' });
console.dir('안녕하세요, 세계!', { encoding: 'utf8' });

// 测试函数
function testOutput(text) {
  console.log('\x1b[32m%s\x1b[0m', '\n测试文本:');
  console.log(text);
  console.dir(text, { encoding: 'utf8' });
}

// 测试不同的文本
testOutput('你好，世界！ Hello, World! こんにちは、世界！ 안녕하세요, 세계!');