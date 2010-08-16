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

        // for each properties file / folder create a task to read it
        (dirs.properties || []).forEach(function (p) {
            tasks.push(async.apply(exports.loadProperties, d, p, _design));
        });

        // for each modules file / folder create a task to read it
        (dirs.modules || []).forEach(function (p) {
            tasks.push(async.apply(exports.loadFiles, d, p, _design, null));
        });

        // for each templates file / folder create a task to read it
        (dirs.templates || []).forEach(function (p) {
            tasks.push(async.apply(exports.loadTemplates, d, p, _design));
        });

        // for each attachments file / folder create a task to read it
        (dirs.attachments || []).forEach(function (p) {
            tasks.push(async.apply(exports.loadAttachments, d, p, _design));
        });

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
    exports.loadFiles(dir, p, _design, function (content) {
        return utils.stringifyFunctions( utils.evalSandboxed(content) );
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
    exports.loadFiles(dir, p, _design, function (content) {
        return "module.exports = " + sys.inspect(content) + ";";
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
 * set to the file contents optionally passed through a parser function.
 *
 * @param {String} dir
 * @param {String} p
 * @param {Object} _design
 * @param {Function} parser
 * @param {Function} callback
 * @api public
 */

exports.loadFiles = function (dir, p, _design, parser, callback) {
    var fullpath = path.join(dir, p);

    // if no parser is specified, then simply return the contents unaltered
    parser = parser || function (x) {
        return x;
    };

    utils.descendants(fullpath, function (err, files) {
        if(err) return callback(err);

        // if a directory with no files, return with the design doc unmodified
        if(!files) return callback();
        // if the path was a filename not a directory, force into array
        if(!(files instanceof Array)) files = [files];

        files.forEach(function (f) {
            fs.readFile(f, function (err, content) {
                if(err) return callback(err);
                var relpath = utils.relpath(f, dir);
                var val = parser(content.toString());
                utils.setPropertyPath(_design, relpath, val);
                callback();
            });
        });

    });
};


// load a package and all its dependencies:
// exports.loadPackageFull
