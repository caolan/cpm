/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var logger = require('../logger'),
    utils = require('../../lib/utils'),
    instance = require('../instance'),
    repository = require('../repository'),
    settings = require('../settings'),
    packages = require('../packages'),
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

        var ins = repository.resolveInstance(settings, args[1]);
        try { instance.validateInstance(ins); }
        catch (e) { return logger.error(e); }

        logger.info('Hostname:', ins.hostname);
        logger.info('Port:', ins.port);
        logger.info('DB:', ins.db);

        utils.getNameAndVersion(settings, args[0], function (err, data) {
            if (err) return logger.error(e);
            logger.info('Package:', data.name);
            logger.info('Version:', data.version);

            repository.unpublish(ins, data.name, data.version, function (err) {
                if (err) logger.error(err);
                else logger.end();
            });
        });

    });
};

