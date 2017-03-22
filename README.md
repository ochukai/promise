## Promise

通过了 promises-aplus-tests 和  promises-es6-tests 这两个测试，包括 Deferred 的写法。

## 用法

像普通的 promise 框架那样

```js
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
```

## 方法列表

* then
* catch
* done
* delay
* Promise.resolve
* Promise.reject
* Promise.all
* Promise.race
* Promise.deferred
* Promise.defer


谢谢~
