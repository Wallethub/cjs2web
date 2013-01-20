var path = require('path');
var Q = require('Q');

var fileUtil = require('./fileUtils');
var postProcessing = require('./postProcessing');

var transform = function(filename, options) {
    options = completeOptions(options);
    var deferred = Q.defer();
    var modules = [], modulesToProcess = [getModuleName(filename, options.basePath)], modulesProcessed = [];
    var transformFilesRecursively = function() {
        var currentModule = modulesToProcess.shift();
        var whenTransformedNextFile = transformSingleFile(currentModule, options);
        whenTransformedNextFile.then(function(module) {
            modules.unshift(module);
            modulesProcessed.push(currentModule);
            var dependentFilesToProcess = module.dependencies.filter(function(name) {
                return modulesProcessed.concat(modulesToProcess).indexOf(name) == -1;
            });
            modulesToProcess = modulesToProcess.concat(dependentFilesToProcess);
            if (modulesToProcess.length > 0) {
                transformFilesRecursively();
            }
            else {
                var result = postProcessing.processOutput(modules, options);
                deferred.resolve(result);
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

var transformSingleFile = function(moduleName, options) {
    var filename = path.join(options.basePath, moduleName) + '.js';
    var fileTransformed = fileUtil.readFile(filename).then(function(content) {
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
    var variableDefinitions = exportsRegex.test(module.code) ? codeTemplates.exportsDefinition : '';
    module.code = 'var ' + objectName + ' = ' +
        codeTemplates.wrapperStart +
        variableDefinitions +
        module.code + '\n' +
        codeTemplates.returnValue +
        codeTemplates.wrapperEnd;
};

var getModuleName = function(filename, basePath) {
    var moduleName = unifySlashes(filename);
    if (basePath) {
        moduleName = moduleName.replace(new RegExp('^' + unifySlashes(basePath)), '');
    }
    moduleName = moduleName.replace(/^\.?\//, '');
    moduleName = fileUtil.withoutFileExtension(moduleName);
    return moduleName;
};

var getSafeObjectName = function(moduleName, prefix) {
    return prefix + moduleName.replace(/\//g, '_');
};

var unifySlashes = function(input) {
    return input.replace(/\\/g, '/');
};

var codeTemplates = {
    wrapperStart: '(function(module) {\n',
    exportsDefinition: 'var exports = module.exports;\n',
    returnValue: 'return module.exports;\n',
    wrapperEnd: '}({exports: {}}));'
};

var requireRegex = /require\s*\(\s*(('(.*?)')|("(.*?)"))\s*\)/g;
var exportsRegex = /exports(\.|\[).*/i;

exports.transform = transform;