var Promise = require('../src');

// var p =
//   new Promise(function (resolve) {
//     console.log('sdsd');
//     setTimeout(function () {
//       console.log('sdsd');
//       resolve(true);
//     }, 1000);
//   })
//   .then(function (result) {
//     console.log('result:', result);
//     return 111;
//   })
//   .then()
//   .then(function (result) {
//     console.log('second:', result);
//
//     throw new TypeError();
//     return new Promise(function (resolve) {
//       setTimeout(function () {
//         resolve(222);
//       }, 1000);
//     })
//   })
//   .then(function (result) {
//     console.log('finally:', result);
//     // return 1 / 0;
//   })
//   .catch(function(rr) {
//     console.log('error:', rr);
//   });


var p =
  new Promise(function (resolve) {
    setTimeout(function () {
      console.log('first');
      resolve(true);
    }, 1000);
  })
  .delay(1000)
  .then(function(value) {
    console.log('finally:', value);
  })

  // p.then(function (result) {
  //   setTimeout(function () {
  //     console.log('result:', result);
  //   }, 1000);
  //   return 111;
  // });
  //
  // p.then(function (result) {
  //   setTimeout(function () {
  //     console.log('finnly:', result);
  //   }, 100);
  // });

//
// var p1 = new Promise(function(resolve) {
//   setTimeout(function() {
//     console.log('task 1');
//     resolve(1);
//   }, 200);
// });
//
// var p2 = new Promise(function(resolve) {
//   setTimeout(function() {
//     console.log('task 2');
//     resolve(2);
//   }, 500);
// });
//
// var p3 = new Promise(function(resolve) {
//   setTimeout(function() {
//     console.log('task 3');
//     resolve(3);
//   }, 1000);
// });
//
// Promise
//   .all([p1,p2,p3])
//   .then(function(result) {
//     console.log('finish', result);
//   });
