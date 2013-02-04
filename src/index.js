#!/usr/bin/env node
'use strict';

var transformer = require('./transformer');

if (require.main == module) {
    var options = require('./commandLineOptions.js');
    options.cli = true;
    var fileName = options._[0];
    if (fileName) {
        options.fileName = fileName;
        var transformed = transformer.transform(options);
        transformed.fail(function(error) {
            console.log(error);
        });
    }
}

module.exports = transformer;
