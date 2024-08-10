const winston = require('winston');
const fs = require('fs').promises;

class CustomLogger {
  constructor(logFilePath = 'custom-logs.log') {
    this.logFilePath = logFilePath;
    this.logger = winston.createLogger({
      transports: [
        new winston.transports.File({ filename: this.logFilePath })
      ]
    });
  }

  log(message, level = 'info') {
    this.logger.log({
      level: level,
      message: message
    });
  }

  async readLogs() {
    try {
      const data = await fs.readFile(this.logFilePath, 'utf8');
      return data;
    } catch (error) {
      throw new Error(`Error reading log file: ${error.message}`);
    }
  }

  async clearLogs() {
    try {
      await fs.writeFile(this.logFilePath, '');
    } catch (error) {
      throw new Error(`Error clearing log file: ${error.message}`);
    }
  }
}

// 使用示例
async function main() {
  const logger = new CustomLogger('my-special-logs.log');

  // 记录一些日志 
  logger.log('这是一条信息日志');
  logger.log('这是一条警告日志', 'warn');
  logger.log('这是一条错误日志', 'error');

  // 读取并打印日志
  try {
    const logs = await logger.readLogs();
    console.log('日志内容:');
    console.log(logs);
  } catch (error) {
    console.error('读取日志时发生错误:', error);
  }

  // 清除日志
  try {
    await logger.clearLogs();
    console.log('日志已清除');
  } catch (error) {
    console.error('清除日志时发生错误:', error);
  }
}

// main();

// 如果您想在其他文件中使用这个类，请确保导出它
module.exports = CustomLogger;