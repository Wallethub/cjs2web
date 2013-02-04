describe('cjs2web.transform', function() {

    var horaa = require('horaa');
    var fs = horaa('fs');
    var transform = require('./index').transform;
    var transformWithNoPrefix = function(options) {
        options.prefix = '';
        return transform(options);
    };

    afterEach(function() {
        fs.restore('readFile');
    });

    describe('given a common js module and an empty module prefix', function() {

        var withNoPrefix = {prefix: ''};

        describe('which is placed at top level and has no dependencies', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, '');
                });
                transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list with a single module entry', function() {
                expect(_modules.length).toBe(1);
            });

            it('should return the correct file name', function() {
                expect(_modules[0].fileName).toBe('a.js');
            });

            it('should return the correct module name', function() {
                expect(_modules[0].moduleName).toBe('a');
            });

            it('should return the correct object name', function() {
                expect(_modules[0].objectName).toBe('a');
            });

            it('should return code creating a correctly named object', function() {
                eval(_modules[0].code);
                expect(a).toBeDefined();
            });

            it('should mark the module entry as main module', function() {
                expect(_modules[0].main).toBeTruthy();
            });

        });

        describe('which is placed in a nested subdirectory', function() {

            var _modules;

            beforeEach(function(done) {

                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, '');
                });
                _modules = transformWithNoPrefix({fileName: 'path/to\\a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list with a single module entry', function() {
                expect(_modules.length).toBe(1);

            });

            it('should return the correct file name', function() {
                expect(_modules[0].fileName).toBe('path/to/a.js');
            });

            it('should return the correct module name including the path with unified slashes', function() {
                expect(_modules[0].moduleName).toBe('path/to/a');
            });

            it('should return the correct object name where slashes are replaced with underscores', function() {
                expect(_modules[0].objectName).toBe('path_to_a');
            });

            it('should return code creating a correctly named object', function() {
                eval(_modules[0].code);
                expect(path_to_a).toBeDefined();
            });

        });

        describe('which has a dot in its file name', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, '');
                });
                transformWithNoPrefix({fileName: 'foo.bar.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return the correct object name where the dot is replaced with $', function() {
                expect(_modules[0].objectName).toBe('foo$bar');
            });

            it('should return code creating a correctly named object', function() {
                eval(_modules[0].code);
                expect(foo$bar).toBeDefined();
            });

        });

        describe('which has a hyphen in its file name', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, '');
                });
                transformWithNoPrefix({fileName: 'foo-bar.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return the correct object name where the hyphen is replaced with $', function() {
                expect(_modules[0].objectName).toBe('foo$bar');
            });

            it('should return code creating a correctly named object', function() {
                eval(_modules[0].code);
                expect(foo$bar).toBeDefined();
            });

        });

        describe('which contains a private (string) variable', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, 'var hidden = "Hello module";');
                });
                _modules = transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return code containing the variable declaration', function() {
                expect(_modules[0].code).toContain('var hidden = "Hello module";');
            });

            it('should respect the function scope so the private variable is not accessible', function() {
                eval(_modules[0].code);
                expect(function() { hidden; }).toThrow();
            });

        });

        describe('which exposes members using exports', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, 'exports.a = true;exports.b = 1;exports.c = function(){};');
                });
                _modules = transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return code exposing these properties on the created object', function() {
                eval(_modules[0].code);
                expect(typeof a.a).toBe('boolean');
                expect(typeof a.b).toBe('number');
                expect(typeof a.c).toBe('function');
            });

        });

        describe('which exposes an object using module.exports', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, 'module.exports = {a: true, b: 1, c: function() {}};');
                });
                _modules = transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return code exposing these properties on the created object', function() {
                eval(_modules[0].code);
                expect(typeof a.a).toBe('boolean');
                expect(typeof a.b).toBe('number');
                expect(typeof a.c).toBe('function');
            });

        });

        describe('which is placed in the root directory and requires a module in the same directory', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    var code = filename == 'a.js' ?
                        'exports.b = require("./b.js");' : 'module.exports = "b";';
                    callback(null, code);
                });
                _modules = transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list containing two modules', function() {
                expect(_modules.length).toBe(2);
            });

            it('should return a list containing the initial module at the second index', function() {
                expect(_modules[1].moduleName).toBe('a');
            });

            it('should return a list of the correct dependency data for the first defined module', function() {
                expect(_modules[1].dependencies[0].fileName).toBe('b.js');
                expect(_modules[1].dependencies[0].moduleName).toBe('b');
                expect(_modules[1].dependencies[0].objectName).toBe('b');
            });

            it('should return a list containing the second defined module at the first index', function() {
                expect(_modules[0].moduleName).toBe('b');
            });

            it('should replace the require() call with the correct module object identifier', function() {
                var b = {};
                eval(_modules[1].code);
                expect(a.b).toBe(b);
            });

            it('should mark the initial module as main module', function() {
                expect(_modules[1].main).toBeTruthy();
            });

            it('should not mark the required module as main module', function() {
                expect(_modules[0].main).toBeFalsy();
            });

        });

        describe('which is placed in a subdirectory and requires a module in the same directory', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    var code = filename.indexOf('a.js') > -1 ?
                        'exports.b = require("./b.js");' : 'module.exports = "b";';
                    callback(null, code);
                });
                _modules = transformWithNoPrefix({fileName: 'path/to/a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return the correct file name for the first defined module', function() {
                expect(_modules[1].fileName).toBe('path/to/a.js');
            });

            it('should return a list of the correct dependency data for the first defined module', function() {
                expect(_modules[1].dependencies[0].fileName).toBe('path/to/b.js');
                expect(_modules[1].dependencies[0].moduleName).toBe('path/to/b');
                expect(_modules[1].dependencies[0].objectName).toBe('path_to_b');
            });


            it('should return the correct file name for the second defined module', function() {
                expect(_modules[0].fileName).toBe('path/to/b.js');
            });

            it('should replace the require() call with the correct module object identifier including the path', function() {
                var path_to_b = {};
                eval(_modules[1].code);
                expect(path_to_a.b).toBe(path_to_b);
            });

        });

        describe('which is placed in a subdirectory and requires a module from the parent directory', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    var code = filename.indexOf('a.js') > - 1 ?
                        'exports.b = require("../b.js");' : 'module.exports = "b";';
                    callback(null, code);
                });
                _modules = transformWithNoPrefix({fileName: 'sub/a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return the correct file name for the first defined module', function() {
                expect(_modules[1].fileName).toBe('sub/a.js');
            });

            it('should return the correct file name for the second defined module', function() {
                expect(_modules[0].fileName).toBe('b.js');
            });

            it('should replace require() with the correct module object identifier including the path', function() {
                var b = {};
                eval(_modules[1].code);
                expect(sub_a.b).toBe(b);
            });

        });

        describe('which is placed in the root directory and requires a module in a subdirectory which requires another module in another subdirectory', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    if (filename == 'a.js') {
                        callback(null, 'require("./sub/b.js");');
                    }
                    if (filename.indexOf('b.js') > -1) {
                        callback(null, 'require("./sub/c.js");');
                    }
                    if (filename.indexOf('c.js') > -1) {
                        callback(null, '');
                    }
                });
                _modules = transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list containing three modules', function() {
                expect(_modules.length).toBe(3);
            });

            it('should return the correct file name for the third defined module', function() {
                expect(_modules[0].fileName).toBe('sub/sub/c.js');
            });

            it('should contain the last required module as first entry with the correct module id', function() {
                expect(_modules[0].moduleName).toBe('sub/sub/c');
            });

        });

        describe('which is placed in the root directory and requires another module without file extension', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    var code = filename.indexOf('a.js') > - 1 ?
                        'exports.b = require("./b");' : 'module.exports = "b";';
                    callback(null, code);
                });
                _modules = transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return the correct file name including file extension for the required module', function() {
                expect(_modules[0].fileName).toBe('b.js');
            });

            it('should be able to load the dependency correctly', function() {
                expect(_modules[0].moduleName).toBe('b');
                eval(_modules[0].code);
                expect(b).toBe('b');
            });

        });

        describe('which is placed in the root and requires another not existing module', function() {

            beforeEach(function() {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    if (filename.indexOf('notExisting') == -1) {
                        callback(null, 'require("./notExisting.js");');
                    }
                    else {
                        callback('error');
                    }
                });
            });

            it('should throw an exception', function(done) {
                transformWithNoPrefix({fileName: 'a.js'}).fail(function(error) {
                    expect(error).toBeDefined();
                    done();
                });
            });

        });

        describe('which requires two modules on the same line of code', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    if (filename == 'a.js') {
                        callback(null, 'require("./b.js");require("./c.js");');
                    }
                    else {
                        callback(null, '')
                    }
                });
                transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list containing three modules', function() {
                expect(_modules.length).toBe(3);
            });
        });

        describe('which requires two modules of which the first one also requires the second', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    switch (filename){
                        case 'a.js':
                            callback(null, 'require("./b.js");require("./c.js");');
                            break;
                        case 'b.js':
                            callback(null, 'require("./c.js");');
                            break;
                        case 'c.js':
                            callback(null, '');
                            break;
                    }
                });
                transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list of modules with each required module contained only once', function() {
                expect(_modules.length).toBe(3);
            });

            it('should return a list of modules in the correct optimized order', function() {
                expect(_modules[0].moduleName).toBe('c');
                expect(_modules[1].moduleName).toBe('b');
                expect(_modules[2].moduleName).toBe('a');
            });
        });

        describe('which requires two modules of which the second also requires the first', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    switch (filename){
                        case 'a.js':
                            callback(null, 'require("./b.js");require("./c.js");');
                            break;
                        case 'b.js':
                            callback(null, '');
                            break;
                        case 'c.js':
                            callback(null, 'require("./b.js");');
                            break;
                    }
                });
                transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list of modules with each required module contained only once', function() {
                expect(_modules.length).toBe(3);
            });

            it('should return a list of modules in the correct optimized order', function() {
                expect(_modules[0].moduleName).toBe('b');
                expect(_modules[1].moduleName).toBe('c');
                expect(_modules[2].moduleName).toBe('a');
            });
        });

        describe('which contains a circular dependency', function() {

            beforeEach(function() {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    switch (filename){
                        case 'a.js':
                            callback(null, 'require("./b.js");');
                            break;
                        case 'b.js':
                            callback(null, 'require("./a.js");');
                            break;
                    }
                });

            });

            it('should fail', function(done) {
                transformWithNoPrefix({fileName: 'a.js'}).fail(function(error) {
                    expect(error).toBeDefined();
                    done();
                });
            });
        });


        describe('which does not make use of the exports object', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, '');
                });
                transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should not contain declaration of the exports variable', function() {
                expect(_modules[0].code).not.toContain('var exports = module.exports;');
            });
        });

        describe('which requires the same module twice', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, 'require("./b.js");require("./b.js");');
                });
                transformWithNoPrefix({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list of modules with each required module contained only once', function() {
                expect(_modules.length).toBe(2);
                expect(_modules[0].moduleName).toBe('b');
                expect(_modules[1].moduleName).toBe('a');
            });

        });

    });

    describe('given a common js module and a module prefix', function() {

        describe('where the module is placed on top level and requires a module in the same folder', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    if (filename.indexOf('a.js') > -1) {
                        callback(null, 'require("./b.js");');
                    }
                    else {
                        callback(null, '');
                    }
                });
                transform({fileName: 'a.js', prefix: 'module_'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should add the given prefix to the main module\'s object name', function() {
                expect(_modules[1].objectName).toBe('module_a');
            });

            it('should not add the given prefix to the main module\'s module name', function() {
                expect(_modules[1].moduleName).toBe('a');
            });

            it('should contain the given prefix in the main module\'s code', function() {
                expect(_modules[1].code).toContain('module_a');
            });

            it('should add the given prefix to the required module\'s object name', function() {
                expect(_modules[0].objectName).toBe('module_b');
            });

            it('should not add the given prefix to the required module\'s module name', function() {
                expect(_modules[0].moduleName).toBe('b');
            });

            it('should contain the given prefix in the required module\'s code', function() {
                expect(_modules[0].code).toContain('module_b');
            });

        });

    });

    describe('given a common js module without providing a module prefix', function() {

        describe('where the module is placed on top level and requires a module in the same folder', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    if (filename.indexOf('a.js') > -1) {
                        callback(null, 'require("./b.js");');
                    }
                    else {
                        callback(null, '');
                    }
                });
                transform({fileName: 'a.js'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should add the default prefix to the main module\'s object name', function() {
                expect(_modules[1].objectName).toBe('__a');
            });

            it('should contain the default prefix in the main module\'s code', function() {
                expect(_modules[1].code).toContain('__a');
            });

            it('should add the default prefix to the required module\'s object name', function() {
                expect(_modules[0].objectName).toBe('__b');
            });

            it('should contain the default prefix in the required module\'s code', function() {
                expect(_modules[0].code).toContain('__b');
            });

        });

    });

    describe('given a common js module and a base path', function() {

        describe('where the module is placed directly in the base path', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, '');
                });
                transform({fileName: 'path/to/a.js', basePath: 'path/to', prefix: ''}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should not add the base path to the module name', function() {
                expect(_modules[0].moduleName).toBe('a');
            });

            it('should not add the base path to the module name', function() {
                eval(_modules[0].code);
                expect(function() { path_to_a; }).toThrow();
                expect(a).toBeDefined();
            });

        });

        describe('where the module is placed directly in the base path and requires a module in a subdirectory', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    if (filename.indexOf('a.js') > -1) {
                        callback(null, 'require("./sub/b.js")');
                    }
                    else {
                        callback(null, '');
                    }
                });
                transform({fileName: 'path/to/a.js', basePath: 'path/to', prefix: ''}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should not add the base path to the required module\'s name', function() {
                expect(_modules[0].moduleName).toBe('sub/b');
            });

            it('should not add the base path to the required module\'s object name', function() {
                eval(_modules[0].code);
                expect(function() { path_to_sub_b; }).toThrow();
                expect(sub_b).toBeDefined();
            });

        });

    });

    describe('given a common js module with dependencies and the combine option enabled', function() {

        var _output;

        beforeEach(function(done) {
            fs.hijack('readFile', function(filename, encoding, callback) {
                if (filename == 'a.js') {
                    callback(null, 'exports.b = require("./b.js");');
                }
                else {
                    callback(null, 'module.exports = "b";');
                }
            });
            transform({fileName: 'a.js', combine: true, prefix: ''}).then(function(output) {
                _output = output;
                done();
            });
        });

        it('should return a single string of code', function() {
            expect(typeof _output).toBe('string');
        });

        it('should combine all required modules together in the returned code', function() {
            eval(_output);
            expect(a.b).toBe('b');
        });

    });

    describe('given a common js module with a dependency and the combine and iife option enabled', function() {

        var _output;

        beforeEach(function(done) {
            fs.hijack('readFile', function(filename, encoding, callback) {
                if (filename == 'a.js') {
                    callback(null, 'exports.b = require("./b.js");');
                }
                else {
                    callback(null, 'module.exports = "b";');
                }
            });
            transform({fileName: 'a.js', combine: true, iife: true, prefix: ''}).then(function(output) {
                _output = output;
                done();
            });
        });

        it('should wrap all code inside an iife so no global variables are declared', function() {
            eval(_output);
            expect(function() { a; }).toThrow();
            expect(function() { b; }).toThrow();
        });

        it('should not assign the main module\'s factory result to a local variable', function() {
            expect(_output).not.toMatch(/^var a = \(function\(/m);
        });

        it('should assign the required module\'s factory result to a local variable', function() {
            expect(_output).toMatch(/^var b = \(function\(/m);
        });

    });

    describe('given a common js module, the combine option enabled and an output filename provided', function() {

        var _spy, _output;

        beforeEach(function(done) {
            _spy = jasmine.createSpy('writeFile');
            fs.hijack('readFile', function(filename, encoding, callback) {
                callback(null, '');
            });
            fs.hijack('writeFile', function(filename, content, encoding, callback) {
                _spy(filename, content);
                callback();
            });
            transform({fileName: 'a.js', combine: true, output: 'output.js', prefix: ''}).then(function(output) {
                _output = output;
                done();
            });
        });

        afterEach(function() {
            fs.restore('writeFile');
        });

        it('should write the file to the disk', function() {
            expect(_spy).toHaveBeenCalledWith('output.js', _output);
        });

    });

});
