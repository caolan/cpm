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
            ins.protocol = ins.protocol || 'http:';
            ins.slashes = true;
            return ins;
        }
        else {
            // a repository URL
            var parsed = url.parse(str);
            return {
                protocol: parsed.protocol || 'http:',
                slashes: true,
                hostname: parsed.hostname,
                port: parsed.port,
                db: (parsed.pathname || '').substr(1)
            };
        }
    }
    // use default repository
    var ins = settings.repositories[settings.default_repository];
    ins.protocol = ins.protocol || 'http:';
    ins.slashes = true;
    return ins;
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
    if (arguments.length < 4) {
        callback = ver;
        ver = null;
    }
    var url = '_design/repository/_view/packages';
    var q = {
        startkey: ver ? '["' + pkg + '", "' + ver + '"]': '["' + pkg + '"]',
        endkey:   ver ? '["' + pkg + '", "' + ver + '"]': '["' + pkg + '", {}]'
    };
    couchdb.get(instance, url, q, function(err, data) {
        if (err) return callback(err);
        var rows = data.rows;
        if (!rows.length) {
            return callback(new Error(
                'Could not find package: ' + pkg + (ver ? ' (' + ver + ')': '')
            ));
        }
        // sort rows by version number, highest to lowest
        rows = rows.sort(function (a, b) {
            return b.key[1] - a.key[1];
        });
        var id = rows[0].value;
        callback(null, id);
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
    var ins = exports.resolveInstance(settings, '');
    try { couchdb.validateInstance(ins); }
    catch (e) { return callback(e); }

    var split = exports.splitLocation(loc);
    var pkg = split.name;
    var ver = split.version;

    exports.getPackageID(ins, pkg, ver, function (err, id) {
        if (err) return callback(err);

        couchdb.get(ins, id, function (err, doc) {
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
    try { couchdb.validateInstance(ins); }
    catch (e) { return callback(e); }

    var id = pkg.package.name + '-' + pkg.package.version;
    var attachments = pkg._attachments;
    delete pkg._attachments;

    couchdb.save(ins, id, pkg, {}, function (err, d) {
        if (err) return callback(err);
        var keys = Object.keys(attachments);
        async.reduce(keys, d.rev, function (rev, k, cb) {
            var path = d.id + '/' + k;
            couchdb.upload(
                ins, path, attachments[k], rev, function (err, r) {
                    if(!err) logger.info('uploaded', attachments[k]);
                    cb(err, r);
                }
            );
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
    try { couchdb.validateInstance(ins); }
    catch (e) { return callback(e); }

    var split = exports.splitLocation(loc);
    var name = split.name;
    var ver = split.version;

    exports.getPackageID(ins, name, ver, function (err, id) {
        if (err) return callback(err);
        couchdb.delete(ins, id, null, {force: true}, callback);
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
    try { couchdb.validateInstance(ins); }
    catch (e) { return callback(e); }

    couchdb.get(ins, '_design/repository/_view/packages',
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
