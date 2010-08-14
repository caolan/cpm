/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var path = require('path');

/**
 * Converts a relative file path to properties on an object, and assigns a
 * value to that property.
 *
 * Example: some/test/path  =>  {some: {test: {path: ...} } }
 *
 * @prop {Object} obj
 * @prop {String} p
 * @prop val
 * @return val
 * @api public
 */

exports.setPropertyPath = function (obj, p, val) {
    // normalize to remove unessecary . and .. from paths
    var parts = path.normalize(p).split('/');

    // loop through all parts of the path except the last, creating the
    // properties if they don't exist
    var prop = parts.slice(0, parts.length-1).reduce(function (a, x) {
        if(a[x] === undefined) a[x] = {};
        return a = a[x];
    }, obj);

    // set the final property to the given value
    return prop[parts[parts.length-1]] = val;
};
