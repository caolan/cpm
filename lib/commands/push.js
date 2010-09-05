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

        transports.getPackageFull(settings, loc, function (err, pkg, pkgs) {
            if (err) return logger.error(err);

            var pkg_names = Object.keys(pkgs || {});

            // upload all packages to the db
            async.forEach(pkg_names, function (n, cb) {
                var p = pkgs[n];
                db.putPackage(settings, args[0], p, function (err) {
                    if (err) return cb(err);
                    logger.info('uploaded', p.package.name);
                    cb();
                });
            },
            function (err) {
                if (err) return logger.error(err);
                var ins = db.resolveInstance(settings, args[0]);
                ins.pathname = ins.db;
                var pkgurl = url.format(ins) + '/_design/' + pkg.package.name;
                if (pkg.rewrites) pkgurl += '/_rewrite/';
                logger.end(pkgurl);
            });

        });

    });
};

