# cjs2web [![Build Status](https://travis-ci.org/alexlawrence/cjs2web.png?branch=master)](undefined)

Transform CommonJS modules to a web browser suitable format with minimal code overhead.

## Motivation

There are many existing tools to transform CommonJS modules to a browser format
(examples: [BrowserBuild](https://github.com/LearnBoost/browserbuild),
[Browserfiy](https://github.com/substack/node-browserify),
[OneJS](https://github.com/azer/onejs),
[modulr](https://github.com/tobie/modulr-node),
[stitch](https://github.com/sstephenson/stitch)).
Most of these above emulate the CommonJS environment and provide features
such as client side versions of native node.js modules and the `require()` function.
However if you only want to use the basic CommonJS syntax this
would unnecessarily bloat your project´s effective code size.

## Features

cjs2web transforms a CommonJS module including all its dependencies to a single script for the browser.
Modules are transformed to objects using the [Module Pattern](http://www.adequatelygood.com/2010/3/JavaScript-Module-Pattern-In-Depth).

Supported:

* `require()`ing local modules
* Using `exports`
* Using `module.exports`

Unsupported (now and probably in the future):

* `require()`ing third party modules
* `this` does not refer to  module.exports
* No `process` variable
* No `global` variable
* No client side `require()` function

## Usage

### Command line usage

For most use cases the command line usage should be sufficient.

```
node cjs2web <filename>

Options:
  -b, --basePath  base path to exclude from generated object names         [string]
  -p, --prefix    prefix to add to the generated object names              [boolean]
  -c, --combine   combines all transformed modules to one script output    [boolean]
  -i, --iife      wrap code in an immediately invoked function expression  [boolean]
```

#### Combining and IIFE

Normally you will want to enable the **combine** option.
Otherwise the transformation output will not be a single script but raw format for further processing.
The **iife** can therefore only be enabled in combination with the **combine** option.

#### Prefix

The **prefix** option can be very important. Look at the following example:

```javascript
// index.js
var helper = require('./helper');
helper.doSomething();

// helper.js
exports.doSomething = function() { /*...*/ };
```

Without providing a prefix this would result in:

```javascript
var helper = (function(module) {
    var exports = module.exports;
    exports.doSomething = function() { /*...*/ };
    return module.exports;
}({exports: {}});

var index = (function(module) {
    var helper = helper; // this will not work as expected
    helper.doSomething();
    return module.exports;
}({exports: {}});
```

Recommendation: Always use a non conflicting prefix such as "__module_".

### Code usage

The `transform` function accepts the filename and an optional options object.
The return value is a Deferred object.

```javascript
var cjs2web = require('cjs2web');

cjs2web.transform(filename, options).then(function(result) {
  // do something with result
});
```

## Example

Source:

```javascript
// src/index.js
var two = require('./numbers/two');
var three = require('./numbers/three');
var sum = require('./calculation/sum');

alert(sum(two, three));

// src/numbers/two.js
module.exports = 2;

// src/numbers/three.js
module.exports = 3;

// src/calculation/sum.js
module.exports = function(a, b) { return a + b; };
```

Transformation:

```
node cjs2web ./src/index.js --basePath ./src --combine --iife
```

Result:

```javascript
(function(){
var numbers_two = (function(module) {
    module.exports = 2;
    return module.exports;
}({exports: {}}));

var numbers_three = (function(module) {
    module.exports = 3;
    return module.exports;
}({exports: {}}));

var calculation_sum = (function(module) {
    module.exports = function(a, b) { return a + b; };
    return module.exports;
}({exports: {}}));

var index = (function(module) {
    alert(calculation_sum(numbers_two, numbers_three));
    return module.exports;
}({exports: {}}));
}());
```

Minified result:

```javascript
(function(){var a={},a=function(a,b){return a+b};alert(a(2,3))})();
```