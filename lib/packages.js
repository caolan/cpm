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
    async = require('async'),
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

        var dirs = pkg.directories || {},
            _design = {_attachments: {}},
            tasks = [];

        function createTasks(arr, fn) {
            (arr || []).forEach(function (p) {
                tasks.push(async.apply(fn, d, p, _design));
            });
        }

        // for each file / folder type create a task to read it
        createTasks(dirs.properties,  exports.loadProperties);
        createTasks(dirs.modules,     exports.loadModules);
        createTasks(dirs.templates,   exports.loadTemplates);
        createTasks(dirs.attachments, exports.loadAttachments);

        // perform the list of tasks in parallel
        async.parallel(tasks, function (err) {
            _design.package = pkg;
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
        parser: function (content) {
            return utils.stringifyFunctions( utils.evalSandboxed(content) );
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
                var val = options.parser(content.toString());
                utils.setPropertyPath(_design, relpath, val);
                callback();
            });
        }, callback);

    });
};

exports.loadApp = function (packages, appname, target) {
    var app = modules.require({}, packages, '/' + appname, target);
    var _design = packages[appname];

    function redirectTo() {
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

    if (app.shows) {
        _design.shows = _design.shows || {};
        Object.keys(app.shows).forEach(function (k) {
            _design.shows[k] = redirectTo('shows', k);
        });
    }
    if (app.lists) {
        _design.lists = _design.lists || {};
        Object.keys(app.lists).forEach(function (k) {
            _design.lists[k] = redirectTo('lists', k);
        });
    }
    if (app.updates) {
        _design.updates = _design.updates || {};
        Object.keys(app.updates).forEach(function (k) {
            _design.updates[k] = redirectTo('updates', k);
        });
    }
    if (app.rewrites) {
        _design.rewrites = _design.rewrites || {};
        Object.keys(app.rewrites).forEach(function (k) {
            _design.rewrites[k] = app.rewrites[k];
        });
    }
    if (app.validate_doc_update) {
        _design.validate_doc_update = utils.stringifyFunctions(
            app.validate_doc_update
        );
    }
};

// load a package and all its dependencies:
// exports.loadPackageFull
