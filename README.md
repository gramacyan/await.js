# await.js

await.js is a lightweight javascript library that enables awaiting object state. It is dependency-independant so it can easily be integrated into existing projects without any overhead or conflict. 

Although sharing some similarities, await.js does **not** follow the **Promises/A+** specification. There is no state process and success/error handling are not provided within the scope of await.js. The original intent is that await.js is a simple utility for async boilerplate.

### Example


```
await("The end of the world").then(die);
await.notify("The end of the world");
```

The await statement accepts one of 3 types of arguments 

 * Time (ms)
 * Date
 * Object or Lock identifier
 
Which returns a Future object containing a then-function accepting a handler.

```
await( <argument> ) .then(  <then-handler> );
```
---
 
### Awaiting time

By specifying a duration in milliseconds await can be used as a timeout:

```
await(1000).then(function() {
  console.log("waited 1sec");
});
```

If you want to wait for a specific point in time, simply provide a javascript date:  

```
await(new Date(2020,0,1)).then(function() {
  console.log("waited until 2020");
});
```

---
### Awaiting identifiers / objects

await.js allows separate await statements being active at the same time. It's specified argument is what sets them apart and can be anything except primitive numbers or Date objects (see awaiting time).

Use `await.notify` or `await.resolve` to notify the specified identifier being ready to be handled. Beware if the identifier is an object it should be the same instance as provided in the await statement.

```
// Await
await("my-identifier").then(...);
await(true).then(...);
await({}).then(...);

// Notify
await.notify("my-identifier");
await.notify(true);
await.notify({}); // <-- does not work
```

##### Canceling
If you no longer want to trigger the then-handling you can either do nothing (keeping an in-memory reference forever) or preferably cancel the wait by using `await.cancel` or `await.forget`.

```
await.cancel("my-identifier");
```

##### Handling

After notifying using `await.notify` or `await.resolve` the handler-function will be executed in the **scope of the identifier**, the identifier will also be passed as argument.

```
var preparedObject = {};
await(preparedObject).then(function(object) {
  console.log(object === this); // true
});
...
await.notify(preparedObject);
```


##### Overriding the identifier

If you don't know what the result object will be, *eg. awaiting a http-response*, you can override the identifier by adding it as second argument to the `await.notify` or `await.resolve` function.

```
await("http-get").then(function() {
  console.log(this.statusCode);
});
...
await.notify("http-get", { statusCode: 200 })
```


---

### Awaiting locks

A lock is a regular object that provides build-in notify/resolve functionality. It is an elegant way to wait for something without having to come-up with an identifier yourself.

```
var lock = await.lock();
await(lock).then(function() {
  console.log("Unlocked!");
});
window.onload = function() {
  lock.unlock();
}
```

---

### Working async example

```
var Remote = {
  get: function(url) {
    var lock = await.lock();
    var future = await(lock);
    var xhttp = new XMLHttpRequest();
  	xhttp.onreadystatechange = function() {
      if (this.readyState != 4) return;
      lock.err = this.status != 200;
      lock.result = JSON.parse(this.responseText);
      lock.unlock();
    };
    xhttp.open("GET", url, true);
    xhttp.send();
    return future;
  }
};

Remote.get("data.json").then(function() {
  console.log("Response = " + this.result);
  if (this.err) {
    console.error(this.err);
  }
});
```