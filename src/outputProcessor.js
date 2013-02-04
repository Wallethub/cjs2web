var process = function(modules, options) {
    if (!options.combine) {
        return modules;
    }
    var result = combineModulesToSingleScript(modules, options);
    if (options.iife) {
        result = wrapInFunctionExpression(result);
    }
    return result;
};

var combineModulesToSingleScript = function(modules, options) {
    return modules.reduce(function(seed, module) {
        var code = module.main && options.iife ? removeVariableAssignment(module.code) : module.code;
        return seed + code + '\n';
    }, '');
};

var removeVariableAssignment = function(code) {
    return code.replace(/^var\s*.*?\s*=\s*/, '')
};

var wrapInFunctionExpression = function(code) {
    return '(function() {\n' + code + '\n}());';
};

exports.process = process;