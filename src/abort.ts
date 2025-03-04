// I decided not to use AbortController because it is very web-centric

import EventEmitter from 'events';

export class AbortionHandler extends EventEmitter {
  public aborted: boolean = false;

  public abort() {
    if (this.aborted) {
      console.warn('abort called on already aborted AbortionHandler');
      return;
    }

    this.aborted = true;

    this.emit('abort');
  }
}
