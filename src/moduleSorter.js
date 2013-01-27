var sortByDependency = function(modules) {
    modules = modules.slice(0);
    modules.sort(function(first, second) {
        if (first.dependencies.length != second.dependencies.length) {
            return first.dependencies.length > second.dependencies.length ? 1 : -1;
        }
        else {
            var firstDependsOnSecond = dependsOn(first, second);
            var secondDependsOnFirst = dependsOn(second, first);
            if (firstDependsOnSecond && secondDependsOnFirst) {
                throw new Error('circular dependency');
            }
            return firstDependsOnSecond ? 1 : -1;
        }
    });
    return modules;
};

var dependsOn = function(module, dependency) {
    return module.dependencies.some(function(x) { return x.moduleName == dependency.moduleName; })
};

exports.sortByDependency = sortByDependency;