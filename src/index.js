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
  // resolve 的值
  this.value = 0;
  // 保存接下来要执行的 promise 的数组，数组里面的元素是 Executor，包装了 Promise 及其
  // onRejected, onResolved 方法
  // then 方法可能会添加 Executor 到这个数组，也只有 then 方法会添加元素到这个数组
  this.queue = [];

  if (resolver !== util.noop) {
    this.__callThen(resolver);
  }
}

/**
 *  then 方法肯定会返回一个新的 Promise 对象。
 *  then 方法在执行的时候会有两种情况：
 *    1. 当前 promise 的状态如果为 pending（表示当前 promise 在 then 之前有些操作很
 *       耗费时间，还没有完成），那么当前 then 是不能直接开始执行的，把当前 then 的参数
 *       以及当前 promise 保存在一个 Executor 中，加入到 当前 promise 的 queue 中，
 *       同理，当前 promise 可能存在与其他 promise 的 queue 中， 前一个 promise 结束
 *       之后，会通知到当前 promise。
 *
 *    2. 当前 promise 的状态不是 pending，可以直接执行，调用 __runInOrder 方法执行
 *       onRejected/onResolved 方法（也就是 then 要执行的内容），onRejected/onResolved
 *       方法会改变当前 promise 的状态，并且通知 queue 里面的其他 Executor。
 *       如果按照 promise.then().then().then() 这种写法来写， queue 里面只会有一个 Executor。
 *       如果
 *           promise.then();
 *           promise.then();
 *           promise.then();
 *       queue 里面就会有三个。
 *       上面的写法，每次 then() 都会返回新的 promise，下面的写法，都在同一个 promise 上面操作。（前提是这个 promise 的初始化过程比较慢 ~）
 *
 *    promise.then(
 *      function onResolved() { ... },
 *      function onRejected() { ... }
 *    )
 *
 *    promise.then(function () {
 *      // ...
 *    })
 *
 * @param {Function} onResolved
 * @param {Function} onRejected
 */
Promise.prototype.then = function (onResolved, onRejected) {
  if ((!util.isFunction(onResolved) && this.state === FULFILLED)
   || (!util.isFunction(onRejected) && this.state === REJECTED)) {
    return this;
  }

  var promise2 = new Promise(util.noop);
  if (this.state !== PENDING) {
    var dummy = this.state === FULFILLED
              ? onResolved
              : onRejected;
    promise2.__runInOrder(dummy, this.value);
  } else {
    this.queue.push(new Executor(promise2, onResolved, onRejected));
  }

  return promise2;
};

/**
 * 这个方法并不会返回 promise 对象，一般就是写在最后的 then。
 */
// Promise.prototype.done = function(onResolved) {
//   this.then(onResolved, null);
//   // return this.then(onResolved, null);
// };

Promise.prototype.done = function (onFulfilled, onRejected) {
  this
    .then(onFulfilled, onRejected)
    .catch(function (error) {
      setTimeout(function () {
        throw error;
      }, 0);
    });
};

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};

Promise.prototype.delay = function (duration) {
  return this.then(
    function onResolved(value) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          resolve(value);
        }, duration);
      });
    },
    function onRejected(err) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          reject(err);
        }, duration);
      });
    }
  );
};

// Promise.prototype.finally = function(fn) {};
// Promise.prototype.spread = function(fn, onRejected) {};
// Promise.prototype.inject = function(fn, onRejected) {};

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
 * 执行真正的方法，在下一个 tick，就算是 很简单的 then方法，也不会立即执行，
 * 而是等到所有 then 方法链都添加完之后，
 */
Promise.prototype.__runInOrder = function (fn, value) {
  var self = this;
  setTimeout(function () {
    var ret;
    try {
      // onFulfilled and onRejected must be called as functions
      // (i.e. with no this value).
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

/**
 *
 */
function Executor(promise, onResolved, onRejected) {
  this.promise = promise;
  this.onRejected = onRejected;
  this.onResolved = onResolved;
}

Executor.prototype.doResolve = function (value) {
  if (util.isFunction(this.onResolved)) {
    this.promise.__runInOrder(this.onResolved, value);
  } else {
    this.promise.doResolve(value);
  }
};

Executor.prototype.doReject = function (err) {
  if (util.isFunction(this.onRejected)) {
    this.promise.__runInOrder(this.onRejected, err);
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
        function onResolved(value) {
          values[index] = value;
          if (++countDone === len) {
            promise.doResolve(values);
          }
        },
        function onRejected(err) {
          promise.doReject(err);
        }
      );
  });

  return promise;
};

Promise.race = function (values) {
  return new Promise(function (resolve, reject) {
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    });
  });
};

// Promise.denodeify = function () { };
// Promise.spread = function () { };

/**
 * Deferred methods
 */

// function getURL(URL) {
//   var deferred = new Deferred();
//
//   var req = new XMLHttpRequest();
//   req.open('GET', URL, true);
//   req.onload = function () {
//     if (req.status === 200) {
//       deferred.resolve(req.responseText);
//     } else {
//       deferred.reject(new Error(req.statusText));
//     }
//   };
//
//   req.onerror = function () {
//     deferred.reject(new Error(req.statusText));
//   };
//
//   req.send();
//   return deferred.promise;
// }

/**
 * Deferred 的话不需要将代码用Promise括起来
 *   由于没有被嵌套在函数中，可以减少一层缩进
 *   反过来没有Promise里的错误处理逻辑
 */
function Deferred() {
  this.promise = new Promise(function (resolve, reject) {
    this._resolve = resolve;
    this._reject = reject;
  }.bind(this));
}

Deferred.prototype.resolve = function (value) {
  this._resolve.call(this.promise, value);
};

Deferred.prototype.reject = function (reason) {
  this._reject.call(this.promise, reason);
};

Promise.deferred = Promise.defer = function () {
  return new Deferred();
}

module.exports = Promise;
