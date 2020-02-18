// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"node_modules/regenerator-runtime/runtime.js":[function(require,module,exports) {
/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var runtime = (function (exports) {
  "use strict";

  var Op = Object.prototype;
  var hasOwn = Op.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var $Symbol = typeof Symbol === "function" ? Symbol : {};
  var iteratorSymbol = $Symbol.iterator || "@@iterator";
  var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
  var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

  function wrap(innerFn, outerFn, self, tryLocsList) {
    // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
    var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
    var generator = Object.create(protoGenerator.prototype);
    var context = new Context(tryLocsList || []);

    // The ._invoke method unifies the implementations of the .next,
    // .throw, and .return methods.
    generator._invoke = makeInvokeMethod(innerFn, self, context);

    return generator;
  }
  exports.wrap = wrap;

  // Try/catch helper to minimize deoptimizations. Returns a completion
  // record like context.tryEntries[i].completion. This interface could
  // have been (and was previously) designed to take a closure to be
  // invoked without arguments, but in all the cases we care about we
  // already have an existing method we want to call, so there's no need
  // to create a new function object. We can even get away with assuming
  // the method takes exactly one argument, since that happens to be true
  // in every case, so we don't have to touch the arguments object. The
  // only additional allocation required is the completion record, which
  // has a stable shape and so hopefully should be cheap to allocate.
  function tryCatch(fn, obj, arg) {
    try {
      return { type: "normal", arg: fn.call(obj, arg) };
    } catch (err) {
      return { type: "throw", arg: err };
    }
  }

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  // Dummy constructor functions that we use as the .constructor and
  // .constructor.prototype properties for functions that return Generator
  // objects. For full spec compliance, you may wish to configure your
  // minifier not to mangle the names of these two functions.
  function Generator() {}
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}

  // This is a polyfill for %IteratorPrototype% for environments that
  // don't natively support it.
  var IteratorPrototype = {};
  IteratorPrototype[iteratorSymbol] = function () {
    return this;
  };

  var getProto = Object.getPrototypeOf;
  var NativeIteratorPrototype = getProto && getProto(getProto(values([])));
  if (NativeIteratorPrototype &&
      NativeIteratorPrototype !== Op &&
      hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
    // This environment has a native %IteratorPrototype%; use it instead
    // of the polyfill.
    IteratorPrototype = NativeIteratorPrototype;
  }

  var Gp = GeneratorFunctionPrototype.prototype =
    Generator.prototype = Object.create(IteratorPrototype);
  GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
  GeneratorFunctionPrototype.constructor = GeneratorFunction;
  GeneratorFunctionPrototype[toStringTagSymbol] =
    GeneratorFunction.displayName = "GeneratorFunction";

  // Helper for defining the .next, .throw, and .return methods of the
  // Iterator interface in terms of a single ._invoke method.
  function defineIteratorMethods(prototype) {
    ["next", "throw", "return"].forEach(function(method) {
      prototype[method] = function(arg) {
        return this._invoke(method, arg);
      };
    });
  }

  exports.isGeneratorFunction = function(genFun) {
    var ctor = typeof genFun === "function" && genFun.constructor;
    return ctor
      ? ctor === GeneratorFunction ||
        // For the native GeneratorFunction constructor, the best we can
        // do is to check its .name property.
        (ctor.displayName || ctor.name) === "GeneratorFunction"
      : false;
  };

  exports.mark = function(genFun) {
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
    } else {
      genFun.__proto__ = GeneratorFunctionPrototype;
      if (!(toStringTagSymbol in genFun)) {
        genFun[toStringTagSymbol] = "GeneratorFunction";
      }
    }
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  // Within the body of any async function, `await x` is transformed to
  // `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
  // `hasOwn.call(value, "__await")` to determine if the yielded value is
  // meant to be awaited.
  exports.awrap = function(arg) {
    return { __await: arg };
  };

  function AsyncIterator(generator) {
    function invoke(method, arg, resolve, reject) {
      var record = tryCatch(generator[method], generator, arg);
      if (record.type === "throw") {
        reject(record.arg);
      } else {
        var result = record.arg;
        var value = result.value;
        if (value &&
            typeof value === "object" &&
            hasOwn.call(value, "__await")) {
          return Promise.resolve(value.__await).then(function(value) {
            invoke("next", value, resolve, reject);
          }, function(err) {
            invoke("throw", err, resolve, reject);
          });
        }

        return Promise.resolve(value).then(function(unwrapped) {
          // When a yielded Promise is resolved, its final value becomes
          // the .value of the Promise<{value,done}> result for the
          // current iteration.
          result.value = unwrapped;
          resolve(result);
        }, function(error) {
          // If a rejected Promise was yielded, throw the rejection back
          // into the async generator function so it can be handled there.
          return invoke("throw", error, resolve, reject);
        });
      }
    }

    var previousPromise;

    function enqueue(method, arg) {
      function callInvokeWithMethodAndArg() {
        return new Promise(function(resolve, reject) {
          invoke(method, arg, resolve, reject);
        });
      }

      return previousPromise =
        // If enqueue has been called before, then we want to wait until
        // all previous Promises have been resolved before calling invoke,
        // so that results are always delivered in the correct order. If
        // enqueue has not been called before, then it is important to
        // call invoke immediately, without waiting on a callback to fire,
        // so that the async generator function has the opportunity to do
        // any necessary setup in a predictable way. This predictability
        // is why the Promise constructor synchronously invokes its
        // executor callback, and why async functions synchronously
        // execute code before the first await. Since we implement simple
        // async functions in terms of async generators, it is especially
        // important to get this right, even though it requires care.
        previousPromise ? previousPromise.then(
          callInvokeWithMethodAndArg,
          // Avoid propagating failures to Promises returned by later
          // invocations of the iterator.
          callInvokeWithMethodAndArg
        ) : callInvokeWithMethodAndArg();
    }

    // Define the unified helper method that is used to implement .next,
    // .throw, and .return (see defineIteratorMethods).
    this._invoke = enqueue;
  }

  defineIteratorMethods(AsyncIterator.prototype);
  AsyncIterator.prototype[asyncIteratorSymbol] = function () {
    return this;
  };
  exports.AsyncIterator = AsyncIterator;

  // Note that simple async functions are implemented on top of
  // AsyncIterator objects; they just return a Promise for the value of
  // the final result produced by the iterator.
  exports.async = function(innerFn, outerFn, self, tryLocsList) {
    var iter = new AsyncIterator(
      wrap(innerFn, outerFn, self, tryLocsList)
    );

    return exports.isGeneratorFunction(outerFn)
      ? iter // If outerFn is a generator, return the full iterator.
      : iter.next().then(function(result) {
          return result.done ? result.value : iter.next();
        });
  };

  function makeInvokeMethod(innerFn, self, context) {
    var state = GenStateSuspendedStart;

    return function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        if (method === "throw") {
          throw arg;
        }

        // Be forgiving, per 25.3.3.3.3 of the spec:
        // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
        return doneResult();
      }

      context.method = method;
      context.arg = arg;

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          var delegateResult = maybeInvokeDelegate(delegate, context);
          if (delegateResult) {
            if (delegateResult === ContinueSentinel) continue;
            return delegateResult;
          }
        }

        if (context.method === "next") {
          // Setting context._sent for legacy support of Babel's
          // function.sent implementation.
          context.sent = context._sent = context.arg;

        } else if (context.method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw context.arg;
          }

          context.dispatchException(context.arg);

        } else if (context.method === "return") {
          context.abrupt("return", context.arg);
        }

        state = GenStateExecuting;

        var record = tryCatch(innerFn, self, context);
        if (record.type === "normal") {
          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          if (record.arg === ContinueSentinel) {
            continue;
          }

          return {
            value: record.arg,
            done: context.done
          };

        } else if (record.type === "throw") {
          state = GenStateCompleted;
          // Dispatch the exception by looping back around to the
          // context.dispatchException(context.arg) call above.
          context.method = "throw";
          context.arg = record.arg;
        }
      }
    };
  }

  // Call delegate.iterator[context.method](context.arg) and handle the
  // result, either by returning a { value, done } result from the
  // delegate iterator, or by modifying context.method and context.arg,
  // setting context.delegate to null, and returning the ContinueSentinel.
  function maybeInvokeDelegate(delegate, context) {
    var method = delegate.iterator[context.method];
    if (method === undefined) {
      // A .throw or .return when the delegate iterator has no .throw
      // method always terminates the yield* loop.
      context.delegate = null;

      if (context.method === "throw") {
        // Note: ["return"] must be used for ES3 parsing compatibility.
        if (delegate.iterator["return"]) {
          // If the delegate iterator has a return method, give it a
          // chance to clean up.
          context.method = "return";
          context.arg = undefined;
          maybeInvokeDelegate(delegate, context);

          if (context.method === "throw") {
            // If maybeInvokeDelegate(context) changed context.method from
            // "return" to "throw", let that override the TypeError below.
            return ContinueSentinel;
          }
        }

        context.method = "throw";
        context.arg = new TypeError(
          "The iterator does not provide a 'throw' method");
      }

      return ContinueSentinel;
    }

    var record = tryCatch(method, delegate.iterator, context.arg);

    if (record.type === "throw") {
      context.method = "throw";
      context.arg = record.arg;
      context.delegate = null;
      return ContinueSentinel;
    }

    var info = record.arg;

    if (! info) {
      context.method = "throw";
      context.arg = new TypeError("iterator result is not an object");
      context.delegate = null;
      return ContinueSentinel;
    }

    if (info.done) {
      // Assign the result of the finished delegate to the temporary
      // variable specified by delegate.resultName (see delegateYield).
      context[delegate.resultName] = info.value;

      // Resume execution at the desired location (see delegateYield).
      context.next = delegate.nextLoc;

      // If context.method was "throw" but the delegate handled the
      // exception, let the outer generator proceed normally. If
      // context.method was "next", forget context.arg since it has been
      // "consumed" by the delegate iterator. If context.method was
      // "return", allow the original .return call to continue in the
      // outer generator.
      if (context.method !== "return") {
        context.method = "next";
        context.arg = undefined;
      }

    } else {
      // Re-yield the result returned by the delegate method.
      return info;
    }

    // The delegate iterator is finished, so forget it and continue with
    // the outer generator.
    context.delegate = null;
    return ContinueSentinel;
  }

  // Define Generator.prototype.{next,throw,return} in terms of the
  // unified ._invoke helper method.
  defineIteratorMethods(Gp);

  Gp[toStringTagSymbol] = "Generator";

  // A Generator should always return itself as the iterator object when the
  // @@iterator function is called on it. Some browsers' implementations of the
  // iterator prototype chain incorrectly implement this, causing the Generator
  // object to not be returned from this call. This ensures that doesn't happen.
  // See https://github.com/facebook/regenerator/issues/274 for more details.
  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(locs) {
    var entry = { tryLoc: locs[0] };

    if (1 in locs) {
      entry.catchLoc = locs[1];
    }

    if (2 in locs) {
      entry.finallyLoc = locs[2];
      entry.afterLoc = locs[3];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry) {
    var record = entry.completion || {};
    record.type = "normal";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryLocsList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryLocsList.forEach(pushTryEntry, this);
    this.reset(true);
  }

  exports.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    if (iterable) {
      var iteratorMethod = iterable[iteratorSymbol];
      if (iteratorMethod) {
        return iteratorMethod.call(iterable);
      }

      if (typeof iterable.next === "function") {
        return iterable;
      }

      if (!isNaN(iterable.length)) {
        var i = -1, next = function next() {
          while (++i < iterable.length) {
            if (hasOwn.call(iterable, i)) {
              next.value = iterable[i];
              next.done = false;
              return next;
            }
          }

          next.value = undefined;
          next.done = true;

          return next;
        };

        return next.next = next;
      }
    }

    // Return an iterator with no values.
    return { next: doneResult };
  }
  exports.values = values;

  function doneResult() {
    return { value: undefined, done: true };
  }

  Context.prototype = {
    constructor: Context,

    reset: function(skipTempReset) {
      this.prev = 0;
      this.next = 0;
      // Resetting context._sent for legacy support of Babel's
      // function.sent implementation.
      this.sent = this._sent = undefined;
      this.done = false;
      this.delegate = null;

      this.method = "next";
      this.arg = undefined;

      this.tryEntries.forEach(resetTryEntry);

      if (!skipTempReset) {
        for (var name in this) {
          // Not sure about the optimal order of these conditions:
          if (name.charAt(0) === "t" &&
              hasOwn.call(this, name) &&
              !isNaN(+name.slice(1))) {
            this[name] = undefined;
          }
        }
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;

        if (caught) {
          // If the dispatched exception was caught by a catch block,
          // then let that catch block handle the exception normally.
          context.method = "next";
          context.arg = undefined;
        }

        return !! caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    abrupt: function(type, arg) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") &&
            this.prev < entry.finallyLoc) {
          var finallyEntry = entry;
          break;
        }
      }

      if (finallyEntry &&
          (type === "break" ||
           type === "continue") &&
          finallyEntry.tryLoc <= arg &&
          arg <= finallyEntry.finallyLoc) {
        // Ignore the finally entry if control is not jumping to a
        // location outside the try/catch block.
        finallyEntry = null;
      }

      var record = finallyEntry ? finallyEntry.completion : {};
      record.type = type;
      record.arg = arg;

      if (finallyEntry) {
        this.method = "next";
        this.next = finallyEntry.finallyLoc;
        return ContinueSentinel;
      }

      return this.complete(record);
    },

    complete: function(record, afterLoc) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = this.arg = record.arg;
        this.method = "return";
        this.next = "end";
      } else if (record.type === "normal" && afterLoc) {
        this.next = afterLoc;
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.finallyLoc === finallyLoc) {
          this.complete(entry.completion, entry.afterLoc);
          resetTryEntry(entry);
          return ContinueSentinel;
        }
      }
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      if (this.method === "next") {
        // Deliberately forget the last sent value so that we don't
        // accidentally pass it on to the delegate.
        this.arg = undefined;
      }

      return ContinueSentinel;
    }
  };

  // Regardless of whether this script is executing as a CommonJS module
  // or not, return the runtime object so that we can declare the variable
  // regeneratorRuntime in the outer scope, which allows this module to be
  // injected easily by `bin/regenerator --include-runtime script.js`.
  return exports;

}(
  // If this script is executing as a CommonJS module, use module.exports
  // as the regeneratorRuntime namespace. Otherwise create a new empty
  // object. Either way, the resulting object will be used to initialize
  // the regeneratorRuntime variable at the top of this file.
  typeof module === "object" ? module.exports : {}
));

try {
  regeneratorRuntime = runtime;
} catch (accidentalStrictMode) {
  // This module should not be running in strict mode, so the above
  // assignment should always work unless something is misconfigured. Just
  // in case runtime.js accidentally runs in strict mode, we can escape
  // strict mode using a global Function call. This could conceivably fail
  // if a Content Security Policy forbids using Function, but in that case
  // the proper solution is to fix the accidental strict mode problem. If
  // you've misconfigured your bundler to force strict mode and applied a
  // CSP to forbid Function, and you're not willing to fix either of those
  // problems, please detail your unique predicament in a GitHub issue.
  Function("r", "regeneratorRuntime = r")(runtime);
}

},{}],"src/store.ts":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var Store =
/*#__PURE__*/
function () {
  function Store() {
    var dbName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'keyval';
    var storeName = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'keyval';

    _classCallCheck(this, Store);

    this.storeName = storeName;
    this.db = new Promise(function (resolve, reject) {
      var openreq = indexedDB.open(dbName, 1);

      openreq.onerror = function () {
        return reject(openreq.error);
      };

      openreq.onsuccess = function () {
        return resolve(openreq.result);
      };

      openreq.onupgradeneeded = function () {
        openreq.result.createObjectStore(storeName);
      };
    });
  }

  _createClass(Store, [{
    key: "get",
    value: function get(key) {
      var req;
      return this.withIDBStore('readonly', function (store) {
        req = store.get(key);
      }).then(function () {
        return req.result;
      });
    }
  }, {
    key: "set",
    value: function set(key, value) {
      return this.withIDBStore('readwrite', function (store) {
        store.put(value, key);
      });
    }
  }, {
    key: "withIDBStore",
    value: function withIDBStore(type, callback) {
      var _this = this;

      return this.db.then(function (db) {
        return new Promise(function (resolve, reject) {
          var transaction = db.transaction(_this.storeName, type);

          transaction.oncomplete = function () {
            return resolve();
          };

          transaction.onabort = transaction.onerror = function () {
            return reject(transaction.error);
          };

          callback(transaction.objectStore(_this.storeName));
        });
      });
    }
  }], [{
    key: "setup",
    value: function setup() {
      var dbName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'keyval';
      var storeNames = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ['keyval'];
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", new Promise(function (resolve, reject) {
                  var openreq = indexedDB.open(dbName, 1);

                  openreq.onerror = function () {
                    return reject(openreq.error);
                  };

                  openreq.onsuccess = function () {
                    return resolve(openreq.result);
                  };

                  openreq.onupgradeneeded = function () {
                    var _iteratorNormalCompletion = true;
                    var _didIteratorError = false;
                    var _iteratorError = undefined;

                    try {
                      for (var _iterator = storeNames[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var storeName = _step.value;
                        openreq.result.createObjectStore(storeName);
                      }
                    } catch (err) {
                      _didIteratorError = true;
                      _iteratorError = err;
                    } finally {
                      try {
                        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                          _iterator["return"]();
                        }
                      } finally {
                        if (_didIteratorError) {
                          throw _iteratorError;
                        }
                      }
                    }
                  };
                }));

              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
    }
  }]);

  return Store;
}();

exports.Store = Store;
},{}],"src/trie.ts":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

Object.defineProperty(exports, "__esModule", {
  value: true
});

var Trie =
/*#__PURE__*/
function () {
  function Trie(parent, value) {
    _classCallCheck(this, Trie);

    this.parent = parent;
    this.children = new Array(26);
    this.isWord = false;
    if (parent !== null) parent.children[value.charCodeAt(0) - 65] = this;
  }

  _createClass(Trie, null, [{
    key: "create",
    value: function create(dict) {
      var root = new Trie(null, '');

      for (var word in dict) {
        var current = root;

        for (var i = 0; i < word.length; i++) {
          var letter = word[i];
          var ord = letter.charCodeAt(0);
          var next = current.children[ord - 65];
          if (next === undefined) next = new Trie(current, letter);
          current = next;
        }

        current.isWord = dict[word].dict || true;
      }

      return root;
    }
  }]);

  return Trie;
}();

exports.Trie = Trie;
},{}],"src/dict.ts":[function(require,module,exports) {

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function define(word, dict) {
  var val = dict[word];
  if (!val) return '';
  var re = /[{<](.*?)?=.*?[>}]/g;
  var def = dict[word].defn;
  if (!def) return '';
  var match = re.exec(def);

  if (match) {
    var m = dict[match[1].toUpperCase()];

    if (!m || !m.defn) {
      def = match[1];
    } else {
      def = "".concat(match[1], " (").concat(m.defn, ")");
    }
  }

  return def.replace(/\{(.*?)=.*?\}/g, '$1').replace(/<(.*?)=.*?>/g, '$1').replace(/\s*?\[.*?\]\s*?/g, '');
}

exports.define = define;

function isValid(word, dict, type) {
  var val = dict[word];
  return val && (!val.dict || val.dict.includes(type.charAt(0)));
}

exports.isValid = isValid;

function order(words) {
  var ordered = [];
  var anadromes = new Set();
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = words[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var w = _step.value;
      var r = w.split('').reverse().join('');

      if (r !== w && words.includes(r)) {
        var key = "".concat([w, r].sort().join(' '));

        if (!anadromes.has(key)) {
          anadromes.add(key);
          ordered.push("(".concat(w), "".concat(r, ")"));
        }
      } else {
        ordered.push(w);
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"] != null) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return ordered;
}

exports.order = order;
},{}],"src/stats.ts":[function(require,module,exports) {
"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

Object.defineProperty(exports, "__esModule", {
  value: true
});

var dict_1 = require("./dict");

var Stats =
/*#__PURE__*/
function () {
  function Stats(percentiles, dict) {
    _classCallCheck(this, Stats);

    this.dict = dict;
    this.percentiles = percentiles;
    this.mixed = {};

    for (var word in dict) {
      var anagram = Stats.toAnagram(word);
      this.mixed[anagram] = this.mixed[anagram] || [];
      this.mixed[anagram].push(word);
    }
  }

  _createClass(Stats, [{
    key: "anagrams",
    value: function anagrams(word, type, min) {
      var a = Stats.toAnagram(word);
      var group = this.mixed[a];
      var result = {
        words: []
      };
      if (!group) return result;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = group[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var w = _step.value;
          if (min && w.length < min) continue;

          if (dict_1.isValid(w, this.dict, type)) {
            result.words.push(w);
            var v = this.dict[w];

            for (var _i = 0, _arr = ['n', 'o', 'b']; _i < _arr.length; _i++) {
              var d = _arr[_i];
              if (v[d]) result[d] = (result[d] || 0) + v[d];
            }
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return result;
    }
  }, {
    key: "stats",
    value: function stats(word) {
      var dice = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'New';
      var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'NWL';
      var val = this.dict[word];
      var a = this.anagrams(word, type);

      if (!dict_1.isValid(word, this.dict, type) || !a.words.length) {
        return {
          grade: ' '
        };
      }

      var pf = val.freq === undefined ? -1 : this.percentiles.freqs.findIndex(function (v) {
        return v <= val.freq;
      });
      var f = pf === -1 ? ' ' : gradeFreq(pf);
      var s = this.percentiles[dice][type];
      var d = dice.charAt(0).toLowerCase();
      var vw = val[d] || 0;
      var pw = s.words.findIndex(function (v) {
        return v <= vw;
      });
      var rw = rank(pw);
      var va = a[d] || 0;
      var pa = s.anagrams.findIndex(function (v) {
        return v <= va;
      });
      var ra = rank(pa);
      var g = [' ', 'A', 'B', 'C', 'D'][Math.ceil((rw + ra) / 2)];

      var pct = function pct(v) {
        return Math.round(100 * v / s.total * 1000) / 1000;
      };

      var result = {
        grade: g < f ? f : g
      };
      if (pf > -1) result.freq = pf;
      if (pw > -1) result.word = {
        p: pw,
        v: pct(val.freq)
      };
      if (pa > -1) result.anagram = {
        p: pa,
        v: pct(va)
      };
      return result;
    }
  }, {
    key: "history",
    value: function history(games, dice, type) {
      var _this = this;

      var d = dice.charAt(0).toLowerCase();

      var reverse = function reverse(w) {
        return w.split('').reverse().join('');
      };

      var ratio = {};
      var anadromes = {};
      var anagrams = {};
      var all = {};
      var either = {};
      var found = {};
      var n = games.length;
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        var _loop = function _loop() {
          var _step2$value = _slicedToArray(_step2.value, 2),
              possible = _step2$value[0],
              played = _step2$value[1];

          var as = {};

          for (var _w2 in possible) {
            all[_w2] = (all[_w2] || 0) + 1;

            var _a2 = Stats.toAnagram(_w2);

            as[_a2] = as[_a2] || [];

            as[_a2].push(_w2);

            if (played.has(_w2)) {
              found[_w2] = (found[_w2] || 0) + 1;

              var _r2 = reverse(_w2);

              if (_r2 !== _w2 && possible[_r2]) {
                var k = [_w2, _r2].sort()[0];

                if (!played.has(_r2)) {
                  either[k] = (either[k] || 0) + 1;
                  anadromes[k] = (anadromes[_w2] || 0) + 1 / n * _this.dict[k][d];
                } else if (_w2 === k) {
                  either[k] = (either[k] || 0) + 1;
                }
              }
            } else {
              ratio[_w2] = (ratio[_w2] || 0) + 1 / n * _this.dict[_w2][d];
            }
          }

          for (var _a3 in as) {
            var group = as[_a3];
            if (group.length <= 1) continue;
            var f = group.filter(function (w) {
              return played.has(w);
            }).length / group.length;
            if (!f) continue;

            var _w3 = group.reduce(function (acc, w) {
              return acc + _this.dict[w][d];
            }, 0) / group.length;

            anagrams[_a3] = (anagrams[_a3] || 0) + 1 / n * _w3 * (1 - f);
          }

          n--;
        };

        for (var _iterator2 = games[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          _loop();
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      var K = Math.log(games.length);

      for (var w in all) {
        ratio[w] += K * this.dict[w][d] * Math.pow(1 - (found[w] || 0) / all[w], 2);

        if (anadromes[w]) {
          var r = reverse(w);

          var _ref = (found[r] || 0) > (found[w] || 0) ? [w, r] : [r, w],
              _ref2 = _slicedToArray(_ref, 2),
              _a = _ref2[0],
              b = _ref2[1];

          anadromes[w] += K * this.dict[w][d] * 2 * Math.pow(1 - (found[_a] || 0) / (all[b] || 1), 2);
        }

        var a = Stats.toAnagram(w);

        if (anagrams[a] && all[w]) {
          anagrams[w] += K * this.dict[w][d] * Math.pow(1 - (found[w] || 0) / all[w], 2);
        }
      }

      var sorted = function sorted(obj, limit) {
        return Object.entries(obj).sort(function (a, b) {
          return b[1] - a[1];
        }).slice(0, limit);
      };

      return {
        words: sorted(ratio, 100).map(function (e) {
          return {
            w: e[0],
            found: found[e[0]] || 0,
            all: all[e[0]] || 0
          };
        }),
        anadromes: sorted(anadromes, 50).map(function (e) {
          var k = e[0];
          var r = reverse(k);

          var _ref3 = (found[r] || 0) > (found[k] || 0) ? [k, r] : [r, k],
              _ref4 = _slicedToArray(_ref3, 2),
              n = _ref4[0],
              d = _ref4[1];

          return {
            n: n,
            fn: found[n] || 0,
            d: d,
            fd: found[d] || 0,
            e: either[k] || 0
          };
        }),
        anagrams: sorted(anagrams, 50).map(function (e) {
          var group = [];
          var _iteratorNormalCompletion3 = true;
          var _didIteratorError3 = false;
          var _iteratorError3 = undefined;

          try {
            for (var _iterator3 = dict_1.order(_this.anagrams(e[0], type).words)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
              var _r = _step3.value;

              var _w = _r.replace(/[^A-Z]/, '');

              group.push({
                raw: _r,
                found: found[_w] || 0,
                all: all[_w] || 0
              });
            }
          } catch (err) {
            _didIteratorError3 = true;
            _iteratorError3 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
                _iterator3["return"]();
              }
            } finally {
              if (_didIteratorError3) {
                throw _iteratorError3;
              }
            }
          }

          return group;
        })
      };
    }
  }], [{
    key: "toAnagram",
    value: function toAnagram(word) {
      return word.split('').sort().join('');
    }
  }]);

  return Stats;
}();

exports.Stats = Stats;

function gradeFreq(p) {
  if (p >= 99) return ' ';
  if (p >= 20) return 'A';
  if (p >= 10) return 'B';
  if (p >= 5) return 'C';
  return 'D';
}

function rank(p) {
  if (p >= 75) return 0;
  if (p >= 50) return 1;
  if (p >= 25) return 2;
  if (p >= 10) return 3;
  return 4;
}
},{"./dict":"src/dict.ts"}],"src/ui/global.ts":[function(require,module,exports) {
"use strict";

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var store_1 = require("../store");

var trie_1 = require("../trie");

var stats_1 = require("../stats");

var STORE = new store_1.Store('db', 'store');
var DEFAULTS = {
  dice: 'New',
  min: 3,
  dict: 'NWL',
  grade: 'C',
  display: 'Show'
};

var fetchJSON = function fetchJSON(url) {
  return fetch(url, {
    mode: 'no-cors'
  }).then(function (j) {
    return j.json();
  });
};

exports.global = {
  SETTINGS: JSON.parse(localStorage.getItem('settings')) || DEFAULTS,
  STORE: STORE,
  LIMIT: 500,
  DICT: undefined,
  STATS: undefined,
  HISTORY: undefined,
  TRIE: undefined,
  GAMES: undefined,
  SEED: 0,
  LOADED: {
    DICT: fetchJSON('data/dict.json').then(function (d) {
      exports.global.DICT = d;
    }),
    TRIE: function TRIE() {
      return __awaiter(void 0, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!exports.global.TRIE) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt("return");

              case 2:
                _context.next = 4;
                return exports.global.LOADED.DICT;

              case 4:
                exports.global.TRIE = trie_1.Trie.create(exports.global.DICT);

              case 5:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));
    },
    STATS: function STATS() {
      return __awaiter(void 0, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2() {
        var stats;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!exports.global.STATS) {
                  _context2.next = 2;
                  break;
                }

                return _context2.abrupt("return");

              case 2:
                _context2.next = 4;
                return Promise.all([exports.global.LOADED.DICT, fetchJSON('data/stats.json').then(function (s) {
                  stats = s;
                })]);

              case 4:
                exports.global.STATS = new stats_1.Stats(stats, exports.global.DICT);

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
    },
    HISTORY: STORE.get('history').then(function (h) {
      exports.global.HISTORY = h || [];
    }),
    TRAINING: store_1.Store.setup('training', ['NWL', 'ENABLE', 'CSW'])
  }
};
window.global = exports.global;
},{"../store":"src/store.ts","../trie":"src/trie.ts","../stats":"src/stats.ts"}],"src/random.ts":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

Object.defineProperty(exports, "__esModule", {
  value: true
});

var Random =
/*#__PURE__*/
function () {
  function Random() {
    var n = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 4;

    _classCallCheck(this, Random);

    n = n ^ 61 ^ n >>> 16;
    n = n + (n << 3);
    n = n ^ n >>> 4;
    n = Math.imul(n, 0x27d4eb2d);
    n = n ^ n >>> 15;
    this.seed = n >>> 0;
  }

  _createClass(Random, [{
    key: "next",
    value: function next(min, max) {
      if (min) min = Math.floor(min);
      if (max) max = Math.floor(max);
      var z = this.seed += 0x6d2b79f5 | 0;
      z = Math.imul(z ^ z >>> 15, z | 1);
      z = z ^ z + Math.imul(z ^ z >>> 7, z | 61);
      z = (z ^ z >>> 14) >>> 0;
      var n = z / Math.pow(2, 32);
      if (min === undefined) return n;
      if (!max) return Math.floor(n * min);
      return Math.floor(n * (max - min)) + min;
    }
  }, {
    key: "shuffle",
    value: function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(this.next() * (i + 1));
        var _ref = [arr[j], arr[i]];
        arr[i] = _ref[0];
        arr[j] = _ref[1];
      }

      return arr;
    }
  }, {
    key: "sample",
    value: function sample(arr) {
      var remove = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
      if (arr.length === 0) throw new RangeError('Cannot sample an empty array');
      var index = this.next(arr.length);
      var val = arr[index];

      if (remove) {
        arr[index] = arr[arr.length - 1];
        arr.pop();
      }

      if (val === undefined && !Object.prototype.hasOwnProperty.call(arr, index)) {
        throw new RangeError("Cannot sample a sparse array");
      }

      return val;
    }
  }]);

  return Random;
}();

exports.Random = Random;
},{}],"src/game.ts":[function(require,module,exports) {
"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

Object.defineProperty(exports, "__esModule", {
  value: true
});

var dict_1 = require("./dict");

var random_1 = require("./random");

var stats_1 = require("./stats");

var NEW_DICE = ['AAEEGN', 'ELRTTY', 'AOOTTW', 'ABBJOO', 'EHRTVW', 'CIMOTU', 'DISTTY', 'EIOSST', 'DELRVY', 'ACHOPS', 'HIMNQU', 'EEINSU', 'EEGHNW', 'AFFKPS', 'HLNNRZ', 'DEILRX'];
var OLD_DICE = ['AACIOT', 'AHMORS', 'EGKLUY', 'ABILTY', 'ACDEMP', 'EGINTV', 'GILRUW', 'ELPSTU', 'DENOSW', 'ACELRS', 'ABJMOQ', 'EEFHIY', 'EHINPS', 'DKNOTU', 'ADENVZ', 'BIFORX'];
var BIG_DICE = ['AAAFRS', 'AAEEEE', 'AAFIRS', 'ADENNN', 'AEEEEM', 'AEEGMU', 'AEGMNN', 'AFIRSY', 'BJKQXZ', 'CCNSTW', 'CEIILT', 'CEILPT', 'CEIPST', 'DDLNOR', 'DHHLOR', 'DHHNOT', 'DHLNOR', 'EIIITT', 'EMOTTT', 'ENSSSU', 'FIPRSY', 'GORRVW', 'HIPRRY', 'NOOTUW', 'OOOTTU'];
exports.SUFFIXES = ['S', 'ER', 'ED', 'ING'];

var Game =
/*#__PURE__*/
function () {
  function Game(trie, dict, stats, random) {
    var settings = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {
      dice: 'New',
      dict: 'NWL'
    };

    _classCallCheck(this, Game);

    this.trie = trie;
    this.dict = dict;
    this.stats = stats;
    this.dice = settings.dice === 'Big' ? BIG_DICE : settings.dice === 'Old' ? OLD_DICE : NEW_DICE;
    this.size = Math.sqrt(this.dice.length);
    settings.min = settings.min || this.size - 1;
    this.settings = settings;
    this.random = random;
    this.seed = this.random.seed;
    this.board = [];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = this.dice[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var die = _step.value;
        var c = this.random.sample(die.split(''));
        this.board.push(c === 'Q' ? 'Qu' : c);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    this.random.shuffle(this.board);
    this.possible = this.solve();
    this.id = Game.encodeID(this.settings, this.seed);
    this.played = {};
    this.overtime = new Set();
    this.score = {
      regular: 0,
      overtime: 0
    };
    this.start = +new Date();
    this.expired = null;
  }

  _createClass(Game, [{
    key: "play",
    value: function play(word) {
      if (!this.played[word] && word.length >= this.settings.min) {
        if (this.possible[word]) {
          this.played[word] = +new Date();
          var score = Game.score(word);
          if (this.expired) this.overtime.add(word);
          var bucket = this.expired ? 'overtime' : 'regular';
          this.score[bucket] += score;
          return score;
        } else {
          this.played[word] = -new Date();
          if (this.expired) this.overtime.add(word);
        }
      }

      return 0;
    }
  }, {
    key: "toJSON",
    value: function toJSON() {
      return {
        seed: this.id,
        start: this.start,
        expired: this.expired,
        words: this.played,
        goal: {
          S: this.totals.s,
          A: this.totals.a,
          B: this.totals.b,
          C: this.totals.c,
          D: this.totals.d
        }
      };
    }
  }, {
    key: "progress",
    value: function progress() {
      var _this = this;

      var total = 0;
      var invalid = 0;
      var valid = 0;
      var suffixes = {};
      var subwords = new Set();
      var anagrams = {};

      for (var word in this.played) {
        total++;

        if (this.played[word] < 0) {
          invalid++;
          continue;
        }

        valid++;
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = exports.SUFFIXES[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var suffix = _step2.value;
            var suffixed = void 0;

            if (['ER', 'ED'].includes(suffix) && word.endsWith('E')) {
              suffixed = "".concat(word).concat(suffix.charAt(1));
            } else if (suffix === 'S' && (word.endsWith('S') || word.endsWith('X'))) {
              suffixed = "".concat(word, "ES");
            } else {
              suffixed = "".concat(word).concat(suffix);
            }

            if (this.possible[suffixed] && !this.played[suffixed]) suffixes[suffixed] = word;
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
              _iterator2["return"]();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        var anagram = stats_1.Stats.toAnagram(word);
        anagrams[anagram] = anagrams[anagram] || [];
        anagrams[anagram].push(word);
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = subs(word, this.settings.min)[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var sub = _step3.value;
            if (this.possible[sub] && !this.played[sub]) subwords.add(sub);
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
              _iterator3["return"]();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
      }

      var missing = [];

      var _loop = function _loop(_anagram) {
        missing = missing.concat(_this.totals.anagrams[_anagram].filter(function (w) {
          return !anagrams[_anagram].includes(w);
        }));
      };

      for (var _anagram in anagrams) {
        _loop(_anagram);
      }

      var words = new Set([].concat(_toConsumableArray(Object.keys(suffixes)), _toConsumableArray(subwords), _toConsumableArray(missing)));
      var score = this.score.regular + this.score.overtime + Array.from(words).reduce(function (sum, w) {
        return Game.score(w) + sum;
      }, 0);
      return {
        invalid: invalid,
        valid: valid,
        total: total,
        score: score,
        suffixes: suffixes,
        subwords: subwords.size,
        anagrams: missing.length,
        missing: words
      };
    }
  }, {
    key: "state",
    value: function state() {
      var _this2 = this;

      var progress = this.progress();

      var gr = function gr(w) {
        return _this2.stats.stats(w, _this2.settings.dice, _this2.settings.dict).grade;
      };

      var fn = function fn(a, b) {
        var ma = progress.missing.has(a);
        var mb = progress.missing.has(b);
        if (ma && !mb) return -1;
        if (mb && !ma) return 1;
        var ga = gr(a);
        var gb = gr(b);
        if (ga > gb) return -1;
        if (gb > ga) return 1;
        if (a.length > b.length) return 1;
        if (b.length > a.length) return -1;
        return stats_1.Stats.toAnagram(a).localeCompare(stats_1.Stats.toAnagram(b));
      };

      var augment = function augment(w) {
        return {
          word: w,
          grade: gr(w),
          defn: dict_1.define(w, _this2.dict)
        };
      };

      return {
        played: Array.from(Object.entries(this.played)).sort(function (a, b) {
          return Math.abs(a[1]) - Math.abs(b[1]);
        }).map(function (e) {
          var w = e[0];
          var v = augment(w);
          if (e[1] < 0) v.invalid = true;
          if (_this2.overtime.has(w)) v.overtime = true;
          return v;
        }),
        remaining: Object.keys(this.possible).filter(function (w) {
          return !_this2.played[w];
        }).sort(fn).map(function (w) {
          var v = augment(w);
          if (progress.missing.has(w)) v.missing = true;
          if (progress.suffixes[w]) v.root = progress.suffixes[w];
          return v;
        }),
        progress: progress,
        totals: this.totals
      };
    }
  }, {
    key: "solve",
    value: function solve() {
      var _this3 = this;

      var words = {};
      var queue = [];

      for (var y = 0; y < this.size; y++) {
        for (var x = 0; x < this.size; x++) {
          var c = this.board[this.size * y + x];
          var ord = c.charCodeAt(0);
          var node = this.trie.children[ord - 65];

          if (c === 'Qu' && node !== undefined) {
            c = 'QU';
            node = node.children[20];
          }

          if (node !== undefined) {
            queue.push([x, y, c, node, [[x, y]]]);
          }
        }
      }

      while (queue.length !== 0) {
        var _queue$pop = queue.pop(),
            _queue$pop2 = _slicedToArray(_queue$pop, 5),
            _x = _queue$pop2[0],
            _y = _queue$pop2[1],
            s = _queue$pop2[2],
            _node = _queue$pop2[3],
            h = _queue$pop2[4];

        var _loop2 = function _loop2() {
          var _arr2$_i = _slicedToArray(_arr2[_i2], 2),
              dx = _arr2$_i[0],
              dy = _arr2$_i[1];

          var x2 = _x + dx,
              y2 = _y + dy;
          if (h.find(function (e) {
            return e[0] === x2 && e[1] === y2;
          }) !== undefined) return "continue";

          if (0 <= x2 && x2 < _this3.size && 0 <= y2 && y2 < _this3.size) {
            var hist = h.slice();
            hist.push([x2, y2]);
            var _c = _this3.board[_this3.size * y2 + x2];

            var node2 = _node.children[_c.charCodeAt(0) - 65];

            if (_c === 'Qu' && node2 !== undefined) {
              _c = 'QU';
              node2 = node2.children[20];
            }

            if (node2 !== undefined) {
              var s2 = s + _c;
              var isWord = typeof node2.isWord === 'boolean' ? node2.isWord : node2.isWord.includes(_this3.settings.dict.charAt(0));
              if (isWord && s2.length >= _this3.settings.min) words[s2] = hist;
              queue.push([x2, y2, s2, node2, hist]);
            }
          }
        };

        for (var _i2 = 0, _arr2 = [[1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]]; _i2 < _arr2.length; _i2++) {
          var _ret = _loop2();

          if (_ret === "continue") continue;
        }
      }

      return words;
    }
  }, {
    key: "totals",
    get: function get() {
      if (this.totals_) return this.totals_;
      var anagrams = {};
      var grades = {};

      for (var word in this.possible) {
        var anagram = stats_1.Stats.toAnagram(word);
        anagrams[anagram] = anagrams[anagram] || [];
        anagrams[anagram].push(word);
        var g = this.stats.stats(word, this.settings.dice, this.settings.dict).grade;
        grades[g] = (grades[g] || 0) + Game.score(word);
      }

      var d = grades.D || 0;
      var c = d + (grades.C || 0);
      var b = c + (grades.B || 0);
      var a = b + (grades.A || 0);
      var s = a + (grades[' '] || 0);
      return this.totals_ = {
        s: s,
        a: a,
        b: b,
        c: c,
        d: d,
        anagrams: anagrams
      };
    }
  }], [{
    key: "encodeID",
    value: function encodeID(s, seed) {
      return "".concat(s.dice.charAt(0)).concat(s.min).concat(s.dict.charAt(0)).concat(seed);
    }
  }, {
    key: "decodeID",
    value: function decodeID(id) {
      var d = id.charAt(0);
      var dice = d === 'N' ? 'New' : d === 'O' ? 'Old' : d === 'B' ? 'Big' : undefined;
      var min = Number(id.charAt(1));
      var t = id.charAt(2);
      var dict = t === 'N' ? 'NWL' : t === 'E' ? 'ENABLE' : t === 'C' ? 'CSW' : undefined;
      var num = id.slice(3);
      var seed = num.length ? Number(num) : NaN;
      if (String(seed) !== num) seed = NaN;
      return [{
        dice: dice,
        min: min,
        dict: dict
      }, seed];
    }
  }, {
    key: "fromJSON",
    value: function fromJSON(json, trie, dict, stats) {
      var _Game$decodeID = Game.decodeID(json.seed),
          _Game$decodeID2 = _slicedToArray(_Game$decodeID, 2),
          settings = _Game$decodeID2[0],
          seed = _Game$decodeID2[1];

      var random = new random_1.Random();
      random.seed = seed;
      var game = new Game(trie, dict, stats, random, settings);
      game.start = json.start;
      game.expired = json.expired;
      game.played = json.words;
      var score = {
        regular: 0,
        overtime: 0
      };

      for (var w in game.played) {
        var s = Game.score(w);

        if (!game.expired || game.played[w] <= game.expired) {
          score.regular += s;
        } else {
          score.overtime += s;
        }
      }

      game.score = score;
      return game;
    }
  }, {
    key: "score",
    value: function score(word) {
      if (word.length < 3) return 0;
      if (word.length <= 4) return 1;
      if (word.length === 5) return 2;
      if (word.length === 6) return 3;
      if (word.length === 7) return 5;
      return 11;
    }
  }]);

  return Game;
}();

exports.Game = Game;

function subs(word, min) {
  var words = new Set();

  for (var b = 0; b < word.length; b++) {
    for (var e = 1; e <= word.length - b; e++) {
      var s = word.substr(b, e);
      if (s.length >= min) words.add(s);
    }
  }

  return words;
}
},{"./dict":"src/dict.ts","./random":"src/random.ts","./stats":"src/stats.ts"}],"src/timer.ts":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

Object.defineProperty(exports, "__esModule", {
  value: true
});

var Timer =
/*#__PURE__*/
function () {
  function Timer(display, duration) {
    var elapsed = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var expireFn = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    var updateFn = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

    _classCallCheck(this, Timer);

    this.duration = duration;
    this.display = display;
    this.elapsed = elapsed;
    this.interval = null;
    this.expireFn = expireFn;
    this.updateFn = updateFn;
    var remaining = this.duration - this.elapsed;

    if (remaining < 0) {
      this.display.classList.add('expired');
    } else {
      this.display.classList.remove('expired');
    }

    this.render(remaining);
  }

  _createClass(Timer, [{
    key: "toJSON",
    value: function toJSON() {
      return {
        duration: this.duration,
        elapsed: this.elapsed
      };
    }
  }, {
    key: "start",
    value: function start() {
      var _this = this;

      if (this.interval) return;
      this.begin = new Date().getTime();
      this.last = this.begin;
      this.interval = setInterval(function () {
        return _this.update();
      }, 100);
    }
  }, {
    key: "stop",
    value: function stop() {
      if (this.interval) {
        clearInterval(this.interval);
        this.interval = null;
      }
    }
  }, {
    key: "pause",
    value: function pause() {
      if (this.interval) {
        this.stop();
        this.begin = new Date().getTime();
        this.elapsed += this.begin - this.last;
        this.last = this.begin;
      } else {
        this.start();
      }
    }
  }, {
    key: "expired",
    value: function expired() {
      return this.elapsed >= this.duration;
    }
  }, {
    key: "update",
    value: function update() {
      var now = new Date().getTime();
      this.elapsed += now - this.last;
      this.last = now;
      var distance;

      if (this.expired()) {
        this.display.classList.add('expired');
        distance = this.elapsed - this.duration;

        if (this.expireFn) {
          this.expireFn();
          this.expireFn = null;
        }
      } else {
        distance = this.duration - this.elapsed;
      }

      var before = this.display.textContent;
      this.render(distance);

      if (before !== this.display.textContent && this.updateFn) {
        this.updateFn();
      }
    }
  }, {
    key: "render",
    value: function render(distance) {
      var minutes = Math.floor(distance % (1000 * 60 * 60) / (1000 * 60));
      var seconds = "".concat(Math.floor(distance % (1000 * 60) / 1000)).padStart(2, '0');
      this.display.textContent = "".concat(minutes, ":").concat(seconds);
    }
  }]);

  return Timer;
}();

exports.Timer = Timer;
},{}],"src/ui/score.ts":[function(require,module,exports) {
"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var global_1 = require("./global");

var ui_1 = require("./ui");

var game_1 = require("../game");

var ScorePane =
/*#__PURE__*/
function () {
  function ScorePane(board) {
    _classCallCheck(this, ScorePane);

    this.board = board;
  }

  _createClass(ScorePane, [{
    key: "attach",
    value: function attach() {
      var _this = this;

      this.container = ui_1.UI.createElementWithId('div', 'game');
      var wrapper = ui_1.UI.createElementWithId('div', 'wrapper');
      wrapper.classList.add('score');
      var back = ui_1.UI.createBackButton(function () {
        return __awaiter(_this, void 0, void 0,
        /*#__PURE__*/
        regeneratorRuntime.mark(function _callee() {
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  ui_1.UI.root.removeChild(this.detach());
                  _context.t0 = ui_1.UI.root;
                  _context.next = 4;
                  return this.board.attach({
                    resume: 'return'
                  });

                case 4:
                  _context.t1 = _context.sent;

                  _context.t0.appendChild.call(_context.t0, _context.t1);

                case 6:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee, this);
        }));
      });
      this.container.appendChild(ui_1.UI.createTopbar(back, this.board.timerDisplay, this.board.score.cloneNode(true)));
      var game = this.board.game;
      var state = game.state();
      var score = game.score.regular + game.score.overtime;
      var goal = state.totals[global_1.global.SETTINGS.grade.toLowerCase()];
      var details = "".concat(score, "/").concat(goal, " (").concat(Math.round(score / goal * 100).toFixed(0), "%)");
      var current = makeCollapsible(game.id, details, 'block');
      var div = document.createElement('div');
      div.classList.add('collapsible-content');
      this.displayPlayed(state, div, true);
      this.displayPossible(state, div);
      wrapper.appendChild(current);
      wrapper.appendChild(div);
      current.classList.add('active');
      div.style.display = 'block';

      var _loop = function _loop(i) {
        var state = global_1.global.HISTORY[i];
        var score = 0;

        for (var _i = 0, _Object$entries = Object.entries(state.words); _i < _Object$entries.length; _i++) {
          var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
              w = _Object$entries$_i[0],
              t = _Object$entries$_i[1];

          if (t > 0) score += game_1.Game.score(w);
        }

        if (!score) return "continue";
        var details = "".concat(score, "/").concat(state.goal[global_1.global.SETTINGS.grade], " (").concat(Math.round(score / state.goal[global_1.global.SETTINGS.grade] * 100).toFixed(0), "%)");
        var div = document.createElement('div');
        div.classList.add('collapsible-content');
        div.classList.add('lazy');
        var button = makeCollapsible(state.seed, details, 'block', function () {
          if (div.classList.contains('lazy')) {
            div.classList.remove('lazy');

            var _game = game_1.Game.fromJSON(state, global_1.global.TRIE, global_1.global.DICT, global_1.global.STATS);

            var s = _game.state();

            _this.displayPlayed(s, div);

            _this.displayPossible(s, div);
          }
        });
        wrapper.appendChild(button);
        wrapper.appendChild(div);
      };

      for (var i = global_1.global.HISTORY.length - 1; i >= 0; i--) {
        var _ret = _loop(i);

        if (_ret === "continue") continue;
      }

      this.container.appendChild(wrapper);
      return this.container;
    }
  }, {
    key: "detach",
    value: function detach() {
      return this.container;
    }
  }, {
    key: "displayPlayed",
    value: function displayPlayed(state, div) {
      var expanded = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var p = state.progress;
      var details = "(".concat(p.score, ") ").concat(Object.keys(p.suffixes).length, "/").concat(p.subwords, "/").concat(p.anagrams, " (").concat(p.invalid, "/").concat(p.total, ")");
      var button = makeCollapsible('PLAYED', details, 'table');
      var table = document.createElement('table');
      table.classList.add('collapsible-content');
      table.classList.add('results');
      table.classList.add('played');
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = state.played[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _step$value = _step.value,
              word = _step$value.word,
              grade = _step$value.grade,
              overtime = _step$value.overtime,
              defn = _step$value.defn,
              invalid = _step$value.invalid;
          var tr = document.createElement('tr');
          if (grade < global_1.global.SETTINGS.grade) tr.classList.add('hard');
          if (invalid) tr.classList.add('error');
          if (overtime) tr.classList.add('overtime');
          var td = document.createElement('td');
          var b = document.createElement('b');
          b.textContent = word;
          td.appendChild(b);
          tr.appendChild(td);
          td = document.createElement('td');
          if (defn) td.textContent = defn;
          tr.appendChild(td);
          table.appendChild(tr);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      if (expanded) {
        button.classList.add('active');
        table.style.display = 'table';
      }

      div.appendChild(button);
      div.appendChild(table);
    }
  }, {
    key: "displayPossible",
    value: function displayPossible(state, div) {
      var expanded = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var tot = state.totals;
      var details = "".concat(tot.d, "/").concat(tot.c, "/").concat(tot.b, "/").concat(tot.a, " (").concat(tot.s, ")");
      var button = makeCollapsible('POSSIBLE', details, 'table');
      var table = document.createElement('table');
      table.classList.add('collapsible-content');
      table.classList.add('results');
      table.classList.add('possible');
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = state.remaining[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _step2$value = _step2.value,
              word = _step2$value.word,
              grade = _step2$value.grade,
              root = _step2$value.root,
              missing = _step2$value.missing,
              defn = _step2$value.defn;
          var tr = document.createElement('tr');
          if (grade < global_1.global.SETTINGS.grade) tr.classList.add('hard');
          var td = document.createElement('td');
          var b = document.createElement('b');

          if (root) {
            var rootSpan = document.createElement('span');
            rootSpan.textContent = root;
            var suffixSpan = document.createElement('span');
            suffixSpan.classList.add('underline');
            suffixSpan.textContent = word.slice(root.length);
            b.appendChild(rootSpan);
            b.appendChild(suffixSpan);
          } else {
            if (missing) b.classList.add('underline');
            b.textContent = word;
          }

          td.appendChild(b);
          tr.appendChild(td);
          td = document.createElement('td');
          td.textContent = defn;
          tr.appendChild(td);
          table.appendChild(tr);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      if (expanded) {
        button.classList.add('active');
        table.style.display = 'table';
      }

      div.appendChild(button);
      div.appendChild(table);
    }
  }]);

  return ScorePane;
}();

exports.ScorePane = ScorePane;

function makeCollapsible(title, details, display, fn) {
  var button = document.createElement('button');
  button.setAttribute('type', 'button');
  button.classList.add('collapsible');
  var div = document.createElement('div');
  var titleSpan = document.createElement('span');
  titleSpan.classList.add('collapsible-title');
  titleSpan.textContent = title;
  var detailsSpan = document.createElement('span');
  detailsSpan.classList.add('collapsible-details');
  detailsSpan.textContent = details;
  div.appendChild(titleSpan);
  div.appendChild(detailsSpan);
  button.appendChild(div);
  button.addEventListener('click', function () {
    button.classList.toggle('active');
    var content = button.nextElementSibling;

    if (content.style.display === display) {
      content.style.display = 'none';
    } else {
      if (fn) fn();
      content.style.display = display;
    }
  });
  return button;
}
},{"./global":"src/ui/global.ts","./ui":"src/ui/ui.ts","../game":"src/game.ts"}],"src/ui/board.ts":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var global_1 = require("./global");

var ui_1 = require("./ui");

var game_1 = require("../game");

var timer_1 = require("../timer");

var random_1 = require("../random");

var score_1 = require("./score");

var dict_1 = require("../dict");

var DURATION = 180 * 1000;

var BoardView =
/*#__PURE__*/
function () {
  function BoardView(json) {
    _classCallCheck(this, BoardView);

    this.last = json ? json.last : '';
    this.kept = json ? json.kept : false;
    this.game = json ? json.game : undefined;

    var _ref = json ? this.createTimer(json.timer.duration, json.timer.elapsed) : this.createTimer(),
        display = _ref.display,
        timer = _ref.timer;

    this.timer = timer;
    this.timerDisplay = display;
  }

  _createClass(BoardView, [{
    key: "toJSON",
    value: function toJSON() {
      return {
        last: this.last,
        kept: this.kept,
        timer: this.timer.toJSON(),
        game: this.game && ('random' in this.game ? this.game.toJSON() : this.game)
      };
    }
  }, {
    key: "attach",
    value: function attach() {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        var _this = this;

        var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, h, game, random, id, _this$createTimer, display, timer, back, hash;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return Promise.all([global_1.global.LOADED.DICT, global_1.global.LOADED.TRIE(), global_1.global.LOADED.STATS(), global_1.global.LOADED.HISTORY]);

              case 2:
                if (this.played) {
                  _context.next = 23;
                  break;
                }

                this.played = new Set();
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context.prev = 7;

                for (_iterator = global_1.global.HISTORY[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                  h = _step.value;
                  this.played.add(h.seed);
                }

                _context.next = 15;
                break;

              case 11:
                _context.prev = 11;
                _context.t0 = _context["catch"](7);
                _didIteratorError = true;
                _iteratorError = _context.t0;

              case 15:
                _context.prev = 15;
                _context.prev = 16;

                if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                  _iterator["return"]();
                }

              case 18:
                _context.prev = 18;

                if (!_didIteratorError) {
                  _context.next = 21;
                  break;
                }

                throw _iteratorError;

              case 21:
                return _context.finish(18);

              case 22:
                return _context.finish(15);

              case 23:
                if (!(!this.game || !data.resume)) {
                  _context.next = 51;
                  break;
                }

                if (!this.game) {
                  _context.next = 33;
                  break;
                }

                this.timer.stop();

                if (!('random' in this.game)) {
                  this.game = game_1.Game.fromJSON(this.game, global_1.global.TRIE, global_1.global.DICT, global_1.global.STATS);
                }

                this.played.add(this.game.id);

                if (!Object.values(this.game.played).filter(function (t) {
                  return t > 0;
                }).length) {
                  _context.next = 33;
                  break;
                }

                this.updateGames();
                global_1.global.HISTORY.push(this.game.toJSON());
                _context.next = 33;
                return global_1.global.STORE.set('history', global_1.global.HISTORY);

              case 33:
                random = new random_1.Random();

              case 34:
                if (!(!game || !Object.keys(game.possible).length)) {
                  _context.next = 43;
                  break;
                }

                random.seed = global_1.global.SEED;
                id = game_1.Game.encodeID(global_1.global.SETTINGS, random.seed);

                if (!(this.played.has(id) && !data.allowDupes)) {
                  _context.next = 40;
                  break;
                }

                global_1.global.SEED++;
                return _context.abrupt("continue", 34);

              case 40:
                game = new game_1.Game(global_1.global.TRIE, global_1.global.DICT, global_1.global.STATS, random, global_1.global.SETTINGS);
                _context.next = 34;
                break;

              case 43:
                this.game = game;
                _this$createTimer = this.createTimer(), display = _this$createTimer.display, timer = _this$createTimer.timer;
                this.timer = timer;
                this.timerDisplay = display;
                this.last = '';
                this.kept = false;
                _context.next = 52;
                break;

              case 51:
                if (!('random' in this.game)) {
                  this.game = game_1.Game.fromJSON(this.game, global_1.global.TRIE, global_1.global.DICT, global_1.global.STATS);
                }

              case 52:
                this.container = ui_1.UI.createElementWithId('div', 'game');
                back = ui_1.UI.createBackButton(function () {
                  return ui_1.UI.toggleView('Menu');
                });
                back.addEventListener('long-press', function () {
                  return _this.refresh();
                });
                this.score = ui_1.UI.createElementWithId('div', 'score');
                this.score.addEventListener('mouseup', function () {
                  var pane = new score_1.ScorePane(_this);
                  ui_1.UI.root.removeChild(_this.detach('Score'));
                  ui_1.UI.root.appendChild(pane.attach());
                });
                this.score.addEventListener('long-press', function () {
                  return _this.onLongPress();
                });
                this.score.addEventListener('long-press-up', function () {
                  return _this.onLongPressUp();
                });
                this.displayScore();
                this.container.appendChild(ui_1.UI.createTopbar(back, this.timerDisplay, this.score));
                this.full = ui_1.UI.createElementWithId('div', 'full');
                this.container.appendChild(this.full);
                this.container.appendChild(this.renderBoard());
                this.word = ui_1.UI.createElementWithId('div', 'word');
                this.word.classList.add('word');

                if (!('ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0)) {
                  this.word.contentEditable = 'true';
                }

                this.container.appendChild(this.word);
                this.defn = ui_1.UI.createElementWithId('div', 'defn');
                this.defn.classList.add('definition');
                this.container.appendChild(this.defn);
                if (data.resume !== 'return') this.timer.start();
                hash = "#".concat(this.game.id);

                if (document.location.hash !== hash) {
                  window.history.replaceState(null, '', hash);
                }

                return _context.abrupt("return", this.container);

              case 75:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this, [[7, 11, 15, 23], [16,, 18, 22]]);
      }));
    }
  }, {
    key: "renderBoard",
    value: function renderBoard() {
      var _this2 = this;

      var game = this.game;
      var content = ui_1.UI.createElementWithId('div', 'foo');
      var table = ui_1.UI.createElementWithId('table', 'board');
      if (game.size > 4) table.classList.add('big');
      this.tds = new Set();
      var random = new random_1.Random(game.seed);

      for (var row = 0; row < game.size; row++) {
        var tr = document.createElement('tr');

        for (var col = 0; col < game.size; col++) {
          var td = document.createElement('td');
          td.textContent = game.board[row * game.size + col];
          if (td.textContent === 'Qu') td.classList.add('qu');
          if (['M', 'W', 'Z'].includes(td.textContent)) td.classList.add('underline');
          td.classList.add("rotate".concat(90 * random.next(0, 4)));
          td.setAttribute('data-x', String(row));
          td.setAttribute('data-y', String(col));
          var div = document.createElement('div');
          div.classList.add('target');
          div.setAttribute('data-x', String(row));
          div.setAttribute('data-y', String(col));
          td.appendChild(div);
          tr.appendChild(td);
          this.tds.add(td);
        }

        table.appendChild(tr);
      }

      var touched;

      var deselect = function deselect() {
        if (!touched) return;
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = touched[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _td = _step2.value;

            _td.classList.remove('selected');
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
              _iterator2["return"]();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      };

      var registerTouch = function registerTouch(e) {
        var touch = e.touches[0];
        var cell = document.elementFromPoint(touch.clientX, touch.clientY);

        if (cell && cell.matches('.target')) {
          var _td2 = cell.parentNode;

          _td2.classList.add('selected');

          if (!touched.has(_td2)) {
            touched.add(_td2);
            _this2.word.textContent += _td2.textContent;
          }
        }
      };

      table.addEventListener('touchstart', function (e) {
        _this2.clear();

        deselect();
        touched = new Set();
        registerTouch(e);
      });
      table.addEventListener('touchend', function () {
        deselect();

        _this2.play();
      });
      table.addEventListener('touchmove', registerTouch);
      content.appendChild(table);
      return content;
    }
  }, {
    key: "afterAttach",
    value: function afterAttach() {
      ui_1.UI.permaFocus(this.word);
    }
  }, {
    key: "detach",
    value: function detach(next) {
      if (next !== 'Score' && next !== 'Define') this.timer.pause();
      return this.container;
    }
  }, {
    key: "refresh",
    value: function refresh(data) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2() {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                ui_1.UI.persist();
                _context2.next = 3;
                return ui_1.UI.detachView('Board', 'Board');

              case 3:
                _context2.next = 5;
                return ui_1.UI.attachView('Board', data);

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));
    }
  }, {
    key: "play",
    value: function play() {
      var _this3 = this;

      var game = this.game;
      var w = (this.word.textContent || '').toUpperCase();

      if (w.length < 3 || game_1.SUFFIXES.includes(w)) {
        w = "".concat(this.last).concat(w);
        this.word.textContent = w;
      }

      var score = game.play(w);
      this.last = w;
      ui_1.UI.persist();
      var hide = game.settings.display === 'Hide';
      this.kept = true;

      if (!hide && score) {
        this.displayScore();
        this.defn.textContent = dict_1.define(w, global_1.global.DICT);
      } else {
        var original = this.word.textContent || undefined;
        if (!hide && game.played[w] < 0) this.word.classList.add('error');
        this.word.classList.add('fade');

        var listener = function listener() {
          _this3.clear(original);

          _this3.word.removeEventListener('animationend', listener);
        };

        this.word.addEventListener('animationend', listener);
      }
    }
  }, {
    key: "displayScore",
    value: function displayScore() {
      var game = this.game;

      if (game.settings.display === 'Hide') {
        this.score.textContent = '?';
        return;
      }

      if (game.settings.display === 'Full') {
        var state = game.state();
        var p = state.progress;
        var details = "(".concat(p.score, ") ").concat(Object.keys(p.suffixes).length, "/").concat(p.subwords, "/").concat(p.anagrams);
        var score = game.score.regular + game.score.overtime;
        var goal = state.totals[global_1.global.SETTINGS.grade.toLowerCase()];
        this.full.textContent = "".concat(details, " - ").concat(score, "/").concat(goal, " (").concat(Math.round(score / goal * 100).toFixed(0), "%)");
      }

      var s = game.score;
      this.score.textContent = s.overtime ? "".concat(s.regular, " / ").concat(s.overtime) : "".concat(s.regular);
    }
  }, {
    key: "clear",
    value: function clear(w) {
      if (w && w !== this.word.textContent) return;
      this.word.textContent = '';
      this.word.classList.remove('error');
      this.word.classList.remove('fade');
      this.defn.textContent = '';
      this.kept = false;
    }
  }, {
    key: "createTimer",
    value: function createTimer() {
      var _this4 = this;

      var duration = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DURATION;
      var elapsed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      var display = ui_1.UI.createElementWithId('div', 'timer');
      display.addEventListener('click', function () {
        return _this4.timer.pause();
      });
      return {
        display: display,
        timer: new timer_1.Timer(display, duration, elapsed, function () {
          if (_this4.game && !_this4.game.expired) {
            _this4.game.expired = +new Date();
          }
        }, function () {
          return ui_1.UI.persist();
        })
      };
    }
  }, {
    key: "updateGames",
    value: function updateGames() {
      if (!global_1.global.GAMES) return;
      var game = this.game;
      var played = new Set();

      for (var w in game.played) {
        if (game.played[w] > 0) played.add(w);
      }

      if (!played.size) return;
      if (global_1.global.GAMES.length >= global_1.global.LIMIT) global_1.global.GAMES.shift();
      global_1.global.GAMES.push([game.possible, played]);
    }
  }, {
    key: "onLongPress",
    value: function onLongPress() {
      var game = this.game;
      var size = game.size;
      var weights = [];

      for (var row = 0; row < size; row++) {
        var a = [];

        for (var col = 0; col < size; col++) {
          a.push(0);
        }

        weights.push(a);
      }

      var total = 0;

      for (var word in game.possible) {
        if (game.played[word]) continue;
        var score = game_1.Game.score(word);
        total += score;
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = game.possible[word][Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var p = _step3.value;
            weights[p[1]][p[0]] += score;
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
              _iterator3["return"]();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
      }

      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = this.tds[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var td = _step4.value;
          var w = weights[Number(td.dataset.x)][Number(td.dataset.y)] / total;
          td.style.backgroundColor = "rgba(255,0,0,".concat(w, ")");
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
            _iterator4["return"]();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }
    }
  }, {
    key: "onLongPressUp",
    value: function onLongPressUp() {
      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = this.tds[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var td = _step5.value;
          td.style.removeProperty('background-color');
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5["return"] != null) {
            _iterator5["return"]();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }
    }
  }, {
    key: "onKeyDown",
    value: function onKeyDown(e) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee3() {
        var key;
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                if (this.kept) this.clear();
                ui_1.UI.focusContentEditable(this.word);
                key = e.keyCode;

                if (!(key === 13 || key === 32)) {
                  _context3.next = 9;
                  break;
                }

                e.preventDefault();
                this.play();
                ui_1.UI.focusContentEditable(this.word);
                _context3.next = 15;
                break;

              case 9:
                if (!(key === 27)) {
                  _context3.next = 14;
                  break;
                }

                _context3.next = 12;
                return ui_1.UI.toggleView('Define');

              case 12:
                _context3.next = 15;
                break;

              case 14:
                if ((key < 65 || key > 90) && key !== 8) {
                  e.preventDefault();
                }

              case 15:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));
    }
  }]);

  return BoardView;
}();

exports.BoardView = BoardView;
},{"./global":"src/ui/global.ts","./ui":"src/ui/ui.ts","../game":"src/game.ts","../timer":"src/timer.ts","../random":"src/random.ts","./score":"src/ui/score.ts","../dict":"src/dict.ts"}],"src/ui/define.ts":[function(require,module,exports) {
"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var global_1 = require("./global");

var ui_1 = require("./ui");

var dict_1 = require("../dict");

var DefineView =
/*#__PURE__*/
function () {
  function DefineView(json) {
    _classCallCheck(this, DefineView);

    this.defn = null;
    this.stats = null;
    this.anagrams = null;
    this.word = json ? json.word : '';
  }

  _createClass(DefineView, [{
    key: "toJSON",
    value: function toJSON() {
      return {
        word: this.word
      };
    }
  }, {
    key: "attach",
    value: function attach(word) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        var _this = this;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return Promise.all([global_1.global.LOADED.DICT, global_1.global.LOADED.STATS()]);

              case 2:
                if (word) this.word = word;
                this.define = ui_1.UI.createElementWithId('div', 'define');
                this.search = ui_1.UI.createElementWithId('div', 'search');
                this.search.classList.add('word');
                this.search.contentEditable = 'true';
                this.search.textContent = this.word;
                this.define.appendChild(this.search);
                this.define.addEventListener('input', function () {
                  return _this.query(_this.search.textContent || '');
                });
                this.update();
                return _context.abrupt("return", this.define);

              case 12:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));
    }
  }, {
    key: "afterAttach",
    value: function afterAttach() {
      ui_1.UI.permaFocus(this.search);
    }
  }, {
    key: "query",
    value: function query(w) {
      this.search.textContent = w;
      this.word = w.toUpperCase();
      this.update();
      ui_1.UI.persist();
    }
  }, {
    key: "detach",
    value: function detach() {
      this.defn = null;
      this.stats = null;
      this.anagrams = null;
      return this.define;
    }
  }, {
    key: "update",
    value: function update() {
      var val = global_1.global.DICT[this.word];

      if (val) {
        var defn = ui_1.UI.createElementWithId('div', 'defineDefn');
        defn.classList.add('definition');
        defn.textContent = dict_1.define(this.word, global_1.global.DICT);

        if (val.dict && !val.dict.includes(global_1.global.SETTINGS.dict.charAt(0)) || this.word.length < global_1.global.SETTINGS.min) {
          this.define.classList.add('hard');
        } else {
          this.define.classList.remove('hard');
        }

        var addCells = function addCells(tr, label, data) {
          var td = document.createElement('td');
          var b = document.createElement('b');
          b.textContent = label;
          td.appendChild(b);
          tr.appendChild(td);
          td = document.createElement('td');
          td.classList.add('value');
          td.textContent = data;
          tr.appendChild(td);
        };

        var s = global_1.global.STATS.stats(this.word, global_1.global.SETTINGS.dice, global_1.global.SETTINGS.dict);
        var stats = document.createElement('table');
        stats.classList.add('roundedTable');
        var tr = document.createElement('tr');
        addCells(tr, 'Grade', s.grade === ' ' ? 'S' : s.grade);
        addCells(tr, 'Score', s.word ? String(s.word.p) : '-');
        stats.appendChild(tr);
        tr = document.createElement('tr');
        addCells(tr, 'Frequency', s.freq ? String(s.freq) : '-');
        addCells(tr, 'Anagram', s.anagram ? String(s.anagram.p) : '-');
        stats.appendChild(tr);
        stats.appendChild(tr);
        if (this.defn) this.define.removeChild(this.defn);
        this.define.appendChild(defn);
        this.defn = defn;
        if (this.stats) this.define.removeChild(this.stats);
        this.define.appendChild(stats);
        this.stats = stats;
      } else {
        if (this.defn) {
          this.define.removeChild(this.defn);
          this.defn = null;
        }

        if (this.stats) {
          this.define.removeChild(this.stats);
          this.stats = null;
        }
      }

      var anagrams = this.renderAnagrams();
      if (this.anagrams) this.define.removeChild(this.anagrams);
      this.define.appendChild(anagrams);
      this.anagrams = anagrams;
    }
  }, {
    key: "renderAnagrams",
    value: function renderAnagrams() {
      var _this2 = this;

      var div = ui_1.UI.createElementWithId('div', 'defineAnagrams');
      var words = global_1.global.STATS.anagrams(this.word, global_1.global.SETTINGS.dict).words;
      if (words.length <= 1) return div;
      var solo = [];
      var anadromes = new Set();
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = words[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var w = _step.value;
          var r = w.split('').reverse().join('');

          if (r !== w && words.includes(r)) {
            anadromes.add("".concat([w, r].sort().join(' ')));
          } else {
            solo.push(w);
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      var format = function format(w) {
        var e = document.createElement(w === _this2.word ? 'b' : 'span');
        e.textContent = w;
        e.addEventListener('click', function () {
          return _this2.query(w);
        });
        return e;
      };

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = anadromes[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var pair = _step2.value;

          var _pair$split = pair.split(' '),
              _pair$split2 = _slicedToArray(_pair$split, 2),
              a = _pair$split2[0],
              b = _pair$split2[1];

          div.appendChild(document.createTextNode(' ('));
          div.appendChild(format(a));
          div.appendChild(document.createTextNode(' '));
          div.appendChild(format(b));
          div.appendChild(document.createTextNode(') '));
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      for (var _i = 0, _solo = solo; _i < _solo.length; _i++) {
        var _w = _solo[_i];
        div.appendChild(format(_w));
        div.appendChild(document.createTextNode(' '));
      }

      return div;
    }
  }, {
    key: "onKeyDown",
    value: function onKeyDown(e) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2() {
        var key;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                ui_1.UI.focusContentEditable(this.search);
                key = e.keyCode;

                if (!(key === 13 || key === 32)) {
                  _context2.next = 11;
                  break;
                }

                if (!this.word) {
                  _context2.next = 7;
                  break;
                }

                this.query('');
                _context2.next = 9;
                break;

              case 7:
                _context2.next = 9;
                return ui_1.UI.toggleView('Define');

              case 9:
                _context2.next = 17;
                break;

              case 11:
                if (!(key === 27)) {
                  _context2.next = 16;
                  break;
                }

                _context2.next = 14;
                return ui_1.UI.toggleView('Define');

              case 14:
                _context2.next = 17;
                break;

              case 16:
                if ((key < 65 || key > 90) && key !== 8) {
                  e.preventDefault();
                }

              case 17:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));
    }
  }]);

  return DefineView;
}();

exports.DefineView = DefineView;
},{"./global":"src/ui/global.ts","./ui":"src/ui/ui.ts","../dict":"src/dict.ts"}],"src/ui/menu.ts":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var ui_1 = require("./ui");

var MenuView =
/*#__PURE__*/
function () {
  function MenuView() {
    _classCallCheck(this, MenuView);
  }

  _createClass(MenuView, [{
    key: "toJSON",
    value: function toJSON() {}
  }, {
    key: "attach",
    value: function attach() {
      var _this = this;

      this.menu = ui_1.UI.createElementWithId('div', 'menu');
      var title = ui_1.UI.createElementWithId('h1', 'title');
      title.textContent = 'BOGGLE';
      title.addEventListener('long-press', function () {
        return __awaiter(_this, void 0, void 0,
        /*#__PURE__*/
        regeneratorRuntime.mark(function _callee() {
          var key;
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return caches.keys();

                case 2:
                  _context.t0 = function (n) {
                    return n.startsWith('cache');
                  };

                  key = _context.sent.find(_context.t0);

                  if (!key) {
                    _context.next = 7;
                    break;
                  }

                  _context.next = 7;
                  return caches["delete"](key);

                case 7:
                  document.location.reload(true);

                case 8:
                case "end":
                  return _context.stop();
              }
            }
          }, _callee);
        }));
      });
      this.menu.appendChild(title);
      var nav = document.createElement('nav');

      var createButton = function createButton(name, fn) {
        var button = document.createElement('button');
        button.classList.add('toggle');
        button.textContent = name;
        button.addEventListener('click', fn);
        return button;
      };

      if (ui_1.UI.Views.Board.game) {
        nav.appendChild(createButton('RESUME', function () {
          return ui_1.UI.toggleView('Board', {
            resume: true
          });
        }));
        nav.appendChild(createButton('NEW GAME', function () {
          return ui_1.UI.toggleView('Board');
        }));
      } else {
        nav.appendChild(createButton('PLAY', function () {
          return ui_1.UI.toggleView('Board');
        }));
      }

      nav.appendChild(createButton('TRAIN', function () {
        return ui_1.UI.toggleView('Training');
      }));
      nav.appendChild(createButton('DEFINE', function () {
        return ui_1.UI.toggleView('Define');
      }));
      nav.appendChild(createButton('STATS', function () {
        return ui_1.UI.toggleView('Stats');
      }));
      nav.appendChild(createButton('SETTINGS', function () {
        return ui_1.UI.toggleView('Settings');
      }));
      this.menu.appendChild(nav);
      return this.menu;
    }
  }, {
    key: "detach",
    value: function detach() {
      return this.menu;
    }
  }]);

  return MenuView;
}();

exports.MenuView = MenuView;
},{"./ui":"src/ui/ui.ts"}],"src/ui/review.ts":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var global_1 = require("./global");

var ui_1 = require("./ui");

var dict_1 = require("../dict");

var store_1 = require("../store");

var ReviewView =
/*#__PURE__*/
function () {
  function ReviewView(json) {
    _classCallCheck(this, ReviewView);

    this.size = json ? json.size : 0;
  }

  _createClass(ReviewView, [{
    key: "toJSON",
    value: function toJSON() {
      return {
        size: this.size
      };
    }
  }, {
    key: "attach",
    value: function attach(size) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        var back, progress, d, score, store, data, keys, wrapper, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, k, table;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return Promise.all([global_1.global.LOADED.DICT, global_1.global.LOADED.STATS()]);

              case 2:
                this.review = ui_1.UI.createElementWithId('div', 'review');
                if (size) this.size = size;
                back = ui_1.UI.createBackButton(function () {
                  return ui_1.UI.toggleView('Training');
                });
                progress = ui_1.UI.createElementWithId('div', 'progress');
                progress.textContent = String(this.size);
                this.review.appendChild(ui_1.UI.createTopbar(back, null, progress));
                d = global_1.global.SETTINGS.dice.charAt(0).toLowerCase();

                score = function score(k) {
                  return global_1.global.STATS.anagrams(k, global_1.global.SETTINGS.dict)[d] || 0;
                };

                store = new store_1.Store('training', global_1.global.SETTINGS.dict);
                _context.next = 13;
                return store.get('data');

              case 13:
                data = _context.sent;
                keys = data.filter(function (w) {
                  return w.e < 2.0;
                }).sort(function (a, b) {
                  return score(b.k) / b.e - score(a.k) / a.e;
                }).map(function (w) {
                  return w.k;
                });
                wrapper = document.createElement('div');
                wrapper.classList.add('wrapper');
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context.prev = 20;

                for (_iterator = keys[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                  k = _step.value;
                  table = document.createElement('table');
                  table.classList.add('results');
                  ui_1.UI.addAnagramRows(table, dict_1.order(global_1.global.STATS.anagrams(k, global_1.global.SETTINGS.dict).words));
                  wrapper.appendChild(table);
                }

                _context.next = 28;
                break;

              case 24:
                _context.prev = 24;
                _context.t0 = _context["catch"](20);
                _didIteratorError = true;
                _iteratorError = _context.t0;

              case 28:
                _context.prev = 28;
                _context.prev = 29;

                if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                  _iterator["return"]();
                }

              case 31:
                _context.prev = 31;

                if (!_didIteratorError) {
                  _context.next = 34;
                  break;
                }

                throw _iteratorError;

              case 34:
                return _context.finish(31);

              case 35:
                return _context.finish(28);

              case 36:
                this.review.appendChild(wrapper);
                return _context.abrupt("return", this.review);

              case 38:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this, [[20, 24, 28, 36], [29,, 31, 35]]);
      }));
    }
  }, {
    key: "detach",
    value: function detach() {
      return this.review;
    }
  }]);

  return ReviewView;
}();

exports.ReviewView = ReviewView;
},{"./global":"src/ui/global.ts","./ui":"src/ui/ui.ts","../dict":"src/dict.ts","../store":"src/store.ts"}],"src/ui/settings.ts":[function(require,module,exports) {
"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

Object.defineProperty(exports, "__esModule", {
  value: true
});

var global_1 = require("./global");

var ui_1 = require("./ui");

var game_1 = require("../game");

var SettingsView =
/*#__PURE__*/
function () {
  function SettingsView() {
    _classCallCheck(this, SettingsView);
  }

  _createClass(SettingsView, [{
    key: "toJSON",
    value: function toJSON() {}
  }, {
    key: "attach",
    value: function attach() {
      var _this = this;

      this.settings = ui_1.UI.createElementWithId('div', 'settings');

      var createRow = function createRow(e) {
        var row = document.createElement('div');
        row.classList.add('row');
        row.appendChild(e);
        return row;
      };

      this.seed = ui_1.UI.createElementWithId('div', 'seed');
      this.seed.textContent = game_1.Game.encodeID(global_1.global.SETTINGS, global_1.global.SEED);
      this.seed.setAttribute('contenteditable', 'true');
      this.seed.addEventListener('input', function () {
        return _this.onInput(_this.seed.textContent || '');
      });
      var back = ui_1.UI.createBackButton(function () {
        return ui_1.UI.toggleView('Menu');
      });
      this.settings.appendChild(ui_1.UI.createTopbar(back, this.seed, null));

      var checkedRadioRow = function checkedRadioRow(k, opts, fn, id) {
        return createRow(ui_1.UI.createRadios(id || k, opts.map(function (s) {
          return s === String(global_1.global.SETTINGS[k]) ? [s] : s;
        }), fn));
      };

      this.settings.appendChild(checkedRadioRow('dice', ['New', 'Old', 'Big'], function () {
        var min = this.value === 'Big' ? 4 : 3;
        document.getElementById("min".concat(min)).checked = true;
        ui_1.UI.updateSettings({
          dice: this.value,
          min: min
        });
      }));
      this.settings.appendChild(checkedRadioRow('min', ['3', '4', '5'], function () {
        ui_1.UI.updateSettings({
          min: Number(this.value)
        });
      }));
      this.settings.appendChild(checkedRadioRow('dict', ['NWL', 'ENABLE', 'CSW'], function () {
        ui_1.UI.updateSettings({
          dict: this.value
        });
      }));
      this.settings.appendChild(checkedRadioRow('grade', ['A', 'B', 'C', 'D'], function () {
        ui_1.UI.updateSettings({
          grade: this.value
        });
      }));
      this.settings.appendChild(checkedRadioRow('display', ['Hide', 'Show', 'Full'], function () {
        ui_1.UI.updateSettings({
          display: this.value
        });
      }, 'scoreDisplay'));
      this.settings.appendChild(checkedRadioRow('theme', ['Light', 'Dark'], function () {
        var theme = this.value;
        ui_1.UI.updateSettings({
          theme: theme
        });
        ui_1.UI.setTheme(theme);
      }));
      return this.settings;
    }
  }, {
    key: "detach",
    value: function detach() {
      return this.settings;
    }
  }, {
    key: "update",
    value: function update() {
      this.seed.textContent = game_1.Game.encodeID(global_1.global.SETTINGS, global_1.global.SEED);
      this.seed.classList.remove('error');

      var set = function set(id) {
        return document.getElementById(id).checked = true;
      };

      set("dice".concat(global_1.global.SETTINGS.dice));
      set("min".concat(global_1.global.SETTINGS.min));
      set("dict".concat(global_1.global.SETTINGS.dict));
      set("grade".concat(global_1.global.SETTINGS.grade));
      set("scoreDisplay".concat(global_1.global.SETTINGS.display));
      set("theme".concat(global_1.global.SETTINGS.theme || 'Light'));
    }
  }, {
    key: "onInput",
    value: function onInput(id) {
      var _game_1$Game$decodeID = game_1.Game.decodeID(id),
          _game_1$Game$decodeID2 = _slicedToArray(_game_1$Game$decodeID, 2),
          settings = _game_1$Game$decodeID2[0],
          seed = _game_1$Game$decodeID2[1];

      if (isNaN(seed) || !(settings.dice && settings.dict && settings.min)) {
        this.seed.classList.add('error');
      } else {
        ui_1.UI.updateSettings(settings, seed, false);
        this.update();
      }
    }
  }]);

  return SettingsView;
}();

exports.SettingsView = SettingsView;
},{"./global":"src/ui/global.ts","./ui":"src/ui/ui.ts","../game":"src/game.ts"}],"src/ui/stats.ts":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var global_1 = require("./global");

var ui_1 = require("./ui");

var game_1 = require("../game");

var StatsView =
/*#__PURE__*/
function () {
  function StatsView(json) {
    _classCallCheck(this, StatsView);

    this.table = null;
    this.section = json ? json.section : 'WORD';
  }

  _createClass(StatsView, [{
    key: "toJSON",
    value: function toJSON() {
      return {
        section: this.section
      };
    }
  }, {
    key: "attach",
    value: function attach() {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        var _this = this;

        var i, game, played, w, data, back, display, radios;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return Promise.all([global_1.global.LOADED.HISTORY, global_1.global.LOADED.TRIE(), global_1.global.LOADED.DICT, global_1.global.LOADED.STATS()]);

              case 2:
                if (!global_1.global.GAMES) {
                  global_1.global.GAMES = [];

                  for (i = global_1.global.HISTORY.length - 1; i >= 0 && global_1.global.GAMES.length < global_1.global.LIMIT; i--) {
                    game = game_1.Game.fromJSON(global_1.global.HISTORY[i], global_1.global.TRIE, global_1.global.DICT, global_1.global.STATS);
                    played = new Set();

                    for (w in game.played) {
                      if (game.played[w] > 0) played.add(w);
                    }

                    global_1.global.GAMES.push([game.possible, played]);
                  }
                }

                data = global_1.global.STATS.history(global_1.global.GAMES, global_1.global.SETTINGS.dice, global_1.global.SETTINGS.dict);
                this.stats = ui_1.UI.createElementWithId('div', 'stats');
                back = ui_1.UI.createBackButton(function () {
                  return ui_1.UI.toggleView('Menu');
                });

                display = function display(s) {
                  return _this.display(s, data);
                };

                radios = ui_1.UI.createRadios('statsSelect', ['WORD', 'ANAGRAM', 'PAIR'].map(function (s) {
                  return s === _this.section ? [s] : s;
                }), function () {
                  display(this.value);
                  ui_1.UI.persist();
                });
                this.stats.appendChild(ui_1.UI.createTopbar(back, radios, null));
                this.display(this.section, data);
                return _context.abrupt("return", this.stats);

              case 11:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));
    }
  }, {
    key: "detach",
    value: function detach() {
      this.table = null;
      return this.stats;
    }
  }, {
    key: "display",
    value: function display(section, data) {
      this.section = section;
      var words = data.words,
          anadromes = data.anadromes,
          anagrams = data.anagrams;

      var link = function link(w) {
        var b = document.createElement('b');
        b.textContent = w;
        b.addEventListener('click', function () {
          return ui_1.UI.toggleView('Define', w);
        });
        return b;
      };

      var table = document.createElement('table');
      table.classList.add('roundedTable');

      if (section === 'PAIR') {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = anadromes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _step$value = _step.value,
                n = _step$value.n,
                fn = _step$value.fn,
                d = _step$value.d,
                fd = _step$value.fd,
                e = _step$value.e;
            var tr = document.createElement('tr');
            var td = document.createElement('td');
            td.appendChild(link(n));
            tr.appendChild(td);
            td = document.createElement('td');
            td.textContent = "".concat(fn, "/").concat(fd, " (").concat(e, ")");
            tr.appendChild(td);
            td = document.createElement('td');
            td.appendChild(link(d));
            tr.appendChild(td);
            table.appendChild(tr);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"] != null) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      } else if (section === 'WORD') {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = words[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _step2$value = _step2.value,
                w = _step2$value.w,
                found = _step2$value.found,
                all = _step2$value.all;

            var _tr = document.createElement('tr');

            var _td = document.createElement('td');

            _td.appendChild(link(w));

            _tr.appendChild(_td);

            _td = document.createElement('td');
            _td.textContent = "".concat(found, "/").concat(all);

            _tr.appendChild(_td);

            table.appendChild(_tr);
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
              _iterator2["return"]();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }
      } else {
        var _iteratorNormalCompletion3 = true;
        var _didIteratorError3 = false;
        var _iteratorError3 = undefined;

        try {
          for (var _iterator3 = anagrams[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
            var group = _step3.value;

            var _tr2 = document.createElement('tr');

            var _td2 = document.createElement('td');

            var together = [];
            var wait = false;
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
              for (var _iterator4 = group[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                var _step4$value = _step4.value,
                    raw = _step4$value.raw,
                    _found = _step4$value.found,
                    _all = _step4$value.all;

                var _w = raw.replace(/[^A-Z]/, '');

                if (raw.startsWith('(')) {
                  var b = document.createElement('b');
                  b.textContent = '(';
                  together.push(b);
                  wait = true;
                }

                together.push(link(_w));
                var span = document.createElement('span');
                span.textContent = " ".concat(_found, "/").concat(_all);

                if (raw.endsWith(')')) {
                  together.push(span);

                  var _b = document.createElement('b');

                  _b.textContent = ')';
                  together.push(_b);
                  wait = false;
                } else {
                  if (wait) span.textContent += ' ';
                  together.push(span);
                }

                if (!wait) {
                  var _iteratorNormalCompletion5 = true;
                  var _didIteratorError5 = false;
                  var _iteratorError5 = undefined;

                  try {
                    for (var _iterator5 = together[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                      var _e = _step5.value;

                      _td2.appendChild(_e);
                    }
                  } catch (err) {
                    _didIteratorError5 = true;
                    _iteratorError5 = err;
                  } finally {
                    try {
                      if (!_iteratorNormalCompletion5 && _iterator5["return"] != null) {
                        _iterator5["return"]();
                      }
                    } finally {
                      if (_didIteratorError5) {
                        throw _iteratorError5;
                      }
                    }
                  }

                  _td2.appendChild(document.createElement('br'));

                  together = [];
                }
              }
            } catch (err) {
              _didIteratorError4 = true;
              _iteratorError4 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion4 && _iterator4["return"] != null) {
                  _iterator4["return"]();
                }
              } finally {
                if (_didIteratorError4) {
                  throw _iteratorError4;
                }
              }
            }

            _tr2.appendChild(_td2);

            table.appendChild(_tr2);
          }
        } catch (err) {
          _didIteratorError3 = true;
          _iteratorError3 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion3 && _iterator3["return"] != null) {
              _iterator3["return"]();
            }
          } finally {
            if (_didIteratorError3) {
              throw _iteratorError3;
            }
          }
        }
      }

      if (this.table) this.stats.removeChild(this.table);
      this.stats.appendChild(table);
      this.table = table;
    }
  }]);

  return StatsView;
}();

exports.StatsView = StatsView;
},{"./global":"src/ui/global.ts","./ui":"src/ui/ui.ts","../game":"src/game.ts"}],"src/training.ts":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var dict_1 = require("./dict");

var random_1 = require("./random");

var PERIOD = 3;
var DAY = 24 * 60 * 60 * 1000;

function defaultCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

var Queue =
/*#__PURE__*/
function () {
  function Queue() {
    var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var compare = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultCompare;

    _classCallCheck(this, Queue);

    this.data = data;
    this.length = this.data.length;
    this.compare = compare;

    if (this.length > 0) {
      for (var i = (this.length >> 1) - 1; i >= 0; i--) {
        this.down(i);
      }
    }
  }

  _createClass(Queue, [{
    key: "push",
    value: function push(item) {
      this.data.push(item);
      this.length++;
      this.up(this.length - 1);
    }
  }, {
    key: "pop",
    value: function pop() {
      if (this.length === 0) return undefined;
      var top = this.data[0];
      var bottom = this.data.pop();
      this.length--;

      if (this.length > 0) {
        this.data[0] = bottom;
        this.down(0);
      }

      return top;
    }
  }, {
    key: "peek",
    value: function peek() {
      return this.data[0];
    }
  }, {
    key: "up",
    value: function up(pos) {
      var item = this.data[pos];

      while (pos > 0) {
        var parent = pos - 1 >> 1;
        var current = this.data[parent];
        if (this.compare(item, current) >= 0) break;
        this.data[pos] = current;
        pos = parent;
      }

      this.data[pos] = item;
    }
  }, {
    key: "down",
    value: function down(pos) {
      var half = this.length >> 1;
      var item = this.data[pos];

      while (pos < half) {
        var left = (pos << 1) + 1;
        var best = this.data[left];
        var right = left + 1;

        if (right < this.length && this.compare(this.data[right], best) < 0) {
          left = right;
          best = this.data[right];
        }

        if (this.compare(best, item) >= 0) break;
        this.data[pos] = best;
        pos = left;
      }

      this.data[pos] = item;
    }
  }]);

  return Queue;
}();

var TrainingPool =
/*#__PURE__*/
function () {
  function TrainingPool(unlearned, learned, d, type, store, stats) {
    _classCallCheck(this, TrainingPool);

    this.unlearned = unlearned;
    this.learned = learned;
    this.d = d;
    this.type = type;
    this.store = store;
    this.stats = stats;
  }

  _createClass(TrainingPool, [{
    key: "size",
    value: function size() {
      return this.learned.length;
    }
  }, {
    key: "next",
    value: function next() {
      var _this = this;

      var now = +new Date();

      var backfill = function backfill() {
        if (!_this.unlearned.length) return undefined;
        return {
          k: _this.unlearned.pop(),
          e: 2.5,
          c: 0,
          n: 0,
          d: 0,
          p: 0
        };
      };

      var next = this.learned.pop();

      if (next) {
        if (next.d > now) {
          var fill = backfill();

          if (fill) {
            this.learned.push(next);
            next = fill;
          }
        }
      } else {
        next = backfill();
      }

      if (!next) throw new RangeError();
      var key = next.k;
      var anagrams = this.stats.anagrams(key, this.type);
      var group = anagrams.words;

      var restore = function restore() {
        return _this.learned.push(next);
      };

      var update = function update(q) {
        next = adjust(next, q, now);
        restore();
        return _this.store.set('data', _this.learned.data);
      };

      var random = new random_1.Random(next.n);

      for (var i = 0; i < 10; i++) {
        key = random.shuffle(key.split('')).join('');
        if (!group.includes(key)) break;
      }

      return {
        label: key,
        group: dict_1.order(group),
        update: update,
        restore: restore
      };
    }
  }], [{
    key: "create",
    value: function create(stats, dice, type, store, min) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        var d, learned, queued, stored, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, s, raw, k, w, unlearned;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                d = dice.toLowerCase()[0];
                learned = new Queue([], function (a, b) {
                  return a.d - b.d;
                });
                queued = new Set();
                _context.next = 5;
                return store.get('data');

              case 5:
                stored = _context.sent;

                if (!stored) {
                  _context.next = 28;
                  break;
                }

                learned.data = stored;
                learned.length = stored.length;
                _iteratorNormalCompletion = true;
                _didIteratorError = false;
                _iteratorError = undefined;
                _context.prev = 12;

                for (_iterator = stored[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                  s = _step.value;
                  queued.add(s.k);
                }

                _context.next = 20;
                break;

              case 16:
                _context.prev = 16;
                _context.t0 = _context["catch"](12);
                _didIteratorError = true;
                _iteratorError = _context.t0;

              case 20:
                _context.prev = 20;
                _context.prev = 21;

                if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                  _iterator["return"]();
                }

              case 23:
                _context.prev = 23;

                if (!_didIteratorError) {
                  _context.next = 26;
                  break;
                }

                throw _iteratorError;

              case 26:
                return _context.finish(23);

              case 27:
                return _context.finish(20);

              case 28:
                raw = [];

                for (k in stats.mixed) {
                  if (!queued.has(k)) {
                    w = stats.anagrams(k, type, min)[d] || 0;
                    if (w) raw.push({
                      k: k,
                      w: w
                    });
                  }
                }

                raw.sort(function (a, b) {
                  return a.w - b.w;
                });
                unlearned = raw.map(function (e) {
                  return e.k;
                });
                return _context.abrupt("return", new TrainingPool(unlearned, learned, d, type, store, stats));

              case 33:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, null, [[12, 16, 20, 28], [21,, 23, 27]]);
      }));
    }
  }]);

  return TrainingPool;
}();

exports.TrainingPool = TrainingPool;

function adjust(v, q, now) {
  var mod = -0.8 + 0.28 * q - 0.02 * q * q;
  if (mod < 0) mod *= Math.min(Math.pow(2, v.n + 1) * 2.5, 100) / 100;
  var min = 1.3;

  if (q >= 3) {
    var bonus = v.d ? Math.min(2, (v.d - v.p) / DAY / (v.c ? PERIOD : 1)) : 1;
    v.c++;
    v.e = Math.max(min, v.e + mod * bonus);
    v.d = now + DAY * PERIOD * Math.pow(v.e, v.c - 1) * bonus;
  } else {
    v.c = 0;
    v.e = Math.max(min, v.e + mod);
    v.d = now + DAY;
  }

  v.n++;
  v.p = now;
  return v;
}
},{"./dict":"src/dict.ts","./random":"src/random.ts"}],"src/ui/training.ts":[function(require,module,exports) {
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var global_1 = require("./global");

var ui_1 = require("./ui");

var training_1 = require("../training");

var store_1 = require("../store");

var TrainingView =
/*#__PURE__*/
function () {
  function TrainingView() {
    _classCallCheck(this, TrainingView);

    this.content = null;
    this.restore = null;
  }

  _createClass(TrainingView, [{
    key: "toJSON",
    value: function toJSON() {}
  }, {
    key: "attach",
    value: function attach() {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        var store;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return Promise.all([global_1.global.LOADED.TRAINING, global_1.global.LOADED.DICT, global_1.global.LOADED.STATS()]);

              case 2:
                if (!(!this.pool || this.pool.type !== global_1.global.SETTINGS.dict)) {
                  _context.next = 7;
                  break;
                }

                store = new store_1.Store('training', global_1.global.SETTINGS.dict);
                _context.next = 6;
                return training_1.TrainingPool.create(global_1.global.STATS, global_1.global.SETTINGS.dice, global_1.global.SETTINGS.dict, store, global_1.global.SETTINGS.min);

              case 6:
                this.pool = _context.sent;

              case 7:
                this.train = ui_1.UI.createElementWithId('div', 'train');
                this.next();
                return _context.abrupt("return", this.train);

              case 10:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));
    }
  }, {
    key: "detach",
    value: function detach() {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2() {
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                if (!this.restore) {
                  _context2.next = 3;
                  break;
                }

                _context2.next = 3;
                return this.restore();

              case 3:
                this.content = null;
                return _context2.abrupt("return", this.train);

              case 5:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));
    }
  }, {
    key: "next",
    value: function next() {
      var content = ui_1.UI.createElementWithId('div', 'content');
      var progress = ui_1.UI.createElementWithId('div', 'progress');
      progress.textContent = String(this.pool.size());

      var _this$pool$next = this.pool.next(),
          label = _this$pool$next.label,
          group = _this$pool$next.group,
          update = _this$pool$next.update,
          restore = _this$pool$next.restore;

      this.restore = restore;
      var trainWord = document.createElement('div');
      trainWord.classList.add('word');
      trainWord.textContent = label;
      var sizeHint = ui_1.UI.createElementWithId('div', 'sizeHint');
      sizeHint.classList.add('hidden');
      sizeHint.textContent = String(group.length);
      var rating = this.createRatingToggles(update);
      var table = document.createElement('table');
      table.classList.add('results', 'hidden');
      ui_1.UI.addAnagramRows(table, group);
      progress.addEventListener('mouseup', function () {
        return ui_1.UI.toggleView('Review', progress.textContent);
      });
      progress.addEventListener('long-press', function () {
        if (!rating.classList.contains('hidden')) return;
        sizeHint.classList.remove('hidden');
      });
      progress.addEventListener('long-press-up', function () {
        return sizeHint.classList.add('hidden');
      });
      var back = ui_1.UI.createBackButton(function () {
        return ui_1.UI.toggleView('Menu');
      });
      content.appendChild(ui_1.UI.createTopbar(back, null, progress));
      var wrapper = document.createElement('div');
      wrapper.classList.add('wrapper');
      wrapper.appendChild(trainWord);
      wrapper.appendChild(table);
      content.appendChild(wrapper);
      content.appendChild(sizeHint);
      content.appendChild(rating);

      var listener = function listener(e) {
        if (![back, progress].includes(e.target)) {
          content.removeEventListener('click', listener);
          trainWord.classList.add('hidden');
          table.classList.remove('hidden');
          rating.classList.remove('hidden');
        }
      };

      content.addEventListener('click', listener);
      if (this.content) this.train.removeChild(this.content);
      this.train.appendChild(content);
      this.content = content;
    }
  }, {
    key: "createRatingToggles",
    value: function createRatingToggles(update) {
      var _this = this;

      var toggles = document.createElement('div');
      toggles.setAttribute('id', 'rating');
      toggles.classList.add('toggle-group');
      toggles.classList.add('horizontal');
      toggles.classList.add('hidden');

      var _loop = function _loop(i) {
        var toggle = document.createElement('button');
        toggle.setAttribute('id', "rating".concat(i));
        toggle.setAttribute('type', 'button');
        toggle.classList.add('toggle');
        toggle.textContent = String(i);
        toggles.appendChild(toggle);
        toggle.addEventListener('click', function () {
          return __awaiter(_this, void 0, void 0,
          /*#__PURE__*/
          regeneratorRuntime.mark(function _callee3() {
            return regeneratorRuntime.wrap(function _callee3$(_context3) {
              while (1) {
                switch (_context3.prev = _context3.next) {
                  case 0:
                    _context3.next = 2;
                    return update(Number(toggle.textContent));

                  case 2:
                    this.restore = null;
                    this.next();

                  case 4:
                  case "end":
                    return _context3.stop();
                }
              }
            }, _callee3, this);
          }));
        });
      };

      for (var i = 0; i < 6; i++) {
        _loop(i);
      }

      return toggles;
    }
  }]);

  return TrainingView;
}();

exports.TrainingView = TrainingView;
},{"./global":"src/ui/global.ts","./ui":"src/ui/ui.ts","../training":"src/training.ts","../store":"src/store.ts"}],"src/ui/ui.ts":[function(require,module,exports) {
"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function (resolve) {
      resolve(value);
    });
  }

  return new (P || (P = Promise))(function (resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }

    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }

    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }

    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};

Object.defineProperty(exports, "__esModule", {
  value: true
});

var global_1 = require("./global");

var game_1 = require("../game");

var random_1 = require("../random");

var dict_1 = require("../dict");

var board_1 = require("./board");

var define_1 = require("./define");

var menu_1 = require("./menu");

var review_1 = require("./review");

var settings_1 = require("./settings");

var stats_1 = require("./stats");

var training_1 = require("./training");

var Loader =
/*#__PURE__*/
function () {
  function Loader() {
    _classCallCheck(this, Loader);
  }

  _createClass(Loader, [{
    key: "attach",
    value: function attach() {
      this.loader = exports.UI.createElementWithId('div', 'loader');
      var spinner = exports.UI.createElementWithId('div', 'spinner');
      this.loader.appendChild(spinner);
      return this.loader;
    }
  }, {
    key: "detach",
    value: function detach() {
      return this.loader;
    }
  }]);

  return Loader;
}();

exports.UI = new (
/*#__PURE__*/
function () {
  function _class() {
    _classCallCheck(this, _class);
  }

  _createClass(_class, [{
    key: "create",
    value: function create() {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        var _this = this;

        var state, VIEWS, views, _i, _Object$entries, _Object$entries$_i, type, view;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                setTimeout(function () {
                  return window.scrollTo(0, 1);
                }, 0);

                if (global_1.global.SETTINGS.theme !== undefined) {
                  this.setTheme(global_1.global.SETTINGS.theme);
                } else {
                  this.setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Dark' : 'Light');
                }

                this.root = document.getElementById('display');
                state = JSON.parse(localStorage.getItem('state'));
                this.current = state ? state.current : 'Menu';
                this.previous = state ? state.previous : 'Menu';
                this.loader = new Loader();
                VIEWS = {
                  Menu: menu_1.MenuView,
                  Board: board_1.BoardView,
                  Training: training_1.TrainingView,
                  Review: review_1.ReviewView,
                  Define: define_1.DefineView,
                  Stats: stats_1.StatsView,
                  Settings: settings_1.SettingsView
                };
                views = state ? state.views : {};
                this.Views = {};

                for (_i = 0, _Object$entries = Object.entries(VIEWS); _i < _Object$entries.length; _i++) {
                  _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2), type = _Object$entries$_i[0], view = _Object$entries$_i[1];
                  this.Views[type] = new view(views[type]);
                }

                _context.next = 13;
                return this.setup();

              case 13:
                this.BACK = document.createElement('img');
                this.BACK.src = document.getElementById('svg').src;
                this.BACK.height = 20;
                document.addEventListener('keydown', function (e) {
                  return _this.onKeyDown(e);
                });
                document.addEventListener('swiped-left', function () {
                  return _this.toggleView('Define');
                });
                document.addEventListener('swiped-right', function () {
                  return _this.toggleView('Define');
                });
                window.addEventListener('hashchange', function () {
                  return _this.onHashChange();
                });
                window.addEventListener('beforeunload', function () {
                  return _this.persist();
                });
                _context.next = 23;
                return this.attachView(this.current);

              case 23:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));
    }
  }, {
    key: "persist",
    value: function persist() {
      var previous = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var state = JSON.parse(localStorage.getItem('state')) || {};
      state.current = this.current;
      state.previous = this.previous;
      state.views = state.views || {};
      state.views[this.current] = this.Views[this.current];
      if (previous) state.views[this.previous] = this.Views[this.previous];
      localStorage.setItem('state', JSON.stringify(state));
    }
  }, {
    key: "attachView",
    value: function attachView(view, data) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2() {
        var v, attached;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                this.root.appendChild(this.loader.attach());
                v = this.Views[view];
                _context2.next = 4;
                return v.attach(data);

              case 4:
                attached = _context2.sent;
                this.root.removeChild(this.loader.detach());
                this.root.appendChild(attached);
                if (v.afterAttach) v.afterAttach();

              case 8:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));
    }
  }, {
    key: "detachView",
    value: function detachView(view, next) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee3() {
        return regeneratorRuntime.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.t0 = this.root;
                _context3.next = 3;
                return this.Views[view].detach(next);

              case 3:
                _context3.t1 = _context3.sent;

                _context3.t0.removeChild.call(_context3.t0, _context3.t1);

              case 5:
              case "end":
                return _context3.stop();
            }
          }
        }, _callee3, this);
      }));
    }
  }, {
    key: "toggleView",
    value: function toggleView(view, data) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee4() {
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                if (!(this.current === view)) {
                  _context4.next = 9;
                  break;
                }

                _context4.next = 3;
                return this.detachView(view, this.previous);

              case 3:
                this.current = this.previous;
                this.previous = view;
                _context4.next = 7;
                return this.attachView(this.current, data);

              case 7:
                _context4.next = 15;
                break;

              case 9:
                _context4.next = 11;
                return this.detachView(this.current, view);

              case 11:
                this.previous = this.current;
                this.current = view;
                _context4.next = 15;
                return this.attachView(view, data);

              case 15:
                this.persist(true);

              case 16:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));
    }
  }, {
    key: "setup",
    value: function setup() {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee6() {
        var _this2 = this;

        var setupFromHistory, hash, existing, _game_1$Game$decodeID3, _game_1$Game$decodeID4, settings, seed, _game_1$Game$decodeID5, _game_1$Game$decodeID6, _settings, _seed;

        return regeneratorRuntime.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                setupFromHistory = function setupFromHistory() {
                  return __awaiter(_this2, void 0, void 0,
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee5() {
                    var id, _game_1$Game$decodeID, _game_1$Game$decodeID2, settings, rand;

                    return regeneratorRuntime.wrap(function _callee5$(_context5) {
                      while (1) {
                        switch (_context5.prev = _context5.next) {
                          case 0:
                            _context5.next = 2;
                            return global_1.global.LOADED.HISTORY;

                          case 2:
                            if (global_1.global.HISTORY.length) {
                              id = global_1.global.HISTORY[global_1.global.HISTORY.length - 1].seed;
                              _game_1$Game$decodeID = game_1.Game.decodeID(id), _game_1$Game$decodeID2 = _slicedToArray(_game_1$Game$decodeID, 1), settings = _game_1$Game$decodeID2[0];
                              rand = new random_1.Random();
                              rand.seed = global_1.global.SEED;
                              rand.next();
                              console.log('setup from history');
                              this.updateSettings(settings, rand.seed);
                            }

                          case 3:
                          case "end":
                            return _context5.stop();
                        }
                      }
                    }, _callee5, this);
                  }));
                };

                hash = document.location.hash && document.location.hash.slice(1);

                if (hash) {
                  _context6.next = 13;
                  break;
                }

                existing = this.Views.Board.game;

                if (!existing) {
                  _context6.next = 10;
                  break;
                }

                _game_1$Game$decodeID3 = game_1.Game.decodeID(existing.seed), _game_1$Game$decodeID4 = _slicedToArray(_game_1$Game$decodeID3, 2), settings = _game_1$Game$decodeID4[0], seed = _game_1$Game$decodeID4[1];
                console.log('existing');
                this.updateSettings(settings, seed);
                _context6.next = 11;
                break;

              case 10:
                return _context6.abrupt("return", setupFromHistory());

              case 11:
                _context6.next = 18;
                break;

              case 13:
                _game_1$Game$decodeID5 = game_1.Game.decodeID(hash), _game_1$Game$decodeID6 = _slicedToArray(_game_1$Game$decodeID5, 2), _settings = _game_1$Game$decodeID6[0], _seed = _game_1$Game$decodeID6[1];

                if (this.valid(_settings, _seed)) {
                  _context6.next = 16;
                  break;
                }

                return _context6.abrupt("return", setupFromHistory());

              case 16:
                console.log('url');
                this.updateSettings(_settings, _seed);

              case 18:
              case "end":
                return _context6.stop();
            }
          }
        }, _callee6, this);
      }));
    }
  }, {
    key: "onKeyDown",
    value: function onKeyDown(e) {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee7() {
        var key, currentView;
        return regeneratorRuntime.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                key = e.keyCode;
                currentView = this.Views[this.current];

                if (!(key === 191 && e.shiftKey)) {
                  _context7.next = 8;
                  break;
                }

                e.preventDefault();
                _context7.next = 6;
                return this.toggleView('Define');

              case 6:
                _context7.next = 11;
                break;

              case 8:
                if (!('onKeyDown' in currentView)) {
                  _context7.next = 11;
                  break;
                }

                _context7.next = 11;
                return currentView.onKeyDown(e);

              case 11:
              case "end":
                return _context7.stop();
            }
          }
        }, _callee7, this);
      }));
    }
  }, {
    key: "onHashChange",
    value: function onHashChange() {
      return __awaiter(this, void 0, void 0,
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee8() {
        var _game_1$Game$decodeID7, _game_1$Game$decodeID8, settings, seed, refresh, s;

        return regeneratorRuntime.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                if (document.location.hash) {
                  _context8.next = 2;
                  break;
                }

                return _context8.abrupt("return");

              case 2:
                _game_1$Game$decodeID7 = game_1.Game.decodeID(document.location.hash.slice(1)), _game_1$Game$decodeID8 = _slicedToArray(_game_1$Game$decodeID7, 2), settings = _game_1$Game$decodeID8[0], seed = _game_1$Game$decodeID8[1];

                if (this.valid(settings, seed)) {
                  _context8.next = 5;
                  break;
                }

                return _context8.abrupt("return");

              case 5:
                refresh = seed !== global_1.global.SEED;

                if (!refresh) {
                  s = Object.assign({}, global_1.global.SETTINGS);
                  refresh = s.dice !== settings.dice || s.min !== settings.min || s.dict !== settings.dict;
                }

                this.updateSettings(settings, seed, false);

                if (!(this.current === 'Settings')) {
                  _context8.next = 12;
                  break;
                }

                this.Views[this.current].update();
                _context8.next = 14;
                break;

              case 12:
                if (!(refresh && this.current === 'Play')) {
                  _context8.next = 14;
                  break;
                }

                return _context8.abrupt("return", this.Views[this.current].refresh({
                  allowDupes: true
                }));

              case 14:
              case "end":
                return _context8.stop();
            }
          }
        }, _callee8, this);
      }));
    }
  }, {
    key: "valid",
    value: function valid(settings, seed) {
      return !isNaN(seed) && !(settings.dice && settings.dict && settings.min);
    }
  }, {
    key: "updateSettings",
    value: function updateSettings(settings, seed) {
      var dom = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
      console.log('UPDATE', {
        settings: settings,
        seed: seed
      });
      Object.assign(global_1.global.SETTINGS, settings);
      localStorage.setItem('settings', JSON.stringify(global_1.global.SETTINGS));
      if (seed) global_1.global.SEED = seed;
      var id = game_1.Game.encodeID(global_1.global.SETTINGS, global_1.global.SEED);
      window.history.replaceState(null, '', "#".concat(id));

      if (dom && this.current === 'Settings') {
        var view = this.Views[this.current];
        view.seed.textContent = id;
        view.seed.classList.remove('error');
      }
    }
  }, {
    key: "createElementWithId",
    value: function createElementWithId(type, id) {
      var element = document.createElement(type);
      element.setAttribute('id', id);
      return element;
    }
  }, {
    key: "createTopbar",
    value: function createTopbar(left, center, right) {
      var topbar = this.createElementWithId('header', 'topbar');
      topbar.appendChild(left || document.createElement('div'));
      topbar.appendChild(center || document.createElement('div'));
      topbar.appendChild(right || document.createElement('div'));
      return topbar;
    }
  }, {
    key: "createBackButton",
    value: function createBackButton(fn) {
      var back = this.createElementWithId('div', 'back');
      back.appendChild(this.BACK);
      back.addEventListener('mouseup', fn);
      return back;
    }
  }, {
    key: "focusContentEditable",
    value: function focusContentEditable(element) {
      element.focus();
      document.execCommand('selectAll', false);
      var sel = document.getSelection();
      if (sel && !sel.isCollapsed) sel.collapseToEnd();
    }
  }, {
    key: "permaFocus",
    value: function permaFocus(element) {
      var _this3 = this;

      element.addEventListener('blur', function () {
        return setTimeout(function () {
          return _this3.focusContentEditable(element);
        }, 20);
      });
      this.focusContentEditable(element);
    }
  }, {
    key: "setTheme",
    value: function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme.toLowerCase());
    }
  }, {
    key: "addAnagramRows",
    value: function addAnagramRows(table, group) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = group[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var r = _step.value;
          var w = r.replace(/[^A-Z]/, '');
          var tr = document.createElement('tr');
          var grade = global_1.global.STATS.stats(w, global_1.global.SETTINGS.dice, global_1.global.SETTINGS.dict).grade;
          if (grade < global_1.global.SETTINGS.grade) tr.classList.add('hard');
          var td = document.createElement('td');
          var b = document.createElement('b');
          var s = r.startsWith('(') ? "".concat(r, "\xA0") : r.endsWith(')') ? "\xA0".concat(r) : "\xA0".concat(r, "\xA0");
          b.textContent = "\xA0".concat(s, "\xA0");
          td.appendChild(b);
          tr.appendChild(td);
          td = document.createElement('td');
          td.textContent = dict_1.define(w, global_1.global.DICT);
          tr.appendChild(td);
          table.appendChild(tr);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator["return"] != null) {
            _iterator["return"]();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    }
  }, {
    key: "createRadios",
    value: function createRadios(id, values, listener) {
      var radios = this.createElementWithId('span', id);
      radios.classList.add('toggle-group');
      radios.classList.add('horizontal');
      radios.setAttribute('role', 'radiogroup');
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = values[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var val = _step2.value;
          var checked = false;

          if (Array.isArray(val)) {
            checked = true;
            val = val[0];
          }

          var radio = this.createElementWithId('input', "".concat(id).concat(val));
          radio.classList.add('hide');
          radio.setAttribute('type', 'radio');
          radio.setAttribute('name', id);
          radio.setAttribute('value', val);
          if (checked) radio.setAttribute('checked', 'checked');
          var label = document.createElement('label');
          label.classList.add('toggle');
          label.setAttribute('for', "".concat(id).concat(val));
          label.textContent = val.toUpperCase();
          radio.addEventListener('click', listener.bind(radio));
          radios.appendChild(radio);
          radios.appendChild(label);
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
            _iterator2["return"]();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return radios;
    }
  }]);

  return _class;
}())();
},{"./global":"src/ui/global.ts","../game":"src/game.ts","../random":"src/random.ts","../dict":"src/dict.ts","./board":"src/ui/board.ts","./define":"src/ui/define.ts","./menu":"src/ui/menu.ts","./review":"src/ui/review.ts","./settings":"src/ui/settings.ts","./stats":"src/ui/stats.ts","./training":"src/ui/training.ts"}],"src/index.ts":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

require("regenerator-runtime/runtime");

var ui_1 = require("./ui/ui");

ui_1.UI.create();
},{"regenerator-runtime/runtime":"node_modules/regenerator-runtime/runtime.js","./ui/ui":"src/ui/ui.ts"}],"node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "62006" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else if (location.reload) {
        // `location` global exists in a web worker context but lacks `.reload()` function.
        location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["node_modules/parcel-bundler/src/builtins/hmr-runtime.js","src/index.ts"], null)
//# sourceMappingURL=/src.f10117fe.js.map