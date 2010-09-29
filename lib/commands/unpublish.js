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
    repository = transports.repository,
    settings = require('../settings'),
    help = require('./help'),
    url = require('url');


/**
 * Executes the unpublish command
 */

module.exports = function (args, options) {

    if (!args.length) return logger.error('No package specified');

    settings.loadSettings(null, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        transports.getNameAndVersion(settings, args[0], function (err, data) {
            if (err) return logger.error(e);
            logger.info('Package:', data.name);
            logger.info('Version:', data.version);
            var loc = data.name;
            if(data.version) loc += '@' + data.version;

            repository.deletePackage(settings, loc, function (err) {
                if (err) logger.error(err);
                else logger.end();
            });
        });

    });
};

