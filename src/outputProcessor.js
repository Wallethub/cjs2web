var process = function(modules, options) {
    if (!options.combine) {
        return modules;
    }
    var result = combineModulesToSingleScript(modules);
    if (options.iife) {
        result = wrapScriptInFunctionExpression(result);
    }
    return result;
};

var combineModulesToSingleScript = function(modules) {
    return modules.reduce(function(s, x) { return s + x.code + '\n'; }, '');
};

var wrapScriptInFunctionExpression = function(code) {
    return '(function() {\n' + code + '}());';
};

exports.process = process;