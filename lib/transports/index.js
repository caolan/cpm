/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var url = require('url');

/**
 * Transports
 */

exports.db = require('./db');
exports.filesystem = require('./filesystem');
exports.repository = require('./repository');

/**
 * Reads a module location string and returns the type of location.
 * Location can by of type 'db', 'filesystem' or 'repository'.
 *
 * @param {String} loc
 * @return {String}
 * @api public
 */

exports.locationType = function (loc) {
    loc = loc || '';
    var parsed = url.parse(loc);
    if (loc === '.') return 'filesystem';
    if (/https?:$/.test(parsed.protocol)) return 'db';
    if (loc.indexOf('/') != -1) return 'filesystem';
    return 'repository';
};

/**
 * List available packages, using correct transport for location type
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 */

exports.list = function (settings, loc, callback) {
    switch (exports.locationType(loc)) {
        case 'db':
            exports.db.list(settings, loc, callback);
            break;
        case 'filesystem':
            //exports.filesystem.list(settings, loc, callback);
            callback(new Error('Cannot list packages on the filesystem'));
            break;
        default:
            exports.repository.list(settings, loc, callback);
    }
};

/**
 * Get a package using correct transport for location type.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 */

exports.getPackage = function (settings, loc, callback) {
    exports[exports.locationType(loc)].getPackage(settings, loc, callback);
};

/**
 * Get a package and all its dependencies using correct transport for
 * location type.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 */

exports.getPackageFull = function (settings, loc, callback) {
    exports[exports.locationType(loc)].getPackageFull(settings, loc, callback);
};

/**
 * Get package metadata using correct transport for location type
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 */

exports.getMetadata = function (settings, loc, callback) {
    exports[exports.locationType(loc)].getMetadata(settings, loc, callback);
};

/**
 * Either parses the package name and version from a string or loads the url
 * or filepath and reads the package name and version from the metadata.
 *
 * @param {Object} settings
 * @param {String} loc
 * @param {Function} callback
 * @api public
 */

exports.getNameAndVersion = function (settings, loc, callback) {
    switch (exports.locationType(loc)) {
        case 'repository':
            callback(null, exports.repository.splitLocation(loc));
            break;
        default:
            exports.getMetadata(settings, loc, function (err, meta) {
                if (err) return callback(err);
                callback(null, {name: meta.name, version: meta.version});
            });
    }
};
