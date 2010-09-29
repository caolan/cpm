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
    async = require('../deps/async'),
    util = require('./util'),
    _ = require('../deps/underscore/underscore')._;


/**
 * Load settings from HOME and the project directory (if exists).
 * The values in the project settings file override and extend those in
 * the HOME folder.
 *
 * @param {String} project_path
 * @api public
 */

// TODO: change project_path to accept location string and set project
// path is locationType is filesystem?

exports.loadSettings = function (project_path, callback) {
    var home_file    = path.join(process.env['HOME'], '.cpmrc');
    var project_file = path.join(project_path, '.cpmrc');
    var settings = {
        cache: path.join(process.env['HOME'], '.cpm/cache'),
        instances: {},
        repositories: {}
    };

    async.reduce([home_file, project_file], settings, function (s, p, cb) {
        path.exists(p, function (exists) {
            if (!exists) return cb(null, s);
            util.readJSON(p, function (err, settings) {
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
    if (typeof settings.repositories !== 'object') fail('No repositories set');
    if (!settings.default_repository) fail('No default repository set');
};
