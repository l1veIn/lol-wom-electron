const fs = require('fs');
const path = require('path');
const AhoCorasick = require('ahocorasick');

function loadSensitiveWords(filePath) {
  const words = fs.readFileSync(filePath, 'utf-8').split('\n').map(word => word.trim());
  return words;
}

const sensitiveWords = loadSensitiveWords(path.join(__dirname, 'sensitive_words_lines.txt'));
const ac = new AhoCorasick(sensitiveWords);

function censor(text) {
  const matches = ac.search(text);
  let result = text;
  for (let match of matches) {
    const start = match[0];
    const word = match[1][0];
    const length = word.length;
    result = result.substring(0, start) + '*'.repeat(length) + result.substring(start + length);
  }
  return result;
}

module.exports = { censor };
