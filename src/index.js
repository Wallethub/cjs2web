#!/usr/bin/env node
'use strict';

var transformer = require('./transformer');

if (require.main == module) {
    var options = require('./commandLineOptions.js');
    options.cli = true;
    var filename = options._[0];
    if (filename) {
        var transformed = transformer.transform(filename, options);
        transformed.fail(function(error) {
            console.log(error);
        });
    }
}

module.exports = transformer;
