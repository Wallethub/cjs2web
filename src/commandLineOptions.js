var optimist = require('optimist');

var options = optimist
    .usage('Usage: $0 <main file>')
    .demand([1])
    .options('b', {
        alias: 'basePath',
        describe: 'base path to exclude from generated object names',
        string: true
    })
    .options('p', {
        alias: 'prefix',
        describe: 'prefix to add to the generated object names'
    })
    .options('i', {
        alias: 'iife',
        describe: 'wrap code in an immediately invoked function expression'
    })
    .argv;

module.exports = options;