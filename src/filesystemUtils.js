'use strict';

var path = require('path');
var fs = require('fs');
var Q = require('q');

var readFile = function(fileName) {
    var deferred = Q.defer();
    fs.readFile(fileName, 'utf-8', function(error, content) {
        if (!error) {
            deferred.resolve(content);
        }
        else {
            deferred.reject(error);
        }
    });
    return deferred.promise;
};

var writeFile = function(fileName, content) {
    var deferred = Q.defer();
    fs.writeFile(fileName, content, 'utf-8', function(error) {
        if (!error) {
            deferred.resolve(content);
        }
        else {
            deferred.reject(error);
        }
    });
    return deferred.promise;
};

var watchFiles = function(fileNames) {
    var deferred = Q.defer();
    fileNames.forEach(function(fileName) {
        fs.watch(fileName, function() {
            deferred.resolve(fileName);
        });
    });
    return deferred.promise;
};

var withoutFileExtension = function(fileName) {
    return fileName.substring(0, fileName.length - path.extname(fileName).length);
};

var unifyPath = function(path) {
    var output = unifySlashes(path).replace(currentDirectoryRegex, '');
    if (output[output.length - 1] != '/') {
        output += '/';
    }
    return output;
};

var unifyFileName = function(fileName) {
    fileName = unifySlashes(fileName);
    fileName = fileName.replace(currentDirectoryRegex, '');
    fileName = fileName + (!path.extname(fileName) ? '.js' : '');
    return fileName;
};

var unifySlashes = function(input) {
    return input.replace(/\\/g, '/');
};

var currentDirectoryRegex = /^\.?\//;

exports.unifyPath = unifyPath;
exports.unifyFileName = unifyFileName;
exports.readFile = readFile;
exports.writeFile = writeFile;
exports.watchFiles = watchFiles;
exports.withoutFileExtension = withoutFileExtension;
