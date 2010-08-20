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
    if (!args || !args.length) return help();
    var pkg = (args.length < 2) ? '.': args[1];

    settings.loadSettings(pkg, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        logger.info('Package:', pkg);
        try       { process.chdir(pkg); }
        catch (e) { return logger.error(e); }

        var instance;
        if (args[0] in settings.instances) {
            instance = settings.instances[args[0]];
        }
        else {
            var parsed = url.parse(args[0]);
            instance = {
                hostname: parsed.hostname,
                port: parsed.port,
                db: (parsed.pathname || '').substr(1)
            };
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

        packages.loadPackage('.', function (err, pkg, _design) {
            if (err) return logger.error(err);

            var pkgs = {};
            pkgs[pkg.name] = _design;
            if(pkg.app) {
                try       { packages.loadApp(pkgs, pkg.name, pkg.app); }
                catch (e) { return logger.error(e); }
            }

            logger.debug('package.json:', pkg);
            logger.debug('_design:', _design);

            packages.push(instance, pkgs, function (err) {
                if (err) return logger.error(err);
                logger.end();
            });
        });

    });
};

