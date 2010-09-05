/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var utils = require('../../lib/utils'),
    async = require('../../deps/async'),
    modules = require('../modules'),
    couchdb = require('../couchdb'),
    logger = require('../logger'),
    transports = require('../transports'),
    path = require('path'),
    sys = require('sys'),
    url = require('url'),
    fs = require('fs');

/**
 * Read package.json and load associated files, returning the design doc
 * and an object representing all loaded packages. Accepts a directory
 * path as the second argument.
 *
 * @param {Object} settings
 * @param {String} d
 * @param {Function} callback
 * @api public
 */

exports.getPackageFull = function (settings, d, callback) {
    var metadata = path.join(d, 'package.json');
    // remove trailing slash and make dir absolute
    d = utils.abspath(d.replace(/\/$/, ''));

    utils.readJSON(metadata, function(err, pkg){
        if(err) return callback(err);

        // ensure package.json includes the correct information
        try { exports.validate(pkg); }
        catch (e) { return callback(e); }

        var dirs = pkg.paths || {};
        var tasks = [];
        var _design = {
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

            logger.debug('_design:', _design);

            var repository = transports.repository;
            repository.fetchDeps(settings, _design, function (err, pkgs) {
                if (err) return callback(err);
                logger.debug('packages:', pkgs);
                if (pkg.app) exports.loadApp(pkgs, pkg.name, pkg.app);
                callback(err, _design, pkgs);
            });

        });

    });
};

// need to get dependencies in order to execute app modules
exports.getPackage = exports.getPackageFull;

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

/**
 * Parse the properties of the target app module and update the design doc
 * to call supported functions in the context of the module and concatenate
 * the rewrites array to any existing rewrites.
 *
 * @param {Object} packages
 * @param {String} appname
 * @param {String} target
 * @api public
 */

exports.loadApp = function (packages, appname, target) {
    var app = modules.require({}, packages, '/' + appname, target);
    var _design = packages[appname];

    // functions that should be redirected to call the app module version
    var redirect_attrs = [
        'shows',
        'lists',
        'updates',
        'validate_doc_update'
    ];
    redirect_attrs.forEach(function (attr) {
        exports.redirect(app, _design, target, [attr]);
    });

    // copy redirects to design doc
    if (app.rewrites) {
        _design.rewrites = (_design.rewrites || []).concat(app.rewrites);
    }
};

/**
 * Generates corresponding functions in the design doc which call the
 * original functions in the app module. So that _design[attr] will
 * call require(module)[attr] and return the result.
 *
 * If the attribute is an object, it redirects each of its properties
 * (this is the case for show, list and update functions).
 *
 * @param {Object} app
 * @param {Object} design
 * @param {String} module
 * @param {Array} props
 * @api public
 */

exports.redirect = function (app, _design, module, props) {
    // find value of property path in app module
    var x = props.reduce(function (a, x) { return a[x]; }, app);

    switch (typeof x) {
        case 'undefined':
            // ignore undefined attributes
            return;
        case 'object':
            // if its an object, redirect each property
            for (var k in x) {
                // commonjs module paths are only relative to other
                // modules, not relative to functions like views / shows etc
                //var m = '../' + module;
                //exports.redirect(app, _design, m, props.concat([k]));
                exports.redirect(app, _design, module, props.concat([k]));
            }
            break;
        case 'function':
            // functions should be redirected
            var path = props.join('/');
            var fn = exports.redirectFn(module, props);
            utils.setPropertyPath(_design, path, fn);
            break;
        default:
            throw new Error('Cannot redirect type: ' + typeof x);
    }
};

/**
 * Generates a function which calls another function in a commonjs
 * module accessible from the design doc.
 *
 * @param {String} module
 * @param {Array} props
 * @return {String}
 * @api public
 */

exports.redirectFn = function (module, props) {
    var str = 'function () {\n' +
    '    var args = Array.prototype.slice.call(arguments);\n' +
    '    var fn = require("' + module + '")';
    props.forEach(function (k) { str += '["' + k + '"]'; });
    str += ';\n' +
    '    return fn.apply(this, args);\n' +
    '}';
    return str;
};

/**
 * Load package metadata from package.json
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 * @api public
 */

exports.getMetadata = function (settings, loc, callback) {
    utils.readJSON(path.join(loc, 'package.json'), callback);
};

/**
 * Expands a package in _design doc format to files on the filesystem.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Object} pkg
 * @param {Function} callback
 * @api public
 */

exports.putPackage = function (settings, loc, pkg, callback) {
    // default to using package name as destination directory
    dir = loc || pkg.package.name;

    // create the output directory, throw if it already exists
    fs.mkdir(dir, 0755, function (err) {
        if (err) return callback(err);
        async.parallel([
            // parse each filename stored in package and write to disk
            async.apply(async.forEach, pkg.cpm.files, function (f, cb) {
                propertyToFile(dir, pkg, f, cb);
            }),
            // generate package.json in the ouput directory
            function (cb) {
                try { var val = JSON.stringify(pkg.package,null,4) + '\n'; }
                catch (e) { return cb(e); }
                fs.writeFile(path.join(dir, 'package.json'), val, cb);
            }
        ], callback);
    });
};

/**
 * Converts a property to the contents of the file that would represent it,
 * and saves the file to disk. Attachments are streamed. Used by the clone
 * function.
 *
 * @param {String} dir
 * @param {Object} pkg
 * @param {String} f
 * @param {Function} callback
 * @return {String}
 * @api private
 */

function propertyToFile(dir, pkg, f, callback) {
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
            writeAttachment(pkg, f, fullpath, callback);
            break;
        default:
            callback(new Error('Unknown property type: ' + f));
    }
}

/**
 * Stream attachment from package and save to file.
 * Used by propertyToFile.
 *
 * @param {Object} pkg
 * @param {String} f
 * @param {String} output
 * @param {Function} callback
 * @api private
 */

function writeAttachment(pkg, f, output, callback) {
    // ensure the parent directories of the output filename exist
    utils.ensureDir(path.dirname(output), function (err) {
        if (err) return callback(err);

        var loc = pkg._attachments[f];
        switch (transports.locationType(loc)) {
            case 'db':
                var ins = transports.db.resolveInstance({instances:{}}, loc);
                try { couchdb.validateInstance(ins); }
                catch (e) { return callback(e); }

                // stream the attachment from couchdb to the output file
                couchdb.download(ins, ins.doc, output, callback);
                break;
            case 'filesystem':
                // cp files
                utils.cp(loc, output, callback);
                break;
            default:
                callback(
                    new Error('Unknown location type for attachment: ' + f)
                );
        }
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

/**
 * Ensure package.json is in a valid format. Throws exception on
 * validation error.
 *
 * @param {Object} pkg
 * @api public
 */

exports.validate = function (pkg) {
    if(!pkg.name) throw new Error('package.json must include a name');
    if(!pkg.version) throw new Error('package.json must include a version');
    if(!pkg.description) {
        throw new Error('package.json must include a description');
    }
};
