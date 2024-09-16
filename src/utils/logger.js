import { app } from 'electron';
import winston from 'winston';
import path from 'path';


// 配置日志文件的路径
const logPath = path.join(app.getPath('userData'), 'logs');
console.log({logPath})
// 创建 Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // 将日志写入文件
    new winston.transports.File({ filename: path.join(logPath, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logPath, 'combined.log') }),
  ],
});

// 如果不是生产环境，也将日志输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// 导出 logger 以便在其他文件中使用
export default logger;

// 使用示例
// logger.info('应用启动');
// logger.error('发生错误', { error: '错误详情' });
// logger.warn('警告信息');
// logger.debug('调试信息');