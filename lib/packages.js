/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var fs = require('fs'),
    sys = require('sys'),
    path = require('path'),
    logger = require('./logger'),
    async = require('../deps/async'),
    couchdb = require('./couchdb'),
    modules = require('./modules'),
    utils = require('./utils');

/**
 * Read package.json and load associated files, returning the parsed
 * package metadata and the design doc. Accepts a directory path as the
 * first argument.
 *
 * @param {String} d
 * @param {Function} callback
 * @api public
 */

exports.loadPackage = function (d, callback) {
    var metadata = path.join(d, 'package.json');
    utils.readJSON(metadata, function(err, pkg){

        if(err) return callback(err);

        var dirs = pkg.paths || {},
            _design = {_attachments: {}},
            tasks = [];

        function createTasks(arr, fn) {
            arr = arr || [];
            if (arr instanceof Array) {
                arr.forEach(function (p) {
                    tasks.push(async.apply(fn, d, p, _design));
                });
            }
            else tasks.push(async.apply(fn, d, arr, _design));
        }

        // for each file / folder type create a task to read it
        createTasks(dirs.properties,  exports.loadProperties);
        createTasks(dirs.modules,     exports.loadModules);
        createTasks(dirs.templates,   exports.loadTemplates);
        createTasks(dirs.attachments, exports.loadAttachments);

        // perform the list of tasks in parallel
        async.parallel(tasks, function (err) {
            _design.package = pkg;
            _design.language = "javascript";
            //_design._id = pkg.name;
            callback(err, pkg, _design);
        });

    });
};

/**
 * Creates a tree of properties representing the path passed to it,
 * adding these properties to the design document, with the value
 * set to the file contents eval'd with the functions stringified.
 *
 * @param {String} dir
 * @param {String} p
 * @param {Object} _design
 * @param {Function} callback
 * @api public
 */

exports.loadProperties = function (dir, p, _design, callback) {
    exports.loadFiles(dir, p, _design, {
        parser: function (content, f) {
            return utils.stringifyFunctions( utils.evalSandboxed(content, f) );
        },
        filter: function (filename) {
            return /\.js$/.exec(filename);
        }
    }, callback);
};

/**
 * Creates a tree of properties representing the path passed to it,
 * adding these properties to the design document, with the value
 * set to the file contents. Filters out non-js files.
 *
 * @param {String} dir
 * @param {String} p
 * @param {Object} _design
 * @param {Function} callback
 * @api public
 */

exports.loadModules = function (dir, p, _design, callback) {
    exports.loadFiles(dir, p, _design, {
        filter: function (filename) {
            return /\.js$/.exec(filename);
        }
    }, callback);
};

/**
 * Creates a tree of properties representing the path passed to it,
 * adding these properties to the design document, with the value of each
 * wrapped with an assignment to module.exports so it can be required
 * to retrieve the files contents.
 *
 * @param {String} dir
 * @param {String} p
 * @param {Object} _design
 * @param {Function} callback
 * @api public
 */

exports.loadTemplates = function (dir, p, _design, callback) {
    exports.loadFiles(dir, p, _design, {
        parser: function (content) {
            return "module.exports = " + sys.inspect(content) + ";";
        }
    }, callback);
};

/**
 * Adds the relative paths of all files below a directory to the _attachments
 * property of the design doc, recursing through all subdirectories.
 *
 * @param {String} dir
 * @param {String} p
 * @param {Object} _design
 * @param {Function} callback
 * @api public
 */

exports.loadAttachments = function (dir, p, _design, callback) {
    var fullpath = path.join(dir, p);

    utils.descendants(fullpath, function (err, files) {
        if(err) return callback(err);
        // if the path was a filename not a directory, force into array
        if(!(files instanceof Array)) files = [files];
        files.forEach(function (f) {
            _design._attachments[utils.relpath(f, dir)] = f;
        });
        callback();
    });

};

/**
 * Creates a tree of properties representing the path passed to it,
 * adding these properties to the design document, with the value
 * set to the file contents (optionally passed through a parser function).
 *
 * Options:
 *     parser - a function to apply to file contents before storing
 *     filter - a truth test to apply to the list of files before loading
 *
 * @param {String} dir
 * @param {String} p
 * @param {Object} _design
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

exports.loadFiles = function (dir, p, _design, options, callback) {
    var fullpath = path.join(dir, p);
    options = options || {};

    // if no parser is specified, then simply return the contents unaltered
    options.parser = options.parser || function (x) {
        return x;
    };

    utils.descendants(fullpath, function (err, files) {
        if(err) return callback(err);

        // if a directory with no files, return with the design doc unmodified
        if(!files) return callback();
        // if the path was a filename not a directory, force into array
        if(!(files instanceof Array)) files = [files];

        if(options.filter) files = files.filter(options.filter);

        async.forEach(files, function (f, callback) {
            fs.readFile(f, function (err, content) {
                if(err) return callback(err);
                var relpath = utils.relpath(f, dir);
                var val = options.parser(content.toString(), f);
                utils.setPropertyPath(_design, relpath, val);
                callback();
            });
        }, callback);

    });
};

exports.loadApp = function (packages, appname, target) {
    var app = modules.require({}, packages, '/' + appname, target);
    var _design = packages[appname];

    function redirectFn() {
        var args = Array.prototype.slice.call(arguments);
        var str = 'function () {\n' +
        '    var args = Array.prototype.call(arguments);\n' +
        '    var fn = require("../' + target + '")';
        args.forEach(function (k) { str += '["' + k + '"]'; });
        str += ';\n' +
        '    return fn.apply(this, args);\n' +
        '}';
        return str;
    };

    function redirectAttrs(name) {
        if (app[name]) {
            _design[name] = _design[name] || {};
            Object.keys(app[name]).forEach(function (k) {
                _design[name][k] = redirectFn(name, k);
            });
        }
    };
    redirectAttrs('shows');
    redirectAttrs('lists');
    redirectAttrs('updates');

    if (app.rewrites) {
        _design.rewrites = (_design.rewrites || []).concat(app.rewrites);
    }
    if (app.validate_doc_update) {
        if (!_design.validate_doc_update) {
            _design.validate_doc_update = utils.stringifyFunctions(
                app.validate_doc_update
            );
        }
        else throw new Error(
            'Could not load app: validate_doc_update already exists'
        );
    }
};

// load a package and all its dependencies:
// exports.loadPackageFull

exports.push = function (instance, packages, callback) {
    couchdb.ensureDB(instance, function (err) {
        async.forEach(Object.keys(packages), function (k, callback) {

            var id = '_design/' + k;
            var _design = packages[k];
            var attachments = _design._attachments;
            delete _design._attachments;

            couchdb.save(instance, id, _design, {force:true}, function (e, d) {
                if (e) return callback(e);
                var keys = Object.keys(attachments);
                async.reduce(keys, d._rev, function (rev, k, cb) {
                    var path = id + '/' + k;
                    couchdb.upload(
                        instance, path, attachments[k], rev, function (e, r) {
                            if(!e) logger.info('uploaded', attachments[k]);
                            cb(e, r);
                        }
                    );
                }, callback);
            });
        }, callback);
    });
};

exports.publish = function (instance, packages, callback) {
    async.forEach(Object.keys(packages), function (k, callback) {

        var _design = packages[k];
        var id = _design.package.name + '-' + _design.package.version;
        var attachments = _design._attachments;
        delete _design._attachments;

        couchdb.save(instance, id, _design, {}, function (e, d) {
            if (e) return callback(e);
            var keys = Object.keys(attachments);
            async.reduce(keys, d.rev, function (rev, k, cb) {
                var path = d.id + '/' + k;
                couchdb.upload(
                    instance, path, attachments[k], rev, function (err, r) {
                        if(!err) logger.info('uploaded', attachments[k]);
                        cb(err, r);
                    }
                );
            }, callback);
        });
    }, callback);
};

exports.unpublish = function (instance, name, version, callback) {
    var path = name + '-' + version;
    couchdb.delete(instance, path, null, {force: true}, callback);
};
