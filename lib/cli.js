#!/usr/bin/env node

/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var logger = require('./logger'),
    options = require('./options');

/**
 * Available commands
 */

var commands = {
    'help': require('./help')
};

/**
 * Parse commands and turn on debugging straight away if its enabled
 */

var cmd = options.parse(process.argv.slice(2));
if (options.debug) {
    logger.level = 'debug';
}

/**
 * Log command for debugging purposes
 */

logger.debug('command:', cmd);

/**
 * Run the command, or show the help message
 */

(commands[cmd.args[0]] || commands.help)(cmd.args.slice(1), cmd.options);
