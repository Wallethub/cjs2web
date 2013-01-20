# cjs2web [![Build Status](https://travis-ci.org/alexlawrence/cjs2web.png?branch=master)](undefined)

Transform CommonJS modules to a web browser suitable format with minimal code overhead.

## Motivation

There are many existing tools to transform CommonJS modules to a browser format (examples: [BrowserBuild](https://github.com/LearnBoost/browserbuild), [Browserfiy](https://github.com/substack/node-browserify), [OneJS](https://github.com/azer/onejs), [modulr](https://github.com/tobie/modulr-node), [stitch](https://github.com/sstephenson/stitch)).

Most of these tools emulate the CommonJS environment in the browser and provide features like client side versions of native node.js modules and the __require()__ function.

However if you only want to use the basic CommonJS syntax and don´t need any
extra features using one of the above will bloat your project´s effective code size.

## Features

cjs2web transforms a CommonJS module including all its dependencies to a single script creating objects using the [Module Pattern](http://www.adequatelygood.com/2010/3/JavaScript-Module-Pattern-In-Depth).
It does **not** provide any CommonJS compliant environment for the browser.

Supported features:

* __require()__ing local modules
* Using __exports__
* Using __module.exports__

Unsupported features:

* __require()__ing third party modules
* __this__ does not refer to  module.exports
* No __process__ variable
* No __global__ variable
* No client side __require()__ function


## Usage

Basic command line usage:

```node cjs2web ./src/index.js > browser.js```

Code usage:

```javascript
var cjs2web = require('cjs2web');

cjs2web.transform('./src/index.js').then(function(modules) {
  // do something
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