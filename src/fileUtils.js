'use strict';

var path = require('path');
var fs = require('fs');
var Q = require('Q');

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

var withoutFileExtension = function(filename) {
    return filename.substring(0, filename.length - path.extname(filename).length);
};

exports.readFile = readFile;
exports.withoutFileExtension = withoutFileExtension;