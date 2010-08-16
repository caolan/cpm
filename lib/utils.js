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
    return prop[path.basename(_.last(parts), '.js')] = val;
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

/**
 * Returns the absolute path 'p1' relative to the absolute path 'p2'. If 'p1'
 * is already relative it is returned unchanged.
 *
 * @param {String} p1
 * @param {String} p2
 * @return {String}
 * @api public
 */

exports.relpath = function (p1, p2) {
    var p1n = path.normalizeArray(p1.split('/')),
        p2n = path.normalizeArray(p2.split('/'));

    // if path is not absolute return it unchanged
    if(p1n[0] !== '') return p1;

    while (p1n.length && p2n.length && p1n[0] === p2n[0]) {
        p1n.shift();
        p2n.shift();
    }

    // if p1 is not a sub-path of p2, then we need to add some ..
    for (var i = 0; i < p2n.length; i++) {
        p1n.unshift('..');
    };

    return path.join.apply(null, p1n);
};

/**
 * Recurses through the properties of an object, converting all functions to
 * strings representing their source code. Returns a JSON-compatible object
 * that will work with JSON.stringify.
 *
 * @param {Object} obj
 * @return {Object}
 * @api public
 */

exports.stringifyFunctions = function (obj) {
    if (obj instanceof Function) {
        return obj.toString();
    }
    if (typeof obj === 'object') {
        for (var k in obj) {
            obj[k] = exports.stringifyFunctions(obj[k]);
        }
    }
    return obj;
}
