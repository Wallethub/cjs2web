var transformer = require('./transformer');

if (require.main == module) {
    var options = require('./commandLineOptions.js');
    var filename = options._[0];
    if (filename) {
        transformer.transform(filename, options).then(function(modules) {
            var code = '(function() {\n' + combine(modules) + '}());';
            console.log(code);
        });
    }
}

var combine = function(modules) {
    return modules.reduce(function(s, x) { return s + x.code + '\n'; }, '');
};

module.exports = transformer;