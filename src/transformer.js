var path = require('path');
var Q = require('q');
var moduleSorter = require('./moduleSorter');

var filesystemUtils = require('./filesystemUtils');
var moduleFactory = require('./moduleFactory');
var outputProcessor = require('./outputProcessor');

var transform = function(options) {
    if (arguments.length == 0) return Q.resolve(exampleOptions);
    options = addDefaultOptions(options);
    var deferred = Q.defer();
    var modules = [], filesProcessed = [];
    var filesToProcess = [options.fileName];
    var transformFilesRecursively = function() {
        var currentFile = filesToProcess.pop();
        var transformedNextFile = transformSingleFile(currentFile, options);
        transformedNextFile.then(function(module) {
            modules.push(module);
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
                processAndPersistOutput(modules, options)
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
    module.code = addExportsShortcutIfUsed(module.code);
    var moduleFactory = module.code + codeTemplates.returnStatement;
    var moduleAssignment = 'var ' + module.objectName + ' = ';
    module.code = moduleAssignment + '(function(module) {\n' + moduleFactory + '\n}({exports: {}}));';
};

var addExportsShortcutIfUsed = function(code) {
    if (code.match(exportsRegex)) {
        if (!code.match(strictModeRegex)) {
            return codeTemplates.exportsDefinition + code;
        }
        return code.replace(strictModeRegex, function(match) {
            var sanitizedUseStrict = '\'use strict\';\n';
            if (match.indexOf('"') > -1) sanitizedUseStrict = sanitizedUseStrict.replace(/'/g, '"');
            return sanitizedUseStrict + codeTemplates.exportsDefinition;
        });
    }
    return code;
};

var processAndPersistOutput = function(modules, options) {
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
        watchFilesForChange(modules, options);
    }
    return Q.when(result);
};

var watchFilesForChange = function(modules, options) {
    var filesToWatch = modules.map(function(module) { return module.fileName; });
    filesystemUtils.watchFiles(filesToWatch).then(function(changedFile) {
        console.log('cjs2web: ' + changedFile + ' changed, re-executing');
        transform(options).fail(function() {
            console.log('cjs2web: encountered error, waiting for next change');
            watchFilesForChange(modules, options);
        });
    });
};

var codeTemplates = {
    strictMode: '\'use strict\';\n',
    exportsDefinition: 'var exports = module.exports;\n',
    returnStatement: 'return module.exports;\n'
};

var requireRegex = /require\s*\(\s*(('(.*?)')|("(.*?)"))\s*\)/g;
var exportsRegex = /exports(\.|\[).*/i;
var strictModeRegex = /("use strict"|'use strict')\s*;?\n?/;

var exampleOptions = {
    fileName: "String",
    basePath: "String",
    prefix: "String",
    output: "String",
    iife: "Boolean",
    combine: "Boolean",
    watch: "Boolean"
};



exports.transform = transform;