'use strict';

var PENDING = 0;
var FULFILLED = 1;
var REJECTED = 2;

var util = {
  noop: function () {},

  isFunction: function (func) {
    return typeof func === 'function';
  },

  isObject: function (obj) {
    return typeof obj === 'object';
  },

  isArray: function (arr) {
    return Object.prototype.toString.call(arr) === '[object Array]';
  },

  getThen: function (target) {
    var then = target && target.then;
    if (target
        && (util.isObject(target) || util.isFunction(target))
        && util.isFunction(then)) {
      return function () {
        then.apply(target, arguments);
      };
    }
  }
};

/**
 * 必须是函数来初始化 Promise 对象。
 *
 *   new Promise(function(resolve, reject) { ... })
 *   new Promise(util.noop)
 *
 * @param {Function} resolver 初始化的内容
 */
function Promise(resolver) {
  if (!util.isFunction(resolver)) {
    throw new TypeError('resolver must be a function');
  }

  // 默认是 pending 状态
  this.state = PENDING;
  this.value = 0;
  this.queue = [];

  if (resolver !== util.noop) {
    this.__callThen(resolver);
  }
}

/**
 *  then 方法肯定会返回一个新的 Promise 对象。
 *  then 方法在执行的时候会有两种情况：
 *    1. 当前 promise 的状态如果为 pending（表示当前 promise 在 then 之前有些操作很耗费时间，还没有完成），那么当前 then
 *       是不能直接开始执行的，把当前 then 的参数以及当前 promise 保存在一个 Executor 中，加入到 当前 promise 的 queue 中，
 *       同理，当前 promise 可能存在与其他 promise 的 queue 中， 前一个 promise 结束之后，会通知到当前 promise。
 *
 *    2. 当前 promise 的状态不是 pending，可以直接执行，调用 __runInOrder 方法执行 onReject/onResolve 方法（也就是 then 要执行的内容），
 *       onReject/onResolve 方法会改变当前 promise 的状态，并且通知 queue 里面的其他 Executor。
 *       如果按照 promise.then().then().then() 这种写法来写， queue 里面只会有一个 Executor。
 *       如果
 *           promise.then();
 *           promise.then();
 *           promise.then();
 *       queue 里面就会有三个。
 *       上面的写法，每次 then() 都会返回新的 promise，下面的写法，都在同一个 promise 上面操作。（前提是这个 promise 的初始化过程比较慢 ~）
 *
 *    promise.then(
 *      function onResolve() { ... },
 *      function onReject() { ... }
 *    )
 *
 *    promise.then(function () {
 *      // ...
 *    })
 *
 * @param {Function} onResolve
 * @param {Function} onReject
 */
Promise.prototype.then = function (onResolve, onReject) {
  if ((!util.isFunction(onResolve) && this.state === FULFILLED)
    || (!util.isFunction(onReject) && this.state === REJECTED)) {
    return this;
  }

  var promise2 = new Promise(util.noop);
  if (this.state !== PENDING) {
    var dummy = this.state === FULFILLED ? onResolve : onReject;
    promise2.__runInOrder(dummy, this.value);
  } else {
    this.queue.push(new Executor(promise2, onResolve, onReject));
  }

  return promise2;
};

Promise.prototype.catch = function (onReject) {
  return this.then(null, onReject);
};

/**
 * 调用 then 方法，同时会 try catch 一下，
 *    如果出错，就 doReject（err）
 *    如果没错，就 doResolve（value）
 */
Promise.prototype.__callThen = function (then) {
  var called = false;
  var self = this;

  function resolve(value) {
    if (!called) {
      called = true;
      self.doResolve(value);
    }
  }

  function reject(e) {
    if (!called) {
      called = true;
      self.doReject(e);
    }
  }

  try {
    then(resolve, reject);
  } catch (e) {
    if (!called) {
      called = true;
      this.doReject(e);
    }
  }
};

/**
 * 同步变成异步
 *
 * 执行真正的方法，在下一个 tick，就算是 很简单的 then方法，也不会立即执行，而是等到所有 then 方法链都添加完之后，
 */
Promise.prototype.__runInOrder = function (fn, value) {
  var self = this;
  setTimeout(function () {
    var ret;
    try {
      ret = fn(value);
    } catch (e) {
      return self.doReject(e);
    }

    if (ret === self) {
      self.doReject(new TypeError('Cannot resolve promise with itself.'));
    } else {
      self.doResolve(ret);
    }
  });
};

/**
 * 当上一个 then 执行完之后，会调用 doResolve 方法，
 * 也有两种情况：
 *     上一个 then 返回的值是一个 promise（存在 then 方法），继续调用 then 方法
 *     不是 promise，改变当前 promise 的状态为 fulfilled，通知 queue 里面的 Executor
 */
Promise.prototype.doResolve = function (value) {
  try {
    var then = util.getThen(value);
    if (then) {
      this.__callThen(then);
    } else {
      this.state = FULFILLED;
      this.value = value;
      this.queue.forEach(function (item) {
        item.doResolve(value);
      });
    }

    return this;
  } catch (e) {
    return this.doReject(e);
  }
};

Promise.prototype.doReject = function (err) {
  this.state = REJECTED;
  this.value = err;
  this.queue.forEach(function (item) {
    item.doReject(err);
  });

  return this;
};

function Executor(promise, onResolve, onReject) {
  this.promise = promise;
  this.onReject = onReject;
  this.onResolve = onResolve;
}

Executor.prototype.doResolve = function (value) {
  if (util.isFunction(this.onResolve)) {
    this.promise.__runInOrder(this.onResolve, value);
  } else {
    this.promise.doResolve(value);
  }
};

Executor.prototype.doReject = function (err) {
  if (util.isFunction(this.onReject)) {
    this.promise.__runInOrder(this.onReject, err);
  } else {
    this.promise.doReject(err);
  }
};

//  static methods

Promise.resolve = function(value) {
  return value instanceof Promise
            ? value
            : new Promise(util.noop).doResolve(value);
};

Promise.reject = function(err) {
  return new Promise(util.noop).doReject(err);
};

Promise.all = function(arr) {
  var promise = new Promise(util.noop);

  if (!util.isArray(arr)) {
    return promise.doReject(new TypeError('argument must be an array.'));
  }

  var countDone = 0;
  var len = arr.length;
  var values = new Array(len);

  arr.forEach(function(item, index) {
    Promise
      .resolve(item)
      .then(
        function onResolve(value) {
          values[index] = value;
          if (++countDone === len) {
            promise.doResolve(values);
          }
        },
        function onReject(err) {
          promise.doReject(err);
        }
      );
  });

  return promise;
};

// Promise.race = function() {};

// Promise.spread = function() {};


/**
 * for test
 */
Promise.deferred = Promise.defer = function () {
  var dummy = {};
  dummy.promise = new Promise(function (resolve, reject) {
    dummy.resolve = resolve
    dummy.reject = reject
  });

  return dummy;
}

module.exports = Promise;
