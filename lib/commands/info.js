/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var logger = require('../logger'),
    instance = require('../instance'),
    repository = require('../repository'),
    settings = require('../settings'),
    packages = require('../packages'),
    utils = require('../../lib/utils'),
    help = require('./help'),
    url = require('url');


/**
 * Executes the info command
 */

module.exports = function (args, options) {
    if (!args.length) return logger.error('No package specified');

    settings.loadSettings(null, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        packages.loadMetadata(settings, args[0], function (err, pkg) {
            if (err) return logger.error(err);
            console.log(logger.bold(pkg.name + ' (' + pkg.version + ')'));
            console.log(pkg.description);
            logger.end();
        });
    });
};

