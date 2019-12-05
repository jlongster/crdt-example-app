(function(root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory(require('murmurhash'));
  } else {
    let { Timestamp, MutableTimestamp } = factory(root.murmur);
    root.Timestamp = Timestamp;
    root.MutableTimestamp = MutableTimestamp;
  }
})(this, function(murmurhash) {
  var config = {
    // Maximum physical clock drift allowed, in ms
    maxDrift: 60000
  };

  class Timestamp {
    constructor(millis, counter, node) {
      this._state = {
        millis: millis,
        counter: counter,
        node: node
      };
    }

    valueOf() {
      return this.toString();
    }

    toString() {
      return [
        new Date(this.millis()).toISOString(),
        (
          '0000' +
          this.counter()
            .toString(16)
            .toUpperCase()
        ).slice(-4),
        ('0000000000000000' + this.node()).slice(-16)
      ].join('-');
    }

    millis() {
      return this._state.millis;
    }

    counter() {
      return this._state.counter;
    }

    node() {
      return this._state.node;
    }

    hash() {
      return murmurhash.v3(this.toString());
    }
  }

  class MutableTimestamp extends Timestamp {
    setMillis(n) {
      this._state.millis = n;
    }

    setCounter(n) {
      this._state.counter = n;
    }

    setNode(n) {
      this._state.node = n;
    }
  }

  MutableTimestamp.from = timestamp => {
    return new MutableTimestamp(
      timestamp.millis(),
      timestamp.counter(),
      timestamp.node()
    );
  };

  // Timestamp generator initialization
  // * sets the node ID to an arbitrary value
  // * useful for mocking/unit testing
  Timestamp.init = function(options = {}) {
    if (options.maxDrift) {
      config.maxDrift = options.maxDrift;
    }
  };

  /**
   * Timestamp send. Generates a unique, monotonic timestamp suitable
   * for transmission to another system in string format
   */
  Timestamp.send = function(clock) {
    // Retrieve the local wall time
    var phys = Date.now();

    // Unpack the clock.timestamp logical time and counter
    var lOld = clock.timestamp.millis();
    var cOld = clock.timestamp.counter();

    // Calculate the next logical time and counter
    // * ensure that the logical time never goes backward
    // * increment the counter if phys time does not advance
    var lNew = Math.max(lOld, phys);
    var cNew = lOld === lNew ? cOld + 1 : 0;

    // Check the result for drift and counter overflow
    if (lNew - phys > config.maxDrift) {
      throw new Timestamp.ClockDriftError(lNew, phys, config.maxDrift);
    }
    if (cNew > 65535) {
      throw new Timestamp.OverflowError();
    }

    // Repack the logical time/counter
    clock.timestamp.setMillis(lNew);
    clock.timestamp.setCounter(cNew);

    return new Timestamp(
      clock.timestamp.millis(),
      clock.timestamp.counter(),
      clock.timestamp.node()
    );
  };

  // Timestamp receive. Parses and merges a timestamp from a remote
  // system with the local timeglobal uniqueness and monotonicity are
  // preserved
  Timestamp.recv = function(clock, msg) {
    var phys = Date.now();

    // Unpack the message wall time/counter
    var lMsg = msg.millis();
    var cMsg = msg.counter();

    // Assert the node id and remote clock drift
    if (msg.node() === clock.timestamp.node()) {
      throw new Timestamp.DuplicateNodeError(clock.timestamp.node());
    }
    if (lMsg - phys > config.maxDrift) {
      throw new Timestamp.ClockDriftError();
    }

    // Unpack the clock.timestamp logical time and counter
    var lOld = clock.timestamp.millis();
    var cOld = clock.timestamp.counter();

    // Calculate the next logical time and counter.
    // Ensure that the logical time never goes backward;
    // * if all logical clocks are equal, increment the max counter,
    // * if max = old > message, increment local counter,
    // * if max = messsage > old, increment message counter,
    // * otherwise, clocks are monotonic, reset counter
    var lNew = Math.max(Math.max(lOld, phys), lMsg);
    var cNew =
      lNew === lOld && lNew === lMsg
        ? Math.max(cOld, cMsg) + 1
        : lNew === lOld
        ? cOld + 1
        : lNew === lMsg
        ? cMsg + 1
        : 0;

    // Check the result for drift and counter overflow
    if (lNew - phys > config.maxDrift) {
      throw new Timestamp.ClockDriftError();
    }
    if (cNew > 65535) {
      throw new Timestamp.OverflowError();
    }

    // Repack the logical time/counter
    clock.timestamp.setMillis(lNew);
    clock.timestamp.setCounter(cNew);

    return new Timestamp(
      clock.timestamp.millis(),
      clock.timestamp.counter(),
      clock.timestamp.node()
    );
  };

  /**
   * Converts a fixed-length string timestamp to the structured value
   */
  Timestamp.parse = function(timestamp) {
    if (typeof timestamp === 'string') {
      var parts = timestamp.split('-');
      if (parts && parts.length === 5) {
        var millis = Date.parse(parts.slice(0, 3).join('-')).valueOf();
        var counter = parseInt(parts[3], 16);
        var node = parts[4];
        if (!isNaN(millis) && !isNaN(counter))
          return new Timestamp(millis, counter, node);
      }
    }
    return null;
  };

  Timestamp.since = isoString => {
    return isoString + '-0000-0000000000000000';
  };

  Timestamp.DuplicateNodeError = class extends Error {
    constructor(node) {
      super();
      this.type = 'DuplicateNodeError';
      this.message = 'duplicate node identifier ' + node;
    }
  };

  Timestamp.ClockDriftError = class extends Error {
    constructor(...args) {
      super();
      this.type = 'ClockDriftError';
      this.message = ['maximum clock drift exceeded'].concat(args).join(' ');
    }
  };

  Timestamp.OverflowError = class extends Error {
    constructor() {
      super();
      this.type = 'OverflowError';
      this.message = 'timestamp counter overflow';
    }
  };

  return { Timestamp, MutableTimestamp };
});
