/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var path = require('path'),
    url = require('url'),
    fs = require('fs'),
    sys = require('sys'),
    couchdb = require('./couchdb'),
    async = require('../deps/async'),
    child_process = require('child_process'),
    Script = process.binding('evals').Script,
    _ = require('../deps/underscore/underscore')._;

/**
 * Converts a relative file path to properties on an object, and assigns a
 * value to that property. SIDE EFFECTS: modifies original 'obj' argument!
 *
 * Examples: some/test/file.js  =>  {some: {test: {file: ...} } }
 *
 * @param {Object} obj
 * @param {String} p
 * @param val
 * @return val
 * @see getPropertyPath
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
 * Converts a relative file path to properties on an object, and returns
 * the value of that property.
 *
 * @param {Object} obj
 * @param {String} p
 * @see setPropertyPath
 * @api public
 */

exports.getPropertyPath = function (obj, p) {
    // normalize to remove unessecary . and .. from paths
    var parts = path.normalize(p).split('/');

    // if path is empty, return the root object
    if (!p) return obj;

    // loop through all parts of the path, throwing an exception
    // if a property doesn't exist
    return parts.reduce(function (a, x) {
        if(a[x] === undefined) throw new Error('Invalid path: ' + p);
        return a = a[x];
    }, obj);
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
        if (err) return callback(err);
        try {
            var val = JSON.parse(content.toString());
        }
        catch (e) {
            var stack = e.stack.split('\n').slice(0,1).concat(['\tin ' + path]);
            e.stack = stack.join('\n');
            return callback(e, null);
        }
        callback(null, val);
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
    if (typeof obj === 'function' || obj instanceof Function) {
        return obj.toString();
    }
    if (typeof obj === 'object') {
        for (var k in obj) {
            obj[k] = exports.stringifyFunctions(obj[k]);
        }
    }
    return obj;
};

/**
 * Evals object literals used in properties files. The code is wrapped in
 * parenthesis for a more natural writing style and evaluated in a new
 * context to avoid interfering with the current scope.
 *
 * @param {String} code
 * @param {String} filename
 * @api public
 */

exports.evalSandboxed = function (code, filename) {
    try {
        var s = new Script('(' + code + ')', filename);
        return s.runInNewContext({});
    }
    catch (e) {
        var stack = e.stack.split('\n').slice(0,1).concat(['\tin ' + filename]);
        e.stack = stack.join('\n');
        throw e;
    }
};

/**
 * Pads a string to minlength by appending spaces.
 *
 * @param {String} str
 * @param {Number} minlength
 * @return {String}
 * @api public
 */

exports.padRight = function (str, minlength) {
    while (str.length < minlength) str += ' ';
    return str;
};

/**
 * Ensures a directory exists using mkdir -p.
 *
 * @param {String} path
 * @param {Function} callback
 * @api public
 */

exports.ensureDir = function (path, callback) {
    var mkdir = child_process.spawn('mkdir', ['-p', path]);
    mkdir.on('error', function (err) {
        callback(err);
        callback = function(){};
    });
    mkdir.on('exit', function (code) {
        if (code === 0) callback();
        else callback(new Error('mkdir exited with code: ' + code));
    });
};

/**
 * Stream the contents of one file to another.
 *
 * @param {String} from
 * @param {String} to
 * @param {Function} callback
 * @api public
 */

exports.cp = function (from, to, callback) {
    var rstream = fs.createReadStream(from);
    rstream.on('open', function () {
        var wstream = fs.createWriteStream(to);
        wstream.on('error', function (err) {
            callback(err);
            callback = function(){};
        });
        // TODO: sometimes the file is not written when this callback fires!
        // usually not a problem as this is only called when doing clone from
        // the filesystem to another place on the filesystem, so after the copy
        // nothing more is done with the file. (node v0.2.0)
        // UPDATE: I've also noticed it sometimes writes the contents to the
        // target file twice in unit tests. This *is* a problem, even for
        // clones from the filesystem!
        sys.pump(rstream, wstream, callback);
    });
    rstream.on('error', function (err) {
        callback(err);
        callback = function(){};
    });
};

/**
 * Returns absolute version of a path. Relative paths are interpreted
 * relative to process.cwd() or the cwd parameter. Paths that are already
 * absolute are returned unaltered.
 *
 * @param {String} p
 * @param {String} cwd
 * @return {String}
 * @api public
 */

exports.abspath = function (p, /*optional*/cwd) {
    if (p[0] === '/') return p;
    cwd = cwd || process.cwd();
    return path.normalize(path.join(cwd, p));
};
