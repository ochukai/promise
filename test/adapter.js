"use strict";
// Adapter to test V8 promises with "promises-aplus-tests" test runner
var path = require("path");
var assert = require("assert");

var Promise = require("../src");

function chooseSource(file) {
  setExports(module.exports, Promise);
  return module.exports;
};

module.exports = chooseSource;

function setExports(exports, Promise) {
  exports.deferred = function __deferred__() {
    return Promise.deferred();
  };

  exports.resolved = function __resolved__(val) {
    return Promise.resolve(val);
  };

  exports.rejected = function __rejected__(reason) {
    return Promise.reject(reason);
  };

  exports.defineGlobalPromise = function __defineGlobalPromise__(globalScope) {
    globalScope.Promise = Promise;
    globalScope.assert = assert;
  };

  exports.removeGlobalPromise = function __defineGlobalPromise__(globalScope) {
    delete globalScope.Promise;
  };
}

// call with default of undefined; backwards-compatible with old use of adapter
chooseSource();
