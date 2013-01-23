# cjs2web [![Build Status](https://travis-ci.org/alexlawrence/cjs2web.png?branch=master)](undefined)

Transform CommonJS modules to a web browser suitable format with minimal code overhead.

## Motivation

There are many existing tools to transform CommonJS modules to a browser format
(examples: [BrowserBuild](https://github.com/LearnBoost/browserbuild),
[Browserfiy](https://github.com/substack/node-browserify),
[OneJS](https://github.com/azer/onejs),
[modulr](https://github.com/tobie/modulr-node),
[stitch](https://github.com/sstephenson/stitch)).
Most of the them emulate the CommonJS environment and provide features
like client side versions of native node.js modules and `require()`.

However if you only want to use the basic CommonJS syntax
such tools unnecessarily bloat your project´s effective code size.

## Features

cjs2web transforms a CommonJS module and all its dependencies to a single script for the browser
using the [Module Pattern](http://www.adequatelygood.com/2010/3/JavaScript-Module-Pattern-In-Depth).
This results in code which contains almost no overhead and can also be minified very well.

**Supported features**:

* Using `require()` for local modules
* Assigning members to `exports`
* Assigning values to `module.exports`

**Unsupported features** (now and probably in the future):

* Using `require()` for third party modules
* Using `require()` for files which do not have a "js" extension
* `this` refers to window, not to `module.exports`
* `process` does not exist
* `global` does not exist
* Client side `require()` does not exist

**Roadmap for future features**:

* Support to use `require()` for browser globals such *window* and *document*

## Installation

```
npm install cjs2web -g
```

## Usage

### Command line usage

For most projects the command line usage should be sufficient.

```
cjs2web <filename>

Options:
  -b, --basePath  base path to exclude from generated object names                 [string]
  -p, --prefix    prefix to add to the generated object names                      [string]
  -c, --combine   combines all transformed modules to one script output            [boolean]
  -i, --iife      wrap code in an immediately invoked function expression          [boolean]
  -o, --output    filename to write the generated output to                        [string]
  -w, --watch     watch transformed files for change and automatically re-execute  [boolean]
```

#### Combining and IIFE

Normally you will want to enable the *combine* option.
Otherwise the transformation output will not be a string of code but raw module data.
The *iife* option wraps your code to reduce global variables and
can only be enabled in combination with *combine*.

#### Prefix

The *prefix* option is very important. Consider the following example:

```javascript
// == index.js ==
var helper = require('./helper');
helper.doSomething();
// == helper.js ==
exports.doSomething = function() { /*...*/ };
```

Without providing a *prefix* the transformation of the above would result in:

```javascript
var helper = (function(module) {
    var exports = module.exports;
    exports.doSomething = function() { /*...*/ };
    return module.exports;
}({exports: {}});
var index = (function(module) {
    var helper = helper; // THIS WILL NOT WORK AS EXPECTED
    helper.doSomething();
    return module.exports;
}({exports: {}});
```

The helper variable inside the *index* object hides the variable from the outer scope
and therefore results in assigning the value of the local variable to itself (which is *undefined*).

**Recommendation**: Always use a distinct and non conflicting prefix such as ***module_*** or ***cjs_***.

#### Output

When an *output* name is provided the result is written to the disk and not to the standard output.

#### Watch

The *watch* option causes cjs2web to watch the main module and all its dependencies and
re-execute the transformation whenever one of these files changes.

### Code usage

The `transform` function accepts the filename and an optional options object.
Option names are the same as the explicit parameter names of the command line tool.
The return value is a Deferred object.

```javascript
var cjs2web = require('cjs2web');

cjs2web.transform(filename, options).then(function(result) {
  // do something with result
});
```

## Transformation example

CommonJS code:

```javascript
// src/index.js
var two = require('./numbers/two');
var three = require('./numbers/three');
var sum = require('./calculation/sum');
console.log(sum(two, three));
// src/numbers/two.js
module.exports = 2;
// src/numbers/three.js
module.exports = 3;
// src/calculation/sum.js
module.exports = function(a, b) { return a + b; };
```

Transformation call:

```
node cjs2web ./src/index.js --basePath ./src --prefix cjs_ --combine --iife
```

Transformation result:

```javascript
(function(){
var cjs_numbers_two = (function(module) {
    module.exports = 2;
    return module.exports;
}({exports: {}}));

var cjs_numbers_three = (function(module) {
    module.exports = 3;
    return module.exports;
}({exports: {}}));

var cjs_calculation_sum = (function(module) {
    module.exports = function(a, b) { return a + b; };
    return module.exports;
}({exports: {}}));

var index = (function(module) {
    var two = cjs_numbers_two;
    var three = cjs_numbers_three;
    var sum = cjs_calculation_sum;
    console.log(sum(cjs_numbers_two, cjs_numbers_three));
    return module.exports;
}({exports: {}}));
}());
```

Minified result using Closure Compiler with *Simple Optimizations*:

```javascript
(function(){var a={},a=function(a,b){return a+b};console.log(a(2,3))})();
```

Minified result using Closure Compiler with *Advanced Optimizations*:

```javascript
console.log(5);
```
