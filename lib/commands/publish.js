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
    repository = transports.repository,
    help = require('./help'),
    url = require('url');


/**
 * Executes the publish command
 */

module.exports = function (args, options) {
    var name = (args.length < 1) ? '.': args[0];
    var loc = args[1] || '';

    settings.loadSettings(name, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        transports.getPackage(settings, name, function (err, pkg) {
            if (err) return logger.error(err);
            logger.debug('package:', pkg);

            repository.putPackage(settings, args[1], pkg, function (err) {
                if (err) return logger.error(err);
                logger.end(pkg.package.name + '@' + pkg.package.version);
            });
        });

    });
};
