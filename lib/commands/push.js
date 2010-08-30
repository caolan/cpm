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
 * Executes the push command
 */

module.exports = function (args, options) {
    if (!args || !args.length) return help();
    var pkg = (args.length < 2) ? '.': args[1];

    settings.loadSettings(pkg, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        var ins = instance.resolveInstance(settings, args[0]);
        try { instance.validateInstance(ins); }
        catch (e) { return logger.error(e); }

        logger.info('Hostname:', ins.hostname);
        logger.info('Port:', ins.port);
        logger.info('DB:', ins.db);

        packages.load(settings, pkg, function (err, doc) {
            if (err) return logger.error(err);

            var pkgs = {};
            var pkg = doc.package;
            pkgs[pkg.name] = doc;
            if(pkg.app) {
                try       { packages.loadApp(pkgs, pkg.name, pkg.app); }
                catch (e) { return logger.error(e); }
            }

            logger.debug('package.json:', pkg);
            logger.debug('_design:', doc);

            instance.push(ins, pkgs, function (err) {
                if (err) return logger.error(err);
                logger.end();
            });
        });

    });
};

