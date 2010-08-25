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
            tasks = [],
            _design = {
                _attachments: {},
                cpm: {files: [], properties_files: {}}
            };

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
            _design.cpm.properties_files[utils.relpath(f, dir)] = content;
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
            var relpath = utils.relpath(f, dir);
            _design._attachments[relpath] = f;
            _design.cpm.files.push(relpath);
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
                _design.cpm.files.push(relpath);

                callback();
            });
        }, callback);

    });
};

exports.loadApp = function (packages, appname, target) {
    var app = modules.require({}, packages, '/' + appname, target);
    var _design = packages[appname];

    function redirectFn(module) {
        var args = Array.prototype.slice.call(arguments).slice(1);
        var str = 'function () {\n' +
        '    var args = Array.prototype.slice.call(arguments);\n' +
        '    var fn = require("' + module + '")';
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
                _design[name][k] = redirectFn('../' + target, name, k);
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
            _design.validate_doc_update = redirectFn(
                target, 'validate_doc_update'
            );
        }
        else throw new Error(
            'Could not load app: validate_doc_update already exists'
        );
    }
};

// load a package and all its dependencies:
// exports.loadPackageFull


/**
 * Expands a package in _design doc format to files on the filesystem.
 *
 * @param {Object} pkg
 * @param {String} dir
 * @param {Function} callback
 * @api public
 */

exports.clone = function (ins, id, dir, callback) {
    async.waterfall([
        // ensure the output directory exists
        async.apply(utils.ensureDir, dir),
        // fetch the package from couchdb
        async.apply(couchdb.get, ins, id),

        // start writing the files to disc
        function (pkg, respone, cb) {
            async.parallel([
                // parse each filename stored in package and write to disk
                async.apply(async.forEach, pkg.cpm.files, function (f, cb) {
                    propertyToFile(ins, id, dir, pkg, f, cb);
                }),
                // generate package.json in the ouput directory
                function (cb) {
                    try { var val = JSON.stringify(pkg.package,null,4) + '\n'; }
                    catch (e) { return cb(e); }
                    fs.writeFile(path.join(dir, 'package.json'), val, cb);
                }
            ], cb);
        }
    ], callback);
};

/**
 * Converts a property to the contents of the file that would represent it,
 * and saves the file to disk. Attachments are streamed. Used by the clone
 * function.
 *
 * @param {Object} ins
 * @param {String} id
 * @param {String} dir
 * @param {Object} pkg
 * @param {String} f
 * @param {Function} callback
 * @return {String}
 * @api private
 */

function propertyToFile(ins, id, dir, pkg, f, callback) {
    var fullpath = path.join(dir, f);

    // try to determine the type of the file based on the paths
    // property of package.json
    try { var type = exports.pathType(pkg, f); }
    catch (e) { return callback(e); }

    switch (type) {
        case 'modules':
            writeModule(pkg, f, fullpath, callback);
            break;
        case 'properties':
            writePropertiesFile(pkg, f, fullpath, callback);
            break;
        case 'templates':
            writeTemplate(pkg, f, fullpath, callback);
            break;
        case 'attachments':
            writeAttachment(ins, path.join(id, f), fullpath, callback);
            break;
        default:
            callback(new Error('Unknown property type: ' + f));
    }
}

/**
 * Stream attachment from package and save to file.
 * Used by propertyToFile.
 *
 * @param {Object} ins
 * @param {String} url
 * @param {String} output
 * @param {Function} callback
 * @api private
 */

function writeAttachment(ins, url, output, callback) {
    // ensure the parent directories of the output filename exist
    utils.ensureDir(path.dirname(output), function (err) {
        if (err) return callback(err);

        // stream the attachment from couchdb to the output file
        couchdb.download(ins, url, output, callback);
    });
}

/**
 * Read module source from package and write to file.
 * Used by propertyToFile.
 *
 * @param {Object} pkg
 * @param {String} p
 * @param {String} output
 * @param {Function} callback
 * @api private
 */

function writeModule(pkg, p, output, callback) {
    // get module source from package
    try { var val = utils.getPropertyPath(pkg, p.replace(/\.js$/, '')); }
    catch (e) { return callback(e); }

    // ensure the parent directories of the output filename exist
    utils.ensureDir(path.dirname(output), function (err) {
        if (err) return callback(err);

        // write the module source to the output file
        fs.writeFile(output, val, callback);
    });
}

/**
 * Read properties file source from package and write to file.
 * Used by propertyToFile.
 *
 * @param {Object} pkg
 * @param {String} p
 * @param {String} output
 * @param {Function} callback
 * @api private
 */

function writePropertiesFile(pkg, p, output, callback) {
    // ensure the parent directories of the output filename exist
    utils.ensureDir(path.dirname(output), function (err) {
        if (err) return callback(err);

        // write the module source to the output file
        fs.writeFile(output, pkg.cpm.properties_files[p], callback);
    });
}

/**
 * Read a template from a package and write to file.
 * Used by propertyToFile.
 *
 * @param {Object} pkg
 * @param {String} p
 * @param {String} output
 * @param {Function} callback
 * @api private
 */

function writeTemplate(pkg, p, output, callback) {
    // require module from package to evaluate it and return
    // the exported template string
    try { var val = modules.require({}, {pkg: pkg}, '/pkg', p); }
    catch (e) { return callback(e); }

    // ensure the parent directories of the output filename exist
    utils.ensureDir(path.dirname(output), function (err) {
        if (err) return callback(err);

        // write the module source to the output file
        fs.writeFile(output, val, callback);
    });
}

/**
 * Compares a path against the paths property on the package, returning
 * the path type ('modules', 'properties', 'attachments', or 'templates').
 *
 * @param {Object} pkg
 * @param {String} p
 * @return {String}
 * @api public
 */

exports.pathType = function (pkg, p) {
    // normalize to remove unessecary . and .. from paths
    var parts = path.normalize(p).split('/');

    for (var type in pkg.package.paths) {

        // get the list of paths for this type
        var paths = pkg.package.paths[type];
        if(typeof paths === 'string') {
            // force path to an array
            paths = [paths];
        }

        // for each path of this type
        for (var i = 0; i < paths.length; i++) {
            var x = paths[i];
            // test if target is a sub-path
            if (x === parts.slice(0, x.split('/').length).join('/')) {
                return type;
            }
        };
    }

    throw new Error('Cannot determine type of path: ' + p);
};
