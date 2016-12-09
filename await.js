/*
 * await.js v1.0
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

    /**
     * Holds or awaiting objects
     *
     * @type {Array}
     * @private
     */
    var _awaits = [];


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
    var Future = function() {};
    Future.prototype.then = function(fn) {
        this.exec = fn;
        /*
          It is possible the future already have been resolved,
          so we'll have to call 'then' immediately.
        */
        if (this.result) {
            fn.call(this.result, this.result);
        }
    };


    /**
     * await ( promise1, promise2)
     *
     * @returns {Future}
     */
    function await() {
        var ref = arguments[0];
        var future = new Future();
        var timeout = -1;
        if (typeof ref === "number") { // timeout
            timeout = ref;
            ref = idgen();
        } else if (ref instanceof Date) {
            timeout = ref.getTime() - new Date().getTime();
            ref = idgen();
        }
        if (timeout > -1) {
            setTimeout("await.notify('" + ref + "');", timeout);
        }
        _awaits.push({ ref: ref, future: future });
        return future;
    }

    /**
     *
     * @type {await.forget}
     */
    await.cancel = await.forget = function(ref) {
        var i = 0;
        for (;i<_awaits.length;i++) {
            if (_awaits[i].ref === ref) {
                _awaits.splice(i, 1);
                break;
            }
        }
    };

    /**
     *
     * @param ref
     * @param val
     */
    await.notify = await.resolve = function(ref, val) {
        var c = 0, i = -1;
        for (;c<_awaits.length;c++) {
            if (_awaits[c].ref === ref) {
                i = c;
                break;
            }
        }
        if (i == -1) {
            if (console && console.warn) {
                console.warn("[await] Unable to notify " + ref + ", future does not exist or is already consumed.");
            }
            return;
        }
        var interim = _awaits.splice(i, 1)[0];
        var future = interim.future;
        /**
         *  await("message").then(function(msg) { assert msg == "Hello"; } );
         *  await.notify("message", "Hello");
         */

        if (typeof val === "undefined") {
            /**
             *  var obj = {};
             *  await(obj).then(function(o) { assert o.msg == "Hello"; } );
             *  obj.msg = "Hello";
             *  await.notify(obj);
             */
            val = ref;
        }
        if (val instanceof Lock) { // remove lock proto
            var lock = val;
            var val = {};
            for (var p in lock) { // copy conf properties to unit
                if (lock.hasOwnProperty(p)) {
                    val[p] = lock[p];
                }
            }
        }
        future.result = val;
        if (future.exec) {
            future.exec.call(val, val); // using val as scope makes this. is also accessible
        }
    };
    await.lock = function() {
        return new Lock();
    };



    // ------------------------------------------------------------------------
    // EXPORT

    if (typeof module === "object" && module.exports){
        // for common js
        module.exports = await;

    } else {
        // for browsers
        if (typeof define === 'function' && define.amd) {
            define('await', [], function(){ return await; });
        } else {
            root['await'] = await;
        }
    }

})(this);



