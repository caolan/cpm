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
    settings = require('../settings'),
    packages = require('../packages'),
    help = require('./help'),
    url = require('url');


/**
 * Executes the clone command
 */

module.exports = function (args, options) {
    if (!args || args.length < 1) return help();

    var ins = instance.resolveInstance({instances:{}}, args[0]);
    try { instance.validateInstance(ins); }
    catch (e) { return logger.error(e); }

    logger.info('Hostname:', ins.hostname);
    logger.info('Port:', ins.port);
    logger.info('DB:', ins.db);
    logger.info('Doc:', ins.doc);

    packages.clone(ins, ins.doc, args[1], function (err) {
        if (err) return logger.error(err);
        logger.end();
    });
};


