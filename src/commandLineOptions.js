
'use strict';
var optimist = require('optimist');

var options = optimist
    .usage('Transform CommonJS modules for the web.\nUsage: $0 <entry file>')
    .demand([1])
    .options('b', {
        alias: 'basePath',
        describe: 'base path to exclude from generated object names',
        string: true
    })
    .options('p', {
        alias: 'prefix',
        describe: 'prefix to add to the generated object names',
        boolean: true
    })
    .options('c', {
        alias: 'combine',
        describe: 'combines all transformed modules to one script output',
        boolean: true
    })
    .options('i', {
        alias: 'iife',
        describe: 'wrap code in an immediately invoked function expression',
        boolean: true
    })
    .check(function(options) {
        if (options.iife && !options.combine) {
            throw new Error('iife option cannot be used without combine option')
        }
    })
    .argv;

module.exports = options;