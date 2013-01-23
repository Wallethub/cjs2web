var path = require('path');

var fsUtils = require('./filesystemUtils');

var createModule = function(fileName, code, options) {
    var module = {};
    module.fileName = fsUtils.unifyFileName(fileName);
    module.moduleName = getModuleName(module.fileName, options.basePath);
    module.objectName = getSafeObjectName(module.moduleName, options.prefix);
    module.code = code ? (code + '\n') : '';
    return module;
};

var getModuleName = function(fileName, basePath) {
    var moduleName = fileName;
    if (basePath) {
        moduleName = moduleName.replace(new RegExp('^' + basePath), '');
    }
    moduleName = fsUtils.withoutFileExtension(moduleName);
    return moduleName;
};

var getSafeObjectName = function(moduleName, prefix) {
    return prefix + moduleName.replace(/\//g, '_').replace(/\./g, '$');
};

exports.createModule = createModule;