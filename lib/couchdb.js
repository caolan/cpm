/*!
 * CPM - Couch Package Manager
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var url = require('url'),
    async = require('../deps/async'),
    mime = require('../deps/node-mime/mime'),
    sys = require('sys'),
    fs = require('fs'),
    http = require('http'),
    logger = require('./logger'),
    querystring = require('querystring');


/**
 * Tests if a database exists, creates it if not.
 *
 * @param {Object} instance
 * @param {Function} callback
 * @api public
 */

exports.ensureDB = function (instance, callback) {
    exports.exists(instance, '', function (err, exists) {
        if (err || exists) return callback(err, this);
        exports.createDB(instance, callback);
    });
};

/**
 * Creates a database.
 *
 * @param {Object} instance
 * @param {Function} callback
 * @api public
 */

exports.createDB = function (instance, callback) {
    exports.JSONClient(instance, 'PUT', '', null, callback);
};

/**
 * Convenience HTTP client for querying a CouchDB instance. Buffers and parses
 * JSON responses before passing to callback. JSON.stringify's data before
 * sending.
 *
 * @param {Object} instance
 * @param {String} method
 * @param {String} path
 * @param data
 * @param {Function} callback
 * @api public
 */

exports.JSONClient = function (instance, method, path, data, callback) {
    if (instance.db) path = '/' + instance.db + '/' + path;
    if (typeof data != 'string') {
        try { data = JSON.stringify(data); }
        catch(e) { return callback(e); }
    }

    var client = http.createClient(instance.port, instance.hostname);
    client.on('error', callback);
    var request = client.request(method, path, {
        'host': instance.hostname,
        'Content-Type': 'application/json'
    });

    request.on('response', function (response) {
        logger.debug('response:', {
            headers: response.headers,
            url: response.url,
            method: response.method,
            statusCode: response.statusCode
        });
        var buffer = [];
        response.on('data', function (chunk) {
            buffer.push(chunk.toString());
        });
        response.on('end', function () {
            var data = buffer.length ? JSON.parse(buffer.join('')): null;
            logger.debug('data:', data);
            if (response.statusCode >= 400 && data && data.error) {
                var err = new Error(data.reason || data.error);
                callback(err, data, response);
            }
            else callback(null, data, response);
        });
    });

    if (data) request.write(data, 'utf8');
    request.end();

    logger.debug('request:', request.output[0]);
};

/**
 * Test if a doc exists in the db by doing a HEAD request - doesn't fetch
 * the whole document.
 *
 * @param {Object} instance
 * @param {String} id
 * @param {Function} callback
 * @api public
 */

exports.exists = function (instance, id, callback) {
    id = id || '';
    exports.JSONClient(instance, 'HEAD', id, null, function (err, data, res) {
        res = res || {};
        if (res.statusCode != 404 && err) return callback(err);
        var exists = (res.statusCode == 200);
        var etag = res.headers.etag;
        var _rev = etag ? etag.substr(1, etag.length-2): null;
        callback(null, exists, _rev);
    });
};

/**
 * Saves a document to a CouchDB instance.
 *
 * Options:
 *      {Boolean} force - write document regardless of conflicts!
 *
 * @param {Object} instance
 * @param {String} id
 * @param {Object} doc
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

exports.save = function (instance, id, doc, /*optional*/options, callback) {
    if (!callback) {
        callback = options;
        options = {};
    }
    var method = id ? 'PUT': 'POST';
    var path = id || '';

    if (options.force) {
        // WARNING! this is a brute-force document update
        // updates revision number to latest revision before saving
        exports.exists(instance, id, function (err, exists, rev) {
            if (err) return callback(err);
            if (exists) doc._rev = rev;
            exports.JSONClient(instance, method, path, doc, function (err, d) {
                if (err) return callback(err);
                doc._id = d.id;
                doc._rev = d.rev;
                callback(null, doc);
            });
        });
    }
    else exports.JSONClient(instance, method, path, data, callback);
};

/**
 * Streams an attachment to CouchDB using sys.pump.
 *
 * @param {Object} instance
 * @param {String} path
 * @param {String} file
 * @param {String} rev
 * @param {Function} callback
 * @api public
 */

exports.upload = function (instance, path, file, /*optional*/rev, callback) {
    if (!callback) {
        callback = rev;
        rev = null;
    }
    if (rev) path += '?' + querystring.stringify({rev: rev});
    if (instance.db) path = '/' + instance.db + '/' + path;

    var client = http.createClient(instance.port, instance.hostname);
    var request = client.request('PUT', path, {
        'host': instance.hostname,
        'Content-Type': mime.lookup(file)
    });

    client.on('error', function (err) {
        logger.debug('client error:', err);
        // callback should be overridden by this point, but if its
        // not then return the error.
        // sometimes an error was being emitted on the client *after*
        // the request has successfully completed and the callback executed,
        // the error was (node v0.1.102):
        // Error: ENOTCONN, Transport endpoint is not connected
        callback(err);
    });

    var stream = fs.createReadStream(file);
    var end_count = 0;
    stream.on('end', function () {
        logger.debug('stream event:', 'end');
        // TODO: find the cause of this!
        // sometimes 'end' gets emitted twice which seems to cause
        // a bad file descriptor error (node v0.1.102)
        end_count++;
        //if (end_count == 2) console.log('end called twice');
    });
    var stream_error;
    stream.on('error', function (err) {
        logger.debug('stream error:', err);
        // sometimes we get bad file descriptor error after the
        // sys.pump has completed. possibly a race condition between
        // the server closing the request and the stream being closed by
        // sys.pump? store the error and wait for the response. if the
        // response contains an error, report that instead, otherwise
        // report the stream error
        if (end_count < 2) stream_error = err;
    });

    // wait for open event otherwise we sometimes get
    // "TypeError: Bad argument" in fs:173
    stream.on('open', function (fd) {
        logger.debug('stream event:', 'open');
        sys.pump(stream, request);
    });

    logger.debug('request:', request);

    request.on('response', function (response) {
        logger.debug('response:', response);
        var buffer = [];
        response.on('data', function (chunk) {
            buffer.push(chunk.toString());
        });
        response.on('end', function () {
            var data = buffer.length ? JSON.parse(buffer.join('')): null;
            logger.debug('data:', data);
            if (response.statusCode >= 400 && data && data.error) {
                var err = new Error(data.reason || data.error);
                callback(err, data, response);
                callback = function () {};
            }
            else {
                if (stream_error) {
                    // a previous error occured when streaming the request
                    callback(stream_error, data, response);
                    callback = function () {};
                }
                else {
                    callback(null, data.rev);
                    callback = function () {};
                }
            }
        });
    });

};