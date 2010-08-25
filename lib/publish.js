/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var logger = require('./logger'),
    instance = require('./instance'),
    repository = require('./repository'),
    settings = require('./settings'),
    packages = require('./packages'),
    help = require('./help'),
    url = require('url');


/**
 * Executes the publish command
 */

module.exports = function (args, options) {
    var pkg = (args.length < 1) ? '.': args[0];

    settings.loadSettings(pkg, function(err, settings){
        if (err) return logger.error(err);
        logger.debug('settings:', settings);

        logger.debug('opening:', pkg);
        try       { process.chdir(pkg); }
        catch (e) { return logger.error(e); }

        packages.loadPackage('.', function (err, pkg, _design) {
            if (err) return logger.error(err);

            logger.info('Package:', pkg.name);
            logger.info('Version:', pkg.version);

            var pkgs = {};
            pkgs[pkg.name] = _design;
            if(pkg.app) {
                try       { packages.loadApp(pkgs, pkg.name, pkg.app); }
                catch (e) { return logger.error(e); }
            }

            logger.debug('package.json:', pkg);
            logger.debug('_design:', _design);

            var ins = repository.resolveInstance(settings, args[1]);
            try { instance.validateInstance(ins); }
            catch (e) { return logger.error(e); }

            logger.info('Hostname:', ins.hostname);
            logger.info('Port:', ins.port);
            logger.info('DB:', ins.db);

            repository.publish(ins, pkgs, function (err) {
                if (err) logger.error(err);
                else logger.end(pkg.name + '@' + pkg.version);
            });
        });

    });
};
