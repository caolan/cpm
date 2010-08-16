/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    utils = require('./utils');

/**
 * Read package.json and load associated files, returning the parsed
 * package metadata, the design doc and a list of attachments. Accepts
 * a directory path as the first argument.
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
            tasks = [],
            attachments = [],
            _design = {};

        // for each properties file / folder create a task to read it
        (dirs.properties || []).forEach(function (p) {
            tasks.push(async.apply(
                exports.loadProperties, d, p, _design, attachments
            ));
        });

        // for each modules file / folder create a task to read it
        (dirs.modules || []).forEach(function (p) {
            tasks.push(async.apply(
                exports.loadFiles, d, p, _design, attachments, null
            ));
        });

        // perform the list of tasks in parallel
        async.parallel(tasks, function (err) {
            _design.package = pkg;
            callback(err, pkg, _design, attachments);
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
 * @param {Array} attachments
 * @param {Function} callback
 * @api public
 */

exports.loadProperties = function (dir, p, _design, attachments, callback) {
    exports.loadFiles(dir, p, _design, attachments, function (content) {
        return utils.stringifyFunctions( utils.evalSandboxed(content) );
    }, callback);
};

/**
 * Creates a tree of properties representing the path passed to it,
 * adding these properties to the design document, with the value
 * set to the file contents optionally passed through a parser function.
 *
 * @param {String} dir
 * @param {String} p
 * @param {Object} _design
 * @param {Array} attachments
 * @param {Function} parser
 * @param {Function} callback
 * @api public
 */

exports.loadFiles = function (dir, p, _design, attachments, parser, callback) {
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
