/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var async = require('../deps/async'),
    logger = require('./logger'),
    couchdb = require('./couchdb');

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
    if (str) {
        if (str in settings.instances) {
            // a named instance from settings
            return settings.instances[str];
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
    return null;
};

/**
 * Push packages to a CouchDB instance.
 *
 * @param {Object} instance
 * @param {Array} packages
 * @param {Function} callback
 * @api public
 */

exports.push = function (instance, packages, callback) {
    couchdb.ensureDB(instance, function (err) {
        async.forEach(Object.keys(packages), function (k, callback) {

            var id = '_design/' + k;
            var _design = packages[k];
            var attachments = _design._attachments;
            delete _design._attachments;

            couchdb.save(instance, id, _design, {force:true}, function (e, d) {
                if (e) return callback(e);
                var keys = Object.keys(attachments);
                async.reduce(keys, d._rev, function (rev, k, cb) {
                    var path = id + '/' + k;
                    couchdb.upload(
                        instance, path, attachments[k], rev, function (e, r) {
                            if(!e) logger.info('uploaded', attachments[k]);
                            cb(e, r);
                        }
                    );
                }, callback);
            });
        }, callback);
    });
};
