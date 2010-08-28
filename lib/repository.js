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
 * Publish pacakges to a repository.
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

exports.unpublish = function (instance, name, version, callback) {
    var path = name + '-' + version;
    couchdb.delete(instance, path, null, {force: true}, callback);
};

/**
 * Lists available packages in a repository, returning a list of objects
 * containing the package name and a list of available versions.
 *
 * @param {Object} instance
 * @param {Function} callback
 * @api public
 */

exports.list = function (instance, callback) {
    couchdb.get(instance, '_design/repository/_view/packages', {group: "true"},
        function(err, data) {
            if (err) return callback(err);
            var list = data.rows.map(function (r) {
                return {
                    name: r.key,
                    versions: Object.keys(r.value)
                }
            }).sort(function (a, b) {
                return a.name - b.name;
            });
            callback(null, list);
        }
    );
};

exports.info = function (instance, pkg, ver, callback) {
    var q = {group: "true", key: '"' + pkg + '"'};
    var url = '_design/repository/_view/packages';

    couchdb.get(instance, url, q, function(err, data) {
        if (err) return callback(err);
        if (!data.rows.length) {
            return callback(new Error('Could not find package: ' + pkg));
        }
        if (!data.rows[0].value[ver]) {
            return callback(new Error('Could not find version: ' + ver));
        }
        couchdb.get(instance, data.rows[0].value[ver], function (err, pkg) {
            if (err) return callback(err);
            callback(null, pkg.package);
        });
    });
};
