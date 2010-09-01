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
    utils = require('../../lib/utils'),
    help = require('./help'),
    url = require('url');


/**
 * Executes the list command
 */

module.exports = function (args, options) {
    settings.loadSettings(null, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        transports.list(settings, args[0], function (err, packages) {
            if (err) return logger.error(err);
            var names = Object.keys(packages);
            names.forEach(function (n) {
                console.log(utils.padRight(n,30) + packages[n].join(', '));
            });
            logger.end(
                names.length + ' result' +
                ((packages.length !== 1) ? 's': '')
            );
        });
    });
};

