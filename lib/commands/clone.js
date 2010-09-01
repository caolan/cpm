/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var logger = require('../logger'),
    settings = require('../settings'),
    transports = require('../transports'),
    filesystem = transports.filesystem,
    help = require('./help'),
    url = require('url');


/**
 * Executes the clone command
 */

module.exports = function (args, options) {
    if (!args || args.length < 1) return help();

    var project_settings;
    if (transports.locationType(args[0]) === 'file') {
        project_settings = args[0];
    }

    settings.loadSettings(project_settings, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        transports.getPackage(settings, args[0], function (err, pkg) {
            if (err) return logger.error(err);
            logger.debug('package:', pkg);

            filesystem.putPackage(settings, args[1], pkg, function (err) {
                if (err) return logger.error(err);
                logger.end();
            })
        });

    });
};


