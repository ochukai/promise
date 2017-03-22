var assert = require('assert');
var Promise = require('../src');

// var p = new Promise(function (resolve, reject) {
//   resolve(1);
// });


// function afterFirstResolution() {
//   console.log('the second time');
//   // if promise's [[PromiseState]] internal slot is not 'undefined'
//   // should throw
//   Promise.call(p, function (resolve, reject) {
//     console.log('the second time ++');
//     resolve(2);
//   });

//   // affirm that previous resolution is still settled
//   p.then(function (resolved) {
//     console.log('zheshishenme:', resolved);
//   });
// }

// // receive first resolution
// p.then(function (resolved) {
//   console.log(resolved);

//   Promise
//     .resolve()
//     .then(afterFirstResolution)
//     .then(function(value){
//       console.log('finally value', value);
//     });
// });


// var resolveP,
//   p = new Promise(function (resolve, reject) {
//     resolveP = resolve;
//   });

// Promise.call(p, function (resolve, reject) {
//   console.log('123');
//   resolve(2);
// });

// // receive first resolution
// p.then(function (resolved) {
//   console.log(resolved);
// });

// resolveP(1);
// console.log('sss');


box-shadow: 0 1px 3px rgba(0,37,55,.05);
