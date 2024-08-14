const { fork } = require('child_process');
const EventEmitter = require('events');

class ChildProcessManager extends EventEmitter {
  constructor(scriptPath, options = {}) {
    super();
    this.scriptPath = scriptPath;
    this.options = {
      maxRestarts: 5,
      restartDelay: 5000,
      ...options
    };
    this.childProcess = null;
    this.restartCount = 0;
    this.isShuttingDown = false;
  }

  start() {
    if (this.childProcess) {
      this.emit('warning', 'Child process already running');
      return;
    }

    this.createProcess();
  }
  exist() {
    if (this.childProcess) {
      return true
    } else {
      return false
    }
  }

  createProcess() {
    this.childProcess = fork(this.scriptPath, this.options.args, this.options.forkOptions);

    this.childProcess.on('error', (error) => {
      this.emit('error', error);
      this.handleProcessFailure('error');
    });

    this.childProcess.on('exit', (code, signal) => {
      this.emit('exit', code, signal);
      if (code !== 0 && !this.isShuttingDown) {
        this.handleProcessFailure('exit');
      }
    });

    this.childProcess.on('message', (message) => {
      this.emit('message', message);
    });

    this.emit('started');
  }

  handleProcessFailure(reason) {
    if (this.restartCount < this.options.maxRestarts) {
      this.restartCount++;
      this.emit('restarting', { reason, attempt: this.restartCount });
      setTimeout(() => this.createProcess(), this.options.restartDelay);
    } else {
      this.emit('max-restarts-reached');
    }
  }

  send(message) {
    if (this.childProcess) {
      this.childProcess.send(message);
    } else {
      this.emit('warning', 'Attempted to send message to non-existent child process');
    }
  }

  stop() {
    if (this.childProcess) {
      this.isShuttingDown = true;
      this.childProcess.removeAllListeners();
      this.childProcess.kill();
      this.childProcess = null;
      this.emit('stopped');
    }
  }

  restart() {
    this.stop();
    this.restartCount = 0;
    this.isShuttingDown = false;
    setTimeout(() => this.start(), 1000); // 短暂延迟以确保进程完全停止
  }
}
export default ChildProcessManager
// module.exports = ChildProcessManager;