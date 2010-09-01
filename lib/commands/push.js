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
    db = transports.db,
    help = require('./help'),
    url = require('url');


/**
 * Executes the push command
 */

module.exports = function (args, options) {
    if (!args || !args.length) return help();
    var loc = (args.length < 2) ? '.': args[1];

    settings.loadSettings(loc, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        transports.getPackage(settings, loc, function (err, pkg) {
            if (err) return logger.error(err);

            db.putPackage(settings, args[0], pkg, function (err) {
                if (err) return logger.error(err);
                logger.end();
            });
        });

    });
};

