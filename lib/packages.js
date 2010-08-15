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
    utils = require('./utils');

/**
 * Read package.json and load associated files, returning the parsed
 * package metadata, the design doc and a list of attachments.
 *
 * @param {String} p
 * @param {Function} callback
 * @api public
 */

exports.loadPackage = function (p, callback) {
    var metadata = path.join(p, 'package.json');
    utils.readJSON(metadata, function(err, pkg){
        callback(err, pkg, {package: pkg}, []);
    });
};


// load a package and all its dependencies:
// exports.loadPackageFull
