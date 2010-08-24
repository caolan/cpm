/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var sys = require('sys');

/**
 * The level to log at, change this to alter the global logging level.
 * Possible options are: error, warning, info, debug. Default level is info.
 */
exports.level = 'info';


/**
 * Wraps some ANSI codes around some text.
 */
var wrap = function (code, reset) {
    return function (str) {
        return "\033[" + code + "m" + str + "\033[" + reset + "m";
    };
}

/**
 * ANSI colors and styles used by the logger module.
 */
var bold    = exports.bold    = wrap(1, 22);
var red     = exports.red     = wrap(31, 39);
var green   = exports.green   = wrap(32, 39);
var cyan    = exports.cyan    = wrap(36, 39);
var yellow  = exports.yellow  = wrap(33, 39);
var magenta = exports.magenta = wrap(35, 39);

/**
 * Executes a function only if the current log level is in the levels list
 *
 * @param {Array} levels
 * @param {Function} fn
 */

var forLevels = function (levels, fn) {
    return function (label, val) {
        for (var i = 0; i < levels.length; i++) {
            if (levels[i] == exports.level) return fn(label, val);
        }
    };
};

/**
 * Logs debug messages, using sys.inspect to show the properties of objects
 * (logged for 'debug' level only)
 */

exports.debug = forLevels(['debug'], function (label, val) {
    if (val === undefined) {
        val = label;
        label = null;
    }
    if (typeof val !== 'string') {
        val = sys.inspect(val);
    }
    (label && val)? sys.puts(cyan(label + ' ') + val): sys.puts(label);
});

/**
 * Logs info messages (logged for 'info' and 'debug' levels)
 */

exports.info = forLevels(['info', 'debug'], function (label, val) {
    if (val === undefined) {
        val = label;
        label = null;
    }
    if (typeof val !== 'string') {
        val = sys.inspect(val);
    }
    label ? sys.puts(magenta(label + ' ') + val): sys.puts(val);
});

/**
 * Logs warnings messages (logged for 'warning', 'info' and 'debug' levels)
 */

exports.warning = forLevels(['warning', 'info', 'debug'], function (msg) {
    sys.puts( yellow( bold('Warning: ') + msg ) );
});

/**
 * Logs error messages (always logged)
 */

exports.error = function (err) {
    sys.puts(red(bold('Error: ') + (
        err.stack || err.message || err.error || err
    )));
};


/**
 * Display a failure message if exit is unexpected.
 */

var clean_exit = false;
exports.end = function (msg) {
    clean_exit = true;
    sys.puts(green(bold('\nOK')) + (msg ? green(bold(': ')) + msg: ''));
};
process.on('exit', function () {
    if (!clean_exit) {
        sys.puts(red(bold('Failed')));
    }
});

/**
 * Log uncaught exceptions in the same style as normal errors.
 */

process.on('uncaughtException', function (err) {
    exports.error(err.stack || err);
});
