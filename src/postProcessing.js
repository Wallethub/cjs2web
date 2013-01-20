'use strict';

var processOutput = function(modules, options) {
    var output = modules;
    if (options.combine) {
        output = combine(output);
        if (options.iife) {
            output = wrapInIife(output);
        }
    }
    return output;
};

var combine = function(modules) {
    return modules.reduce(function(s, x) { return s + x.code + '\n'; }, '');
};

var wrapInIife = function(code) {
    return '(function() {\n' + code + '}());';
};

exports.processOutput = processOutput;