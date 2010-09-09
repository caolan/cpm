/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var url = require('url'),
    path = require('path'),
    logger = require('../logger'),
    couchdb = require('../couchdb'),
    async = require('../../deps/async');

/**
 * Given a settings object, resolve the instance information from a string.
 * Used for parsing instances from command line arguments.
 *
 * @param {Object} settings
 * @param {String} str
 * @returns {Object}
 * @api public
 */

exports.resolveInstance = function (settings, str) {
    logger.debug('db.resolveInstance', str);
    if (str) {
        if (str in settings.instances) {
            // a named instance from settings
            var ins = settings.instances[str];
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
                db: (parsed.pathname || '').split('/')[1],
                doc: (parsed.pathname || '').split('/').slice(2).join('/'),
            };*/
        }
    }
    return null;
};

/**
 * Get a package from the database.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 * @api public
 */

exports.getPackage = function (settings, loc, callback) {
    var ins = exports.resolveInstance(settings, loc);

    couchdb(ins).get('', function (err, doc) {
        if (err) return callback(err);

        // rewrite attachments
        var keys = Object.keys(doc._attachments || {});
        doc._attachments = keys.reduce(function (acc, k) {
            acc[k] = loc + '/' + k;
            return acc;
        }, {});
        callback(null, doc);
    });
};

/**
 * Get a package and all its dependencies from the database.
 * calls the callback with the design doc and an object representing all
 * loaded packages.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 * @api public
 */

exports.getPackageFull = function (settings, loc, callback) {
    exports.getPackage(settings, loc, function (err, pkg) {
        if (err) callback(err);
        transports.repository.fetchDeps(settings, pkg, function (err, pkgs) {
            callback(err, pkg, pkgs);
        });
    });
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
 * Upload packages to a CouchDB instance.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Object} pkg
 * @param {Function} callback
 * @api public
 */

exports.putPackage = function (settings, loc, pkg, callback) {
    var ins = exports.resolveInstance(settings, loc);
    var db = couchdb(ins);
    db.ensureDB(function (err) {
        if (err) return callback(err);

        var id = '_design/' + pkg.package.name;
        var _design = pkg;
        var attachments = _design._attachments;
        delete _design._attachments;

        db.save(id, _design, {force:true}, function (err, d) {
            if (err) return callback(err);

            var keys = Object.keys(attachments || {});
            async.reduce(keys, d._rev, function (rev, k, cb) {
                var path = id + '/' + k;
                db.upload(path, attachments[k], rev, function (err, r) {
                        if(!err) logger.info('uploaded', attachments[k]);
                        cb(err, r);
                    }
                );
            }, callback);
        });

    });
};

/**
 * Delete a pacakge from a CouchDB database.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 * @api public
 */

exports.deletePackage = function (settings, loc, callback) {
    var ins = exports.resolveInstance(settings, loc);
    couchdb(ins).delete('', null, {force: true}, callback);
};

/**
 * Lists packages installed on the database.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 * @api public
 */

exports.list = function (settings, loc, callback) {
    var ins = exports.resolveInstance(settings, loc);

    var q = {
        startkey: '"_design/"',
        endkey: '"_design0"',
        include_docs: 'true'
    };

    couchdb(ins).get('_all_docs', q, function (err, data) {
        if (err) return callback(err);
        var packages = data.rows.reduce(function (packages, r) {
            var key = r.key.replace(/_design\//, '');
            if (!packages[key]) {
                packages[key] = [];
            }
            packages[key].push(r.doc.package.version);
            return packages;
        }, {});
        callback(null, packages);
    });
};
