/* eslint-disable class-methods-use-this */
/* eslint-disable no-underscore-dangle */

export class MockCapTP {
  constructor(rawSend) {
    this._rawSend = rawSend;
  }

  dispatch(data) {
    console.log('dispatch');
    this.lastDispatched = data;
  }

  abort() {
    this.isAborted = true;
  }

  getBootstrap() {
    return { foo: 'bar' };
  }

  send(data) {
    this._rawSend(data);
  }
}
