/**
 * Base CI Provider Class
 * Defines the interface that all CI providers must implement.
 */
class BaseProvider {
  getInput(_name) {
    throw new Error('getInput() must be implemented by subclass')
  }

  debug(_message) {
    throw new Error('debug() must be implemented by subclass')
  }

  info(_message) {
    throw new Error('info() must be implemented by subclass')
  }

  warning(_message) {
    throw new Error('warning() must be implemented by subclass')
  }

  setFailed(_message) {
    throw new Error('setFailed() must be implemented by subclass')
  }

  getContext() {
    throw new Error('getContext() must be implemented by subclass')
  }

  createRunContext() {
    throw new Error('createRunContext() must be implemented by subclass')
  }

  _createCoreInterface() {
    return {
      getInput: (name) => this.getInput(name),
      setFailed: (message) => this.setFailed(message),
      debug: (message) => this.debug(message),
      info: (message) => this.info(message),
      warning: (message) => this.warning(message),
    }
  }
}

module.exports = { BaseProvider }
