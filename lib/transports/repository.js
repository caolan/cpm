/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var couchdb = require('../couchdb'),
    logger = require('../logger'),
    async = require('../../deps/async'),
    path = require('path'),
    url = require('url');

/**
 * Given a settings object, resolve the repository instance information from a
 * string. Used for parsing repositories from command line arguments.
 *
 * @param {Object} settings
 * @param {String} str
 * @returns {Object}
 * @api public
 */

exports.resolveInstance = function (settings, str) {
    if (str) {
        if (str in settings.repositories) {
            // a named repository from settings
            var ins = settings.repositories[str];
            //ins.protocol = ins.protocol || 'http:';
            //ins.slashes = true;
            return ins;
        }
        else {
            return str;
            // a repository URL
            /*var parsed = url.parse(str);
            return {
                protocol: parsed.protocol || 'http:',
                slashes: true,
                hostname: parsed.hostname,
                port: parsed.port,
                db: (parsed.pathname || '').substr(1)
            };*/
        }
    }
    // use default repository
    var ins = settings.repositories[settings.default_repository];
    ins.protocol = ins.protocol || 'http:';
    ins.slashes = true;
    return ins;
};

/**
 * Fetch dependencies for a package, returning an object including the orignal
 * package and all dependencies keyed by package name.
 *
 * @param {Object} settings
 * @param {Object} pkg
 * @param {Function} callback
 * @api public
 */

exports.fetchDeps = function (settings, pkg, callback) {
    var pkgs = {};
    pkgs[pkg.package.name] = pkg;
    var deps = Object.keys(pkg.package.dependencies || {});
    logger.debug('loading dependencies:', deps);

    async.forEach(deps, function (d, cb) {
        var ver = pkg.package.dependencies[d];
        exports.getByVersion(settings, d, ver, function (err, pkg) {
            if (err) return cb(err);
            pkgs[pkg.package.name] = pkg;
            cb();
        });
    },
    function (err) { callback(err, pkgs); });
};

/**
 * Lookup the id for a package at a specific version (defaulting to the
 * highest available version).
 *
 * @param {Object} instance
 * @param {String} pkg
 * @param {String} ver
 * @param {Function} callback
 * @api public
 */

exports.getPackageID = function (instance, pkg, /*optional*/ver, callback) {
    logger.debug('getPackageID:', pkg + ' ' + ver);
    if (arguments.length < 4) {
        callback = ver;
        ver = null;
    }
    var url = '_design/repository/_view/packages';
    var q = {};
    if (ver) {
        if (ver instanceof Array) {
            ver = ver.sort();
            var lowest = ver[0];
            ver = ver.reverse();
            var highest = ver[0];
            q.startkey = '["' + pkg + '", "' + lowest + '"]';
            q.endkey = '["' + pkg + '", "' + highest + '"]';
        }
        else {
            q.endkey = q.startkey = '["' + pkg + '", "' + ver + '"]';
        }
    }
    else {
        q.startkey = '["' + pkg + '"]';
        q.endkey = '["' + pkg + '", {}]';
    }

    couchdb(instance).get(url, q, function(err, data) {
        if (err) return callback(err);
        var rows = data.rows;
        if (!rows.length) {
            return callback(new Error(
                'Could not find package: ' + pkg + (ver ? ' (' + ver + ')': '')
            ));
        }
        // sort rows by version number, highest to lowest
        rows = rows.sort(function (a, b) {
            if(a.key[1] < b.key[1]) return 1;
            if(a.key[1] > b.key[1]) return -1;
            return 0;
        });
        logger.debug('rows:', rows);

        if (ver instanceof Array) {
            for (var i = 0; i < rows.length; i++) {
                if (ver.indexOf(rows[i].key[1]) !== 1) {
                    return callback(null, rows[i].value);
                }
            }
            return callback(new Error(
                'Could not find package: ' + pkg + ' (' + ver.join(', ') + ')'
            ));
        }
        else callback(null, rows[0].value);
    });
};

/**
 * Retrieve a package from the repository.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 * @api public
 */

exports.getPackage = function (settings, loc, callback) {
    var split = exports.splitLocation(loc);
    exports.getByVersion(settings, split.name, split.version, callback);
};

/**
 * Retrieve a package and all its dependencies.
 *
 * @param {Object} settings
 * @param {Object} loc
 * @param {Function} callback
 * @api public
 */

exports.getPackageFull = function (settings, loc, callback) {
    exports.getPackage(settings, loc, function (err, pkg) {
        if (err) return callback(err);
        exports.fetchDeps(settings, pkg, function (err, pkgs) {
            callback(err, pkg, pkgs);
        });
    });
};

/**
 * Split a repository location into a package name and version.
 *
 * @param {String} loc
 * @return {Object}
 * @api public
 */

exports.splitLocation = function (loc) {
    var split = loc.split('@');
    return {
        name: split[0],
        version: (split.length < 2) ? null: split[1]
    };
};

/**
 * Load package metadata (the info that would be contained in package.json).
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 * @api public
 */

exports.getMetadata = function (settings, loc, callback) {
    exports.getPackage(settings, loc, function (err, doc) {
        if (err) return callback(err);
        callback(null, doc.package);
    });
};

/**
 * Publish package to a repository.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Object} pkg
 * @param {Function} callback
 * @api public
 */

exports.putPackage = function (settings, loc, pkg, callback) {
    var ins = exports.resolveInstance(settings, '');

    var id = pkg.package.name + '-' + pkg.package.version;
    var attachments = pkg._attachments;
    delete pkg._attachments;

    var db = couchdb(ins);
    db.save(id, pkg, {}, function (err, d) {
        if (err) return callback(err);
        var keys = Object.keys(attachments);
        async.reduce(keys, d.rev, function (rev, k, cb) {
            var path = d.id + '/' + k;
            db.upload(path, attachments[k], rev, function (err, r) {
                if(!err) logger.info('uploaded', attachments[k]);
                cb(err, r);
            });
        }, callback);
    });
};

/**
 * Unpublish a package from a repository.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 * @api public
 */

exports.deletePackage = function (settings, loc, callback) {
    var ins = exports.resolveInstance(settings, '');

    var split = exports.splitLocation(loc);
    var name = split.name;
    var ver = split.version;

    exports.getPackageID(ins, name, ver, function (err, id) {
        if (err) return callback(err);
        couchdb(ins).delete(id, null, {force: true}, callback);
    });
};

/**
 * Lists available packages in a repository, returning an object keyed by
 * package name with the value a list of available versions.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 * @api public
 */

exports.list = function (settings, loc, callback) {
    var ins = exports.resolveInstance(settings, '');

    couchdb(ins).get('_design/repository/_view/packages',
        function(err, data) {
            if (err) return callback(err);
            var packages = data.rows.reduce(function (packages, r) {
                if (!packages[r.key[0]]) {
                    packages[r.key[0]] = [];
                }
                packages[r.key[0]].push(r.key[1]);
                return packages;
            }, {});
            callback(null, packages);
        }
    );
};

/**
 * Given a version or range of versions, attempt to get the most recent
 * matching package from the repository.
 *
 * @param {Object} settings
 * @param {String} name
 * @param versions
 * @param {Function} callback
 * @api public
 */

exports.getByVersion = function (settings, name, versions, callback) {
    var ins = exports.resolveInstance(settings, '');

    exports.getPackageID(ins, name, versions, function (err, id) {
        if (err) return callback(err);

        couchdb(ins).get(id, function (err, doc) {
            if (err) return callback(err);

            var id = doc._id;
            delete doc._rev;
            delete doc._id;
            // rewrite attachments
            ins.pathname = ins.db;
            var ins_url = url.format(ins);
            var keys = Object.keys(doc._attachments || {});
            doc._attachments = keys.reduce(function (acc, k) {
                acc[k] = ins_url + '/' + id + '/' + k;
                return acc;
            }, {});

            callback(null, doc);
        });
    });
};
