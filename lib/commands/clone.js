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

    var project_settings;
    if (packages.locationType(args[0]) === 'file') {
        project_settings = args[0];
    }

    settings.loadSettings(project_settings, function(err, settings){
        if (err) return logger.error(err);

        packages.clone(settings, args[0], args[1], function (err) {
            if (err) return logger.error(err);
            logger.end();
        });

    });
};


