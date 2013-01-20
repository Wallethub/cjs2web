'use strict';

var transformer = require('./transformer');

if (require.main == module) {
    var options = require('./commandLineOptions.js');
    var filename = options._[0];
    if (filename) {
        transformer.transform(filename, options).then(console.log);
    }
}

module.exports = transformer;