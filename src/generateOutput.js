'use strict';

var generateOutput = function(modules, options) {
    var output = modules;
    if (options.combine) {
        output = combineModulesToSingleScript(output);
        if (options.iife) return wrapScriptInFunctionExpression(output);
    }
    return output;
};

var combineModulesToSingleScript = function(modules) {
    return modules.reduce(function(s, x) { return s + x.code + '\n'; }, '');
};

var wrapScriptInFunctionExpression = function(code) {
    return '(function() {\n' + code + '}());';
};

module.exports = generateOutput;