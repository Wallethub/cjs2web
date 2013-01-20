var path = require('path');
var Q = require('q');

var fileUtil = require('./fileUtils');

var transform = function(filename, options) {
    options = completeOptions(options);
    var deferred = Q.defer();
    var modules = [], modulesProcessed = [];
    var modulesToProcess = [getModuleName(filename, options.basePath)];
    var transformFilesRecursively = function() {
        var currentModule = modulesToProcess.shift();
        var transformedNextFile = transformSingleFile(currentModule, options);
        transformedNextFile.then(function(module) {
            modules.unshift(module);
            modulesProcessed.push(currentModule);
            var dependentFilesToProcess = module.dependencies.filter(function(name) {
                return modulesProcessed.concat(modulesToProcess).indexOf(name) == -1;
            });
            modulesToProcess = modulesToProcess.concat(dependentFilesToProcess);
            if (modulesToProcess.length == 0) {
                prepareOutput(filename, options, modules).then(deferred.resolve);
            }
            transformFilesRecursively();
        });
        transformedNextFile.fail(deferred.reject);
    };
    transformFilesRecursively();
    return deferred.promise;
};

var completeOptions = function(options) {
    options = options || {};
    options.prefix = options.prefix != null ? options.prefix : '';
    options.basePath = options.basePath != null ? options.basePath : '';
    options.combine = options.combine != null ? options.combine : false;
    options.iife = options.iife != null ? options.iife : false;
    return options;
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

var unifySlashes = function(input) {
    return input.replace(/\\/g, '/');
};

var transformSingleFile = function(moduleName, options) {
    var filename = getFilename(options.basePath, moduleName);
    var fileTransformed = fileUtil.readFile(filename).then(function(content) {
        var module = {name: moduleName, code: content};
        replaceAndLogDependencies(module, options);
        wrapModuleCode(module, options);
        return module;
    });
    return fileTransformed;
};

var getFilename = function(basePath, moduleName) {
    return path.join(basePath, moduleName + '.js');
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

var getSafeObjectName = function(moduleName, prefix) {
    return prefix + moduleName.replace(/\//g, '_');
};


var prepareOutput = function(filename, options, modules) {
    var deferred = Q.defer();
    var result = modules;
    if (options.combine) {
        result = combineModulesToSingleScript(result);
        if (options.iife) {
            result = wrapScriptInFunctionExpression(result);
        }
    }
    if (options.watch) {
        var filesToWatch = modules.map(function(module) {
            return getFilename(options.basePath, module.name);
        });
        fileUtil.watchFiles(filesToWatch).then(function(changedFile) {
            console.log(changedFile + ' changed');
            transform(filename, options);
        });
    }
    var fileWrittenToDisk = options.output ? fileUtil.writeFile(options.output, result) : result;
    Q.when(fileWrittenToDisk, deferred.resolve);
    return deferred.promise;
};

var combineModulesToSingleScript = function(modules) {
    return modules.reduce(function(s, x) { return s + x.code + '\n'; }, '');
};

var wrapScriptInFunctionExpression = function(code) {
    return '(function() {\n' + code + '}());';
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