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
 * set to the file contents or the contents of the files below the
 * directory.
 *
 * @param {String} dir
 * @param {String} p
 * @param {Object} _design
 * @param {Array} attachments
 * @param {Function} callback
 * @api public
 */

exports.loadProperties = function (dir, p, _design, attachments, callback) {
    var fullpath = path.join(dir, p);

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
                utils.setPropertyPath(_design, relpath, content.toString());
                callback();
            });
        });

    });
};


// load a package and all its dependencies:
// exports.loadPackageFull
