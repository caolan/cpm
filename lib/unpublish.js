/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var logger = require('./logger'),
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

        var instance;
        if (args[1]) {
            if (args[1] in settings.repositories) {
                instance = settings.repositories[args[1]];
            }
            else {
                var parsed = url.parse(args[1]);
                instance = {
                    hostname: parsed.hostname,
                    port: parsed.port,
                    db: (parsed.pathname || '').substr(1)
                };
            }
        }
        else {
            // use default repository
            var instance = settings.repositories[
                settings.default_repository
            ];
        }

        if (!instance.hostname) {
            return logger.error('You must specify a hostname');
        }
        if (!instance.port) {
            return logger.error('You must specify a port');
        }
        if (!instance.db) {
            return logger.error('You must specify a database');
        }

        logger.info('Hostname:', instance.hostname);
        logger.info('Port:', instance.port);
        logger.info('DB:', instance.db);

        packages.unpublish(instance, pkg, version, function (err) {
            if (err) logger.error(err);
            else logger.end();
        });
    });
};

