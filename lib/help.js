/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var logger = require('./logger');

/**
 * Output for the help command
 */

module.exports = function (args, options) {
    logger.info('help',     '\t\t\t\tDisplay this help message');
    logger.info(
        'push url [package]',
        '\t\tUpload a package to a CouchDB database'
    );
    logger.info(
        'publish package [repository]',
        '\tPublish a package to a repository'
    );
    logger.info(
        'unpublish package [repository]',
        '\tUnpublish a package from a repository'
    );
    logger.end();
};
