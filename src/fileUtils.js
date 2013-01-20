'use strict';

var path = require('path');
var fs = require('fs');
var Q = require('q');

var readFile = function(filename) {
    var deferred = Q.defer();
    fs.readFile(filename, 'utf-8', function(error, content) {
        if (!error) {
            deferred.resolve(content);
        }
        else {
            deferred.reject(error);
        }
    });
    return deferred.promise;
};

var writeFile = function(filename, content) {
    var deferred = Q.defer();
    fs.writeFile(filename, content, 'utf-8', function(error) {
        if (!error) {
            deferred.resolve(content);
        }
        else {
            deferred.reject(error);
        }
    });
    return deferred.promise;
};

var watchFiles = function(filenames) {
    var deferred = Q.defer();
    filenames.forEach(function(filename) {
        fs.watch(filename, function() {
            deferred.resolve(filename);
        });
    });
    return deferred.promise;
};

var withoutFileExtension = function(filename) {
    return filename.substring(0, filename.length - path.extname(filename).length);
};

exports.readFile = readFile;
exports.writeFile = writeFile;
exports.watchFiles = watchFiles;
exports.withoutFileExtension = withoutFileExtension;