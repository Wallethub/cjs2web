var path = require('path');
var Q = require('q');
var moduleSorter = require('./moduleSorter');

var filesystemUtils = require('./filesystemUtils');
var moduleFactory = require('./moduleFactory');
var outputProcessor = require('./outputProcessor');

var transform = function(fileName, options) {
    options = addDefaultOptions(options);
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
                processAndPersistOutput(fileName, modules, options)
                    .then(deferred.resolve)
                    .fail(deferred.reject);
            }
        });
        transformedNextFile.fail(deferred.reject);
    };
    transformFilesRecursively();
    return deferred.promise;
};

var addDefaultOptions = function(options) {
    options = options || {};
    options.prefix = options.prefix != null ? options.prefix : '__';
    options.basePath = filesystemUtils.unifyPath(options.basePath != null ? options.basePath : '');
    options.combine = options.combine != null ? options.combine : false;
    options.iife = options.iife != null ? options.iife : false;
    return options;
};

var transformSingleFile = function(fileName, options) {
    var fileTransformed = filesystemUtils.readFile(fileName).then(function(code) {
        var module = moduleFactory.createModule(fileName, code, options);
        replaceAndLogDependencies(module, options);
        wrapModuleCode(module);
        return module;
    });
    return fileTransformed;
};

var replaceAndLogDependencies = function(module, options) {
    var folder = path.dirname(module.fileName);
    module.dependencies = module.dependencies || [];
    module.code = module.code.replace(requireRegex, function() {
        var relativeFileName = arguments[1].substring(1, arguments[1].length - 1);
        var dependency = moduleFactory.createModule(
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

var wrapModuleCode = function(module) {
    var variableDefinitions = exportsRegex.test(module.code) ? codeTemplates.exportsDefinition : '';
    module.code = 'var ' + module.objectName + ' = ' +
        codeTemplates.wrapperStart +
        variableDefinitions +
        module.code +
        codeTemplates.returnValue +
        codeTemplates.wrapperEnd;
};

var processAndPersistOutput = function(fileName, modules, options) {
    try {
        modules = moduleSorter.sortByDependency(modules);
    }
    catch(error) {
        return Q.reject(error);
    }
    var result = outputProcessor.process(modules, options);
    if (options.output) {
        result = filesystemUtils.writeFile(options.output, result);
    }
    else if (options.cli) {
        console.log(result);
    }
    if (options.watch) {
        watchFilesForChange(fileName, modules, options);
    }
    return Q.when(result);
};

var watchFilesForChange = function(fileName, modules, options) {
    var filesToWatch = modules.map(function(module) { return module.fileName; });
    filesystemUtils.watchFiles(filesToWatch).then(function(changedFile) {
        console.log(changedFile + ' changed');
        transform(fileName, options);
    });
};

var codeTemplates = {
    wrapperStart: '(function(module) {\n\n',
    exportsDefinition: 'var exports = module.exports;\n',
    returnValue: 'return module.exports;\n',
    wrapperEnd: '}({exports: {}}));'
};

var requireRegex = /require\s*\(\s*(('(.*?)')|("(.*?)"))\s*\)/g;
var exportsRegex = /exports(\.|\[).*/i;

exports.transform = transform;