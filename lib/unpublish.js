/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var logger = require('./logger'),
    utils = require('./utils'),
    repository = require('./repository'),
    settings = require('./settings'),
    packages = require('./packages'),
    help = require('./help'),
    url = require('url');


/**
 * Executes the push command
 */

module.exports = function (args, options) {

    if (!args.length) return logger.error('No package specified');

    var split = args[0].split('@');
    if (split.length < 2) return logger.error('No package version specified');
    var pkg = split[0];
    var version = split[1];
    logger.info('Package:', pkg);
    logger.info('Version:', version);

    settings.loadSettings(null, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        var instance = repository.resolveInstance(settings, args[1]);
        try { utils.validateInstance(instance); }
        catch (e) { return logger.error(e); }

        logger.info('Hostname:', instance.hostname);
        logger.info('Port:', instance.port);
        logger.info('DB:', instance.db);

        repository.unpublish(instance, pkg, version, function (err) {
            if (err) logger.error(err);
            else logger.end();
        });
    });
};

