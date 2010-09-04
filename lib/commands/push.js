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
    async = require('../../deps/async'),
    transports = require('../transports'),
    repository = transports.repository,
    db = transports.db,
    help = require('./help'),
    url = require('url');


/**
 * Executes the push command
 */

module.exports = function (args, options) {
    if (!args || !args.length) return help();
    var loc = (args.length < 2) ? '.': args[1];

    settings.loadSettings(loc, function (err, settings) {
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        transports.getPackage(settings, loc, function (err, pkg) {
            if (err) return logger.error(err);

            // load dependencies
            var deps = Object.keys(pkg.package.dependencies || {});
            logger.debug('dependencies:', deps);

            async.map(deps, function (d, cb) {
                var ver = pkg.package.dependencies[d];
                repository.getByVersion(settings, d, ver, function (err, pkg) {
                    if (err) return cb(err);
                    cb(null, pkg);
                });
            },
            function (err, pkgs) {
                if (err) return callback(err);

                // add the package itself to the list
                pkgs.push(pkg);

                // upload all packages to the db
                async.forEach(pkgs, function (p, cb) {
                    db.putPackage(settings, args[0], p, cb);
                },
                function (err) {
                    if (err) return logger.error(err);
                    logger.end();
                });
            });

        });

    });
};

