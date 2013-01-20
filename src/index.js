var path = require('path');
var Q = require('Q');

var fileUtil = require('./fileUtil');

var transform = function(filename, options) {
    options = completeOptions(options);
    var deferred = Q.defer();
    var modules = [], modulesToProcess = [getModuleName(filename, options.basePath)], modulesProcessed = [];
    var transformFilesRecursively = function() {
        var currentModule = modulesToProcess.shift();
        var whenTransformedNextFile = transformFile(currentModule, options);
        whenTransformedNextFile.then(function(module) {
            modules.unshift(module);
            modulesProcessed.push(currentModule);
            var dependentFilesToProcess = module.dependencies.filter(function(name) {
                return !inArray(modulesProcessed.concat(modulesToProcess), name);
            });
            modulesToProcess = modulesToProcess.concat(dependentFilesToProcess);
            if (modulesToProcess.length > 0) {
                transformFilesRecursively();
            }
            else {
                deferred.resolve(modules);
            }
        });
        whenTransformedNextFile.fail(deferred.reject);
    };
    transformFilesRecursively();
    return deferred.promise;
};

var completeOptions = function(options) {
    options = options || {};
    options.prefix = options.prefix != null ? options.prefix : '';
    options.basePath = options.basePath != null ? options.basePath : '';
    return options;
};

var transformFile = function(moduleName, options) {
    var fileTransformed = fileUtil.readFile(path.join(options.basePath, moduleName) + '.js').then(function(content) {
        var module = {name: moduleName, code: content};
        replaceAndLogDependencies(module, options);
        wrapModuleCode(module, options);
        return module;
    });
    return fileTransformed;
};

var replaceAndLogDependencies = function(module, options) {
    var folder = path.dirname(module.name);
    module.dependencies = module.dependencies || [];
    module.code = module.code.replace(requireRegex, function() {
        var moduleName = arguments[1].substring(1, arguments[1].length - 1);
        moduleName = getModuleName(path.normalize(path.join(folder, moduleName)), options.basePath);
        var objectName = getSafeObjectName(moduleName, options.prefix);
        if (objectName.indexOf('.') > -1) {
            throw new Error('cannot transform module id into object name: ', moduleName);
        }
        module.dependencies.push(moduleName);
        return objectName;
    });
};

var wrapModuleCode = function(module, options) {
    var objectName = getSafeObjectName(module.name, options.prefix);
    if (module.code != null) module.code += '\n';
    var variableDefinitions = exportsRegex.test(module.code) ? templates.exportsDefinition : '';
    module.code = 'var ' + objectName + ' = ' +
        templates.wrapperStart +
        variableDefinitions +
        module.code + '\n' +
        templates.returnValue +
        templates.wrapperEnd;
};

var getModuleName = function(filename, basePath) {
    var moduleName = normalizeSlashes(filename);
    if (basePath) {
        moduleName = moduleName.replace(new RegExp('^' + normalizeSlashes(basePath)), '');;
    }
    moduleName = moduleName.replace(/^\.?\//, '');
    moduleName = fileUtil.withoutFileExtension(moduleName);
    return moduleName;
};

var getSafeObjectName = function(moduleName, prefix) {
    return prefix + moduleName.replace(/\//g, '_');
};

var normalizeSlashes = function(input) {
    return input.replace(/\\/g, '/');
};

var inArray = function(array, value) {
    return array.indexOf(value) > -1;
};

var reduce = function(modules) {
    return modules.reduce(function(s, x) { return s + x.code + '\n'; }, '');
};

var templates = {
    wrapperStart: '(function(module) {\n',
    exportsDefinition: 'var exports = module.exports;\n',
    returnValue: 'return module.exports;\n',
    wrapperEnd: '}({exports: {}}));'
};

var requireRegex = /require\s*\(\s*(('(.*?)')|("(.*?)"))\s*\)/g;
var exportsRegex = /exports((\.[a-zA-Z_][a-zA-Z1-9_]*)|(\[.*?\]))/g;

exports.transform = transform;
exports.reduce = reduce;