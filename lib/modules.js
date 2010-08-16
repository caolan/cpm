/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var path = require('path'),
    Script = process.binding('evals').Script;


/**
 * Loads a commonjs module from the loaded design documents, returning
 * the exported properties.
 *
 * @param {Object} module_cache
 * @param {Object} packages
 * @param {String} current_dir
 * @param {String} target
 */

exports.require = function (module_cache, packages, current_dir, target) {
    var p = path.normalize(path.join(current_dir, target));
    if(module_cache[p]) return module_cache[p];

    var nodes = p.split('/').slice(1);
    var content = nodes.reduce(function (a, x) {
        if(a[x] === undefined) throw new Error('Cannot load ' + p);
        return a = a[x];
    }, packages);

    var sandbox = {module: {exports: {}}};
    sandbox.exports = sandbox.module.exports;

    var s = new Script(content).runInNewContext(sandbox);
    module_cache[p] = sandbox.module.exports;
    return module_cache[p];
};
