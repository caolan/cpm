/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var path = require('path'),
    fs = require('fs'),
    async = require('async'),
    _ = require('underscore')._;

/**
 * Converts a relative file path to properties on an object, and assigns a
 * value to that property. SIDE EFFECTS: modifies original 'obj' argument!
 *
 * Examples: some/test/file.js  =>  {some: {test: {file: ...} } }
 *
 * @prop {Object} obj
 * @prop {String} p
 * @prop val
 * @return val
 * @api public
 */

exports.setPropertyPath = function (obj, p, val) {
    // normalize to remove unessecary . and .. from paths
    var parts = path.normalize(p).split('/');

    // loop through all parts of the path except the last, creating the
    // properties if they don't exist
    var prop = parts.slice(0, parts.length-1).reduce(function (a, x) {
        if(a[x] === undefined) a[x] = {};
        return a = a[x];
    }, obj);

    // set the final property to the given value
    var key = exports.propertyName(parts[parts.length-1]);
    return prop[key] = val;
};

/**
 * Converts .js filename to property name.
 * Example:
 *      "path/to/module.js"  =>  "module"
 *
 * @param {String} p
 * @return {String}
 * @api public
 */

exports.propertyName = function (p) {
    return path.basename(p).replace(/\.js$/, '');
};

/**
 * List all files below a given path, recursing through subdirectories.
 *
 * @param {String} p
 * @param {Function} callback
 * @api public
 */

exports.descendants = function (p, callback) {
    fs.stat(p, function (err, stats) {
        if(err) return callback(err);
        if(stats.isDirectory()){
            fs.readdir(p, function (err, files) {
                if(err) return callback(err);
                var paths = files.map(function (f) {
                    return path.join(p,f);
                });
                async.map(paths, exports.descendants, function (err, files) {
                    if(err) callback(err);
                    else    callback(err, _.flatten(files));
                });
            });
        }
        else if(stats.isFile()){
            callback(null, p);
        }
    });
};

/**
 * Read a file from the filesystem and parse as JSON
 *
 * @param {String} path
 * @param {Function} callback
 * @api public
 */

exports.readJSON = function (path, callback) {
    fs.readFile(path, function (err, content) {
        try       { callback(err, err ? null: JSON.parse(content.toString())); }
        catch (e) { callback(e, null); }
    });
};
