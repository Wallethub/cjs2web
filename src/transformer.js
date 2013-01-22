var path = require('path');
var Q = require('q');

var fileUtil = require('./fileUtils');

var transform = function(fileName, options) {
    options = addDefaultOptions(options);
    options.basePath = prepareBasePath(options.basePath);
    var deferred = Q.defer();
    var modules = [], filesProcessed = [];
    var filesToProcess = [fileName];
    var transformFilesRecursively = function() {
        var currentFile = filesToProcess.shift();
        var transformedNextFile = transformSingleFile(currentFile, options);
        transformedNextFile.then(function(module) {
            modules.unshift(module);
            filesProcessed.push(currentFile);
            var dependentFiles = module.dependencies.map(function(x) { return x.fileName; });
            var dependentFilesToProcess = dependentFiles.filter(function(name) {
                return filesProcessed.concat(filesToProcess).indexOf(name) == -1;
            });
            filesToProcess = filesToProcess.concat(dependentFilesToProcess);
            if (filesToProcess.length > 0) {
                transformFilesRecursively();
            }
            else {
                prepareOutput(fileName, options, modules).then(deferred.resolve);
            }
        });
        transformedNextFile.fail(deferred.reject);
    };
    transformFilesRecursively();
    return deferred.promise;
};

var addDefaultOptions = function(options) {
    options = options || {};
    options.prefix = options.prefix != null ? options.prefix : '';
    options.basePath = options.basePath != null ? options.basePath : '';
    options.combine = options.combine != null ? options.combine : false;
    options.iife = options.iife != null ? options.iife : false;
    return options;
};

var prepareBasePath = function(basePath) {
    if (basePath) {
        basePath = unifySlashes(basePath).replace(currentDirectoryRegex, '');
        if (basePath[basePath.length - 1] != '/') {
            basePath += '/';
        }
    }
    return basePath;
};

var transformSingleFile = function(fileName, options) {
    var fileTransformed = fileUtil.readFile(fileName).then(function(code) {
        var module = createModuleEntry(fileName, code, options);
        replaceAndLogDependencies(module, options);
        wrapModuleCode(module, options);
        return module;
    });
    return fileTransformed;
};

var createModuleEntry = function(fileName, code, options) {
    var module = {};
    module.fileName = getUnifiedFileName(fileName);
    module.moduleName = getModuleName(module.fileName, options.basePath);
    module.objectName = getSafeObjectName(module.moduleName, options.prefix);
    module.code = code || '';
    return module;
};

var getUnifiedFileName = function(fileName) {
    fileName = unifySlashes(fileName);
    fileName = fileName.replace(currentDirectoryRegex, '');
    fileName = fileName + (!path.extname(fileName) ? '.js' : '');
    return fileName;
};

var unifySlashes = function(input) {
    return input.replace(/\\/g, '/');
};

var getModuleName = function(fileName, basePath) {
    var moduleName = fileName;
    if (basePath) {
        moduleName = moduleName.replace(new RegExp('^' + basePath), '');
    }
    moduleName = fileUtil.withoutFileExtension(moduleName);
    return moduleName;
};

var getSafeObjectName = function(moduleName, prefix) {
    return prefix + moduleName.replace(/\//g, '_').replace(/\./g, '$');
};

var replaceAndLogDependencies = function(module, options) {
    var folder = path.dirname(module.fileName);
    module.dependencies = module.dependencies || [];
    module.code = module.code.replace(requireRegex, function() {
        var relativeFileName = arguments[1].substring(1, arguments[1].length - 1);
        var dependency = createModuleEntry(
            path.join(folder, relativeFileName), '[reference]', options);
        if (dependency.objectName.indexOf('.') > -1) {
            throw new Error('cannot transform module id into object name: ', relativeFileName);
        }
        if (!dependencyAlreadyAdded(module.dependencies, dependency)) {
            module.dependencies.push(dependency);
        }
        return dependency.objectName;
    });
};

var dependencyAlreadyAdded = function(dependencies, dependency) {
    return dependencies.some(function(x) { return x.fileName == dependency.fileName; });
};

var wrapModuleCode = function(module, options) {
    var objectName = getSafeObjectName(module.moduleName, options.prefix);
    if (module.code != null) module.code += '\n';
    var variableDefinitions = exportsRegex.test(module.code) ? codeTemplates.exportsDefinition : '';
    module.code = 'var ' + objectName + ' = ' +
        codeTemplates.wrapperStart +
        variableDefinitions +
        module.code + '\n' +
        codeTemplates.returnValue +
        codeTemplates.wrapperEnd;
};

var prepareOutput = function(fileName, options, modules) {
    var deferred = Q.defer();
    var result = modules;
    if (options.combine) {
        result = combineModulesToSingleScript(result);
        if (options.iife) {
            result = wrapScriptInFunctionExpression(result);
        }
    }
    if (options.watch) {
        var filesToWatch = modules.map(function(module) { return module.fileName; });
        fileUtil.watchFiles(filesToWatch).then(function(changedFile) {
            console.log(changedFile + ' changed');
            transform(fileName, options);
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
var currentDirectoryRegex = /^\.?\//;

exports.transform = transform;