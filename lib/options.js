/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Parse a list of command-line arguments, extracting the options
 * and a list of positional arguments.
 *
 * @param {Array} arr
 * @return {Object}
 * @api public
 */
exports.parse = function (arr) {
    var results = {options: {}, args: []};
    arr.forEach(function (a) {
        if (a.slice(0,2) == '--') results.options[a.slice(2)] = true;
        else results.args.push(a);
    });
    return results;
};
