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
 * Executes the list command
 */

module.exports = function (args, options) {
    settings.loadSettings(null, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        var ins = repository.resolveInstance(settings, args[0]);
        try { instance.validateInstance(ins); }
        catch (e) { return logger.error(e); }

        logger.info('Hostname:', ins.hostname);
        logger.info('Port:', ins.port);
        logger.info('DB:', ins.db);

        repository.list(ins, function (err, packages) {
            if (err) return logger.error(err);
            var names = Object.keys(packages);
            if (names.length) console.log('');
            names.forEach(function (n) {
                console.log(utils.padRight(n,30) + packages[n].join(', '));
            });
            logger.end(
                packages.length + ' result' +
                ((packages.length !== 1) ? 's': '')
            );
        });
    });
};

