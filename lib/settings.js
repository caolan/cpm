/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    _ = require('underscore')._;


/**
 * Reads the contents of a .cpmrc file and returns the parsed JSON
 *
 * @param {String} path
 * @param {Function} callback
 * @api public
 */

exports.readSettingsFile = function (path, callback) {
    fs.readFile(path, function (err, content) {
        try       { callback(err, err ? null: JSON.parse(content.toString())); }
        catch (e) { callback(e, null); }
    });
};

/**
 * Load settings from HOME and the project directory (if exists).
 * The values in the project settings file override and extend those in
 * the HOME folder.
 *
 * @param {String} project_path
 * @api public
 */

exports.loadSettings = function (project_path, callback) {
    var home_file    = path.join(process.env['HOME'], '.cpmrc');
    var project_file = path.join(project_path, '.cpmrc');

    async.reduce([home_file, project_file], {}, function (s, p, cb) {
        path.exists(p, function (exists) {
            if (!exists) return cb(null, s);
            exports.readSettingsFile(p, function (err, settings) {
                cb(err, _.extend(s, settings));
            });
        });
    }, function (err, settings) {
        if (err) return callback(err);
        try       { exports.validate(settings); }
        catch (e) { return callback(e); }
        callback(null, settings);
    });
};

/**
 * Validates loaded settings objects and throws and exception on failure.
 *
 * @param {Object} settings
 * @api public
 */

exports.validate = function (settings) {
    function fail(msg) {
        throw new Error('Invalid settings: ' + msg);
    }
    if (!settings.cache) fail('No cache path set');
};
