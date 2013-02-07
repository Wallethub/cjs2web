var topologicalSort =
    require('../vendor/javascript-topological-sort/topological-sort').topologicalSort;

var sortByDependency = function(modules) {
    var indices = {};
    modules.forEach(function(x, i) { indices[x.moduleName] = i; });
    var graph = modules.map(function(x) {
        var edges = x.dependencies.map(function(y) { return indices[y.moduleName]; });
        return {edges: edges};
    });
    var sortedIndices = topologicalSort(graph).reverse();
    return sortedIndices.map(function(i) { return modules[i]; });
};

exports.sortByDependency = sortByDependency;