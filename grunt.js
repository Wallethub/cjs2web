module.exports = function(grunt) {

    'use strict';

    var license =
        '/**\n' +
            ' * @license\n' +
            ' * <%= pkg.name %> - <%= pkg.description %> - version <%= pkg.version %>\n' +
            ' * Copyright 2013, <%= pkg.author %>\n' +
            ' * Licensed under the <%= pkg.license %> license.\n' +
            ' * http://www.opensource.org/licenses/<%= pkg.license %>\n' +
            ' */';

    grunt.initConfig({
        pkg: '<json:package.json>',
        meta: {
            license: license
        },
        concat: {
            license: {
                src: ['<banner:meta.license>'],
                dest: 'LICENSE.txt'
            }
        }
    });

    grunt.registerTask('jasmine', 'run jasmine specs', function() {

        var jasmine = require('jasmine-node');
        var done = this.async();

        var onComplete = function(runner) {
            var failedCount = runner.results().failedCount;
            done(failedCount == 0);
        };

        jasmine.executeSpecsInFolder({
            specFolder: './src',
            onComplete: onComplete,
            isVerbose: true,
            showColors: true,
            regExpSpec: /spec\.js/
        });

    });

    grunt.registerTask('default', 'jasmine concat:license');

};