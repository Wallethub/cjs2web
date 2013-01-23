#!/usr/bin/env node
'use strict';

var transformer = require('./transformer');

if (require.main == module) {
    var options = require('./commandLineOptions.js');
    var filename = options._[0];
    if (filename) {
        transformer.transform(filename, options).then(function(output) {
            if (!options.output) {
                console.log(output);
            }
        });
    }
}

module.exports = transformer;
