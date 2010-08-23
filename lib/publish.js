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
    var pkg = (args.length < 1) ? '.': args[0];

    settings.loadSettings(pkg, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        logger.info('Package:', pkg);
        try       { process.chdir(pkg); }
        catch (e) { return logger.error(e); }

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

            var instance = repository.resolveInstance(settings, args[1]);
            try { utils.validateInstance(instance); }
            catch (e) { return logger.error(e); }

            logger.info('Hostname:', instance.hostname);
            logger.info('Port:', instance.port);
            logger.info('DB:', instance.db);

            packages.publish(instance, pkgs, function (err) {
                if (err) {
                    if (err.error == 'conflict') {
                        logger.error('Package already exists');
                    }
                    else logger.error(err);
                }
                else logger.end();
            });
        });

    });
};

