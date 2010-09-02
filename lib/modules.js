/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var path = require('path'),
    logger = require('./logger'),
    async = require('../deps/async'),
    Script = process.binding('evals').Script;


/**
 * Loads a commonjs module from the loaded design documents, returning
 * the exported properties. The current_dir and target parameters are not the
 * path of the module on the filesystem, but rather the path of the module
 * within couchdb.
 *
 * @param {Object} module_cache
 * @param {Object} packages
 * @param {String} current_dir
 * @param {String} target
 */

exports.require = function (module_cache, packages, current_dir, target) {
    logger.debug('require:', current_dir + '/' + target);
    var p = path.normalize(path.join(current_dir, target));
    if (module_cache[p]) return module_cache[p];

    var nodes = p.split('/').slice(1);
    var content = nodes.reduce(function (a, x) {
        if (a[x] === undefined) {
            throw new Error('Could not require module: ' + target);
        }
        return a = a[x];
    }, packages);

    var sandbox = {
        module: {exports: {}},
        require: async.apply(
            exports.require, module_cache, packages, path.dirname(p)
        )
    };
    sandbox.exports = sandbox.module.exports;

    try {
        var s = new Script(content).runInNewContext(sandbox);
    }
    catch (e) {
        var stack = e.stack.split('\n').slice(0,1).concat(['\tin '+p.slice(1)]);
        e.stack = stack.join('\n');
        throw e;
    }
    module_cache[p] = sandbox.module.exports;
    return module_cache[p];
};
