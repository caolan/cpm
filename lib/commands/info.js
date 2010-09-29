/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var logger = require('../logger'),
    transports = require('../transports'),
    settings = require('../settings'),
    util = require('../util'),
    help = require('./help'),
    url = require('url');


/**
 * Executes the info command
 */

module.exports = function (args, options) {
    var loc = args.length ? args[0]: '.';

    settings.loadSettings(null, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        transports.getMetadata(settings, loc, function (err, pkg) {
            if (err) return logger.error(err);
            console.log(logger.bold(pkg.name + ' (' + pkg.version + ')'));
            console.log(pkg.description);
            logger.end();
        });
    });
};

