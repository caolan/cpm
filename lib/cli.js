#!/usr/bin/env node

var logger = require('./logger'),
    options = require('./options');


var commands = {
    'help': require('./help')
};

var cmd = options.parse(process.argv.slice(2));
if (options.debug) {
    logger.level = 'debug';
}

logger.debug('command:', cmd);

// run the command, or show the help message
(commands[cmd.args[0]] || commands.help)(cmd.args.slice(1), cmd.options);
