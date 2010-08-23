/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var url = require('url');

/**
 * Given a settings object, resolve the instance information from a string.
 * Used for parsing repositories from command line arguments.
 *
 * @param {Object} settings
 * @param {String} str
 * @returns {Object}
 * @api public
 */

exports.resolveInstance = function (settings, str) {
    if (str) {
        if (str in settings.repositories) {
            // a named repository from settings
            return settings.repositories[str];
        }
        else {
            // a repository URL
            var parsed = url.parse(str);
            return {
                hostname: parsed.hostname,
                port: parsed.port,
                db: (parsed.pathname || '').substr(1)
            };
        }
    }
    // use default repository
    return settings.repositories[settings.default_repository];
};
