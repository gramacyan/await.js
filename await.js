/*
 * await.js v1.1
 *

 Copyright (c) 2016 by Benny Bangels
 https://github.com/gramacyan/await.js

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.

 */

(function(root) {

    "use strict";

    var NOT_MET = new Object();

    /**
     * Holds or awaiting objects
     *
     * @type {Array}
     * @private
     */

    var _promises = {};
    root.promises = _promises;


    /**
     * A string generator used for generating ids for time based awaits
     *
     * @returns {string}
     */
    function idgen() {
        function rnd() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return rnd() + rnd();
    }

    /**
     *
     * @constructor
     */
    var Lock = function() {};
    Lock.prototype = {
        unlock: function() {
            await.notify.call(null, this);
        }
    };

    /**
     *
     * @constructor
     */
    var Future = function(id) {
        this.id = id;
        this.promises = [];
        this.met = [];
    };
    Future.prototype.then = function(fn) {
        if (typeof fn !== "function") {
            return;
        }
        this.exec = fn;

        /*
          It is possible the future already have been resolved,
          so we'll have to call 'then' immediately.
        */
        if (this.results) {
            fn.apply(this.results[0], this.results);
        }
    };

    /**
     *
     * @constructor
     */
    var Promise = function(id) {
        this.id = id;
        this.value = NOT_MET;
        this.futures = [];
    };
    Promise.prototype.isMet = function() {
        return this.value !== NOT_MET;
    };
    Promise.prototype.notifyMet = function(value) {
        if (this.value === NOT_MET) {
            this.value = value;
        }
        var self = this;
        self.futures.forEach(function(future) {
            var idx = future.met.indexOf(self.id);
            if (idx !== -1) {
                // alr met before
                return;
            }
            future.met.push(self.id);
            if (future.met.length === future.promises.length) {
                var args = [];
                future.promises.forEach(function(id) {
                    var promise = _promises[id];
                    if (!promise) throw new Error("Looks like someone broke a promise");
                    var val = promise.value;
                    if (typeof val === "undefined") {
                        /**
                         *  var obj = {};
                         *  await(obj).then(function(o) { assert o.msg == "Hello"; } );
                         *  obj.msg = "Hello";
                         *  await.notify(obj);
                         */
                        val = id;
                    }
                    else if (val instanceof Lock) { // remove lock proto
                        var lock = val;
                        var val = {};
                        for (var p in lock) { // copy conf properties to unit
                            if (lock.hasOwnProperty(p)) {
                                val[p] = lock[p];
                            }
                        }
                    }
                    args.push(val);
                    // remove future from promise
                    promise.futures.splice(promise.futures.indexOf(future), 1)
                    // remove promise is no futures are left
                    if (promise.futures.length === 0) {
                        await.forget(promise.id);
                    }
                });
                future.results = args;
                if (future.exec) {
                    future.exec.apply(args[0], args);
                }
                //remove.push(future);
            }
        });
    };


    /**
     * await ( promise1, promise2)
     *
     * @returns {Future}
     */
    function await() {
        var future = new Future(idgen());
        var alr_met = [];
        for (var i = 0; i < arguments.length; i++) {
            var id = arguments[i];
            var timeout = -1;
            if (typeof id === "number") { // timeout
                timeout = id;
                id = idgen();
            } else if (id instanceof Date) {
                timeout = id.getTime() - new Date().getTime();
                id = idgen();
            }
            future.promises.push(id);
            // promise
            var promise = _promises[id];
            if (!promise) {
                promise = new Promise(id);
                _promises[id] = promise;
            } else {
                if (promise.isMet()) {
                    alr_met.push(promise);
                }
            }
            promise.futures.push(future);
            if (timeout > -1) {
                setTimeout(function() { await.notify(id); }, timeout);
            }
        }
        // notify alr met
        alr_met.forEach(function(promise) {
            if (promise.isMet()) {
                promise.notifyMet(promise.value);
            }

        });
        return future;
    }

    /**
     *
     * @type {await.forget}
     */
    await.forget = await.cancel = function(what) {
        if (what === "*") {
            _promises = {};
            return;
        }
        _promises[what] = undefined;
        delete _promises[what];
    };

    /**
     *
     * @param ref
     * @param val
     */
    await.notify = await.resolve = function(id, val) {
        var promise = _promises[id];
        if (!promise /*not existing*/) {
            return;
        }
        promise.notifyMet(val);
    };

    /**
     *
     */
    await.lock = function() {
        return new Lock();
    };

   /**
    *
    * @param id
    * @returns {Future}
    */
    await.capture = function(id) {

    }



    // ------------------------------------------------------------------------
    // EXPORT

    if (typeof module === "object" && module.exports){
        // for common js
        module.exports = await;

    } else {
        // for browsers
        if (typeof define === 'function' && define.amd) {
            define('await', [], function(){ return await; });
        }
        // always try to expose to root
        if (!root['await']) {
            root['await'] = await;
        }
    }

})(this);



