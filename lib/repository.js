/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var url = require('url'),
    async = require('../deps/async'),
    logger = require('./logger'),
    couchdb = require('./couchdb');

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
            return settings.repositories[str];
        }
        else {
            // a repository URL
            var parsed = url.parse(str);
            return {
                hostname: parsed.hostname,
                port: parsed.port,
                db: (parsed.pathname || '').substr(1)
            };
        }
    }
    // use default repository
    return settings.repositories[settings.default_repository];
};

/**
 * Publish packages to a repository.
 *
 * @param {Object} instance
 * @param {Array} packages
 * @param {Function} callback
 * @api public
 */

exports.publish = function (instance, packages, callback) {
    async.forEach(Object.keys(packages), function (k, callback) {

        var _design = packages[k];
        var id = _design.package.name + '-' + _design.package.version;
        var attachments = _design._attachments;
        delete _design._attachments;

        couchdb.save(instance, id, _design, {}, function (e, d) {
            if (e) return callback(e);
            var keys = Object.keys(attachments);
            async.reduce(keys, d.rev, function (rev, k, cb) {
                var path = d.id + '/' + k;
                couchdb.upload(
                    instance, path, attachments[k], rev, function (err, r) {
                        if(!err) logger.info('uploaded', attachments[k]);
                        cb(err, r);
                    }
                );
            }, callback);
        });
    }, callback);
};

/**
 * Unpublish a package from a repository.
 *
 * @param {Object} instance
 * @param {String} name
 * @param {String} version
 * @param {Function} callback
 * @api public
 */

exports.unpublish = function (instance, name, ver, callback) {
    if (arguments.length < 4) {
        callback = ver;
        ver = null;
    }
    exports.getPackageID(instance, name, /*optional*/ver, function (err, id) {
        if (err) return callback(err);
        couchdb.delete(instance, id, null, {force: true}, callback);
    });
};

/**
 * Lists available packages in a repository, returning an object keyed by
 * package name with the vlaue a list of available versions.
 *
 * @param {Object} instance
 * @param {Function} callback
 * @api public
 */

exports.list = function (instance, callback) {
    couchdb.get(instance, '_design/repository/_view/packages',
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

exports.getPackage = function (instance, pkg, /*optional*/ver, callback) {
    if (arguments.length < 4) {
        callback = ver;
        ver = null;
    }
    exports.getPackageID(instance, pkg, /*optional*/ver, function (err, id) {
        if (err) return callback(err);

        couchdb.get(instance, id, function (err, doc) {
            if (err) return callback(err);
            delete doc._rev;
            delete doc._id;
            callback(null, doc);
        });
    });
};

exports.splitLocation = function (loc) {
    var split = loc.split('@');
    return {
        name: split[0],
        version: (split.length < 2) ? null: split[1]
    };
};
