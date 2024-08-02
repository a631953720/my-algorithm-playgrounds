class FixedWindow {
  /**
   * @param {number} timeWindow number of the fixed time window. unit is seconds.
   * @param {number} limit number of rate limit. default is 1.
   */
  constructor(timeWindow = 1, limit = 1) {
    this.timeWindow = timeWindow;
    this.limit = limit;
    this.requestMap = new Map();
    this.baseTime = new Date();
  }

  /**
   * @param {{ id: number }} meta
   * @param {() => Promise<void>} forwardCallback
   * @param {() => void} [dropCallback]
   */
  async request(meta, forwardCallback, dropCallback = () => {}) {
    if (this.requestMap.has(meta.id)) return;

    const now = new Date();

    if (Date.now() - this.baseTime.getTime() >= this.timeWindow * 1000) {
      this.requestMap.clear();
      this.baseTime = now;
    }

    if (this.requestMap.size >= this.limit) {
      console.log('drop request');
      dropCallback()
      return;
    }

    this.requestMap.set(meta.id, now);

    try {
      await forwardCallback();
    } finally {
      this.requestMap.delete(meta.id);
    }
  }
}

const fixedWindow = new FixedWindow(1, 2);

function buildCallback() {
  return () => new Promise((resolve) => {
    console.log('add request success');

    // will be saved in FixedWindow
    setTimeout(() => {
      console.log('promise done');
      resolve();
    }, 1000);
  });
}

// success
fixedWindow.request(
  { id: 1 },
  buildCallback(),
);
// success
fixedWindow.request(
  { id: 2 },
  buildCallback(),
);
// dropped
fixedWindow.request(
  { id: 3 },
  buildCallback(),
);

// success
setTimeout(() => {
  fixedWindow.request(
    { id: 4 },
    buildCallback(),
  );
}, 1010);
