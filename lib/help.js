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
    logger.info('help message');
    logger.end();
};
