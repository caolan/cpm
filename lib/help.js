/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var logger = require('./logger'),
    utils = require('./utils');

/**
 * Output for the help command
 */

module.exports = function (args, options) {
    var col_width = 35;
    logger.info(
        utils.padRight('help', col_width),
        'Display this help message'
    );
    logger.info(
        utils.padRight('push url [package]', col_width),
        'Upload a package to a CouchDB database'
    );
    logger.info(
        utils.padRight('publish package [repository]', col_width),
        'Publish a package to a repository'
    );
    logger.info(
        utils.padRight('unpublish package [repository]', col_width),
        'Unpublish a package from a repository'
    );
    logger.info(
        utils.padRight('list [repository]', col_width),
        'Lists the packages available in a repository'
    );
    logger.info(
        utils.padRight('clone url path', col_width),
        'Clone a package from a CouchDB database'
    );
    logger.end();
};
