describe('cjs2web.transform', function() {

    var horaa = require('horaa');
    var fs = horaa('fs');
    var transform = require('./index').transform;

    afterEach(function() {
        fs.restore('readFile');
    });

    describe('travis test', function() {
        it('should fail', function() {
            expect(false).toBeTruthy();
        });
    });

    describe('given a common js module', function() {

        describe('which is placed at top level and has zero dependencies', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, '');
                });
                transform('a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list with a single module entry', function() {
                expect(_modules.length).toBe(1);
            });

            it('should contain an entry with the correct module name', function() {
                expect(_modules[0].name).toBe('a');
            });

            it('should contain an entry with code creating an object named after the file name', function() {
                eval(_modules[0].code);
                expect(a).toBeDefined();
            });

        });

        describe('which is placed in a nested subdirectory', function() {

            var _modules;

            beforeEach(function(done) {

                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, '');
                });
                _modules = transform('path/to\\a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list with a single module entry', function() {
                expect(_modules.length).toBe(1);

            });

            it('should contain an entry with the correct module name including the path', function() {
                expect(_modules[0].name).toBe('path/to/a');
            });

            it('should contain an entry with code creating an object named after the file location', function() {
                eval(_modules[0].code);
                expect(path_to_a).toBeDefined();
            });

        });


        describe('which contains a private (string) variable', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, 'var hidden = "Hello module";');
                });
                _modules = transform('a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return an entry with code containing the variable declaration', function() {
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
                _modules = transform('a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return an entry with code exposing these properties on the created object', function() {
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
                _modules = transform('a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return an entry with code exposing these properties on the created object', function() {
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
                _modules = transform('a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list containing two modules', function() {
                expect(_modules.length).toBe(2);
            });

            it('should return a list containing the initial module at the second index', function() {
                expect(_modules[1].name).toBe('a');
            });

            it('should contain a list of dependencies without file extensions in the entry for the initial module', function() {
                expect(_modules[1].dependencies[0]).toBe('b');
            });

            it('should return a list containing the required module at the first index', function() {
                expect(_modules[0].name).toBe('b');
            });

            it('should replace the require() call with the correct module object identifier', function() {
                var b = {};
                eval(_modules[1].code);
                expect(a.b).toBe(b);
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
                _modules = transform('path/to/a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
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
                _modules = transform('sub/a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
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
                _modules = transform('a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list containing three modules', function() {
                expect(_modules.length).toBe(3);
            });

            it('should contain the last required module as first entry with the correct module id', function() {
                expect(_modules[0].name).toBe('sub/sub/c');
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
                _modules = transform('a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should be able to load the dependency correctly', function() {
                expect(_modules[0].name).toBe('b');
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
                transform('a.js').fail(function(error) {
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
                transform('a.js').then(function(modules) {
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
                transform('a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should return a list of modules with each required module contained only once', function() {
                expect(_modules.length).toBe(3);
            });

            it('should return a list of modules in the correct optimized order', function() {
                expect(_modules[0].name).toBe('c');
                expect(_modules[1].name).toBe('b');
                expect(_modules[2].name).toBe('a');
            });
        });

        describe('which does not make use of the exports object', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, '');
                });
                transform('a.js').then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should not contain declaration of the exports variable', function() {
                expect(_modules[0].code).not.toContain('var exports = module.exports;');
            });
        });

    });

    describe('given a common js module and a module prefix', function() {

        describe('which is placed on top level and requires a module in the same folder', function() {

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
                transform('a.js', {prefix: 'module_'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should add the module prefix to the main module', function() {
                expect(_modules[1].code).toContain('module_a');
            });

            it('should add the module prefix to the required module', function() {
                expect(_modules[0].code).toContain('module_b');
            });

        });

    });

    describe('given a common js module and a base path', function() {

        describe('which is placed directly in the base path', function() {

            var _modules;

            beforeEach(function(done) {
                fs.hijack('readFile', function(filename, encoding, callback) {
                    callback(null, '');
                });
                transform('path/to/a.js', {basePath: 'path/to'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should not add the base path to the module name', function() {
                expect(_modules[0].name).toBe('a');
            });

            it('should not add the base path to the module name', function() {
                eval(_modules[0].code);
                expect(function() { path_to_a; }).toThrow();
                expect(a).toBeDefined();
            });

        });

        describe('which is placed directly in the base path and requires a module in a subdirectory', function() {

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
                transform('path/to/a.js', {basePath: 'path/to'}).then(function(modules) {
                    _modules = modules;
                    done();
                });
            });

            it('should not add the base path to the required module´s name', function() {
                expect(_modules[0].name).toBe('sub/b');
            });

            it('should not add the base path to the required module´s object name', function() {
                eval(_modules[0].code);
                expect(function() { path_to_sub_b; }).toThrow();
                expect(sub_b).toBeDefined();
            });

        });

    });

});