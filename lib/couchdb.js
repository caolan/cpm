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
    base64 = require('../deps/base64'),
    sys = require('sys'),
    fs = require('fs'),
    url = require('url'),
    http = require('http'),
    logger = require('./logger'),
    querystring = require('querystring');


/**
 * Convenience method for creating a CouchDB object instance.
 *
 * @param {String} db_url
 * @api public
 */

var exports = module.exports = function (db_url) {
    return new CouchDB(db_url);
};

/**
 * The CouchDB object constructor.
 *
 * @class CouchDB
 * @constructor
 * @param {String} db_url
 * @api public
 */

var CouchDB = exports.CouchDB = function (db_url) {
    var ins = this.instance = url.parse(db_url);
    if (!ins.port) {
        if (ins.protocol === 'https:') {
            ins.port = 443;
        }
        else {
            ins.port = 80;
        }
    }
};

/**
 * Tests if a database exists, creates it if not.
 *
 * @param {Function} callback
 * @api public
 */

CouchDB.prototype.ensureDB = function (callback) {
    var that = this;
    this.exists('', function (err, exists) {
        if (err || exists) return callback(err, that);
        that.createDB(callback);
    });
};

/**
 * Creates a database.
 *
 * @param {Function} callback
 * @api public
 */

CouchDB.prototype.createDB = function (callback) {
    this.JSONClient('PUT', '', null, callback);
};

/**
 * Convenience HTTP client for querying a CouchDB instance. Buffers and parses
 * JSON responses before passing to callback. JSON.stringify's data before
 * sending.
 *
 * @param {String} method
 * @param {String} path
 * @param data
 * @param {Function} callback
 * @api public
 */

CouchDB.prototype.JSONClient = function (method, path, data, callback) {
    path = (this.instance.pathname || '') + '/' + path;

    var headers = {
        'Host': this.instance.hostname,
        'Accept': 'application/json'
    };
    if (method == 'POST' || method == 'PUT') {
        if (typeof data != 'string') {
            try { data = JSON.stringify(data); }
            catch(e) { return callback(e); }
        }
        headers['Content-Type'] = 'application/json';
    }
    else if(data) {
        path = url.parse(path).pathname + '?' + querystring.stringify(data);
    }

    if (this.instance.auth) {
        headers.Authorization = "Basic " + base64.encode(this.instance.auth);
    }

    var client = http.createClient(this.instance.port, this.instance.hostname);
    client.on('error', callback);
    var request = client.request(method, path, headers);

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
            if (response.statusCode >= 300) {
                if (data && data.error) {
                    //var err = new Error(data.reason || data.error);
                    var err = new Error(data.reason || data.error);
                    err.error = data.error;
                    err.reason = data.reason;
                    err.response = response;
                    callback(err, data, response);
                }
                else {
                    var err = new Error('Status code: ' + response.statusCode);
                    callback(err, data, response);
                }
            }
            else callback(null, data, response);
        });
    });

    if (data && (method == 'POST' || method == 'PUT')) {
        request.write(data, 'utf8');
    }
    request.end();

    logger.debug('request:', request.output[0]);
};

/**
 * Test if a doc exists in the db by doing a HEAD request - doesn't fetch
 * the whole document.
 *
 * @param {String} id
 * @param {Function} callback
 * @api public
 */

CouchDB.prototype.exists = function (id, callback) {
    id = id || '';
    this.JSONClient('HEAD', id, null, function (err, data, res) {
        res = res || {};
        if (res.statusCode != 404 && err) return callback(err);
        var exists = (res.statusCode == 200);
        var etag = res.headers.etag;
        var _rev = etag ? etag.substr(1, etag.length-2): null;
        callback(null, exists, _rev);
    });
};

/**
 * Retrieve a document from a CouchDB instance.
 *
 * @param {String} id
 * @param {Object} data
 * @param {Function} callback
 * @api public
 */

CouchDB.prototype.get = function (id, /*optional*/data, callback) {
    if (arguments.length < 3) {
        callback = data;
        data = null;
    }
    this.JSONClient('GET', (id || ''), data, callback);
};

/**
 * Saves a document to a CouchDB instance.
 *
 * Options:
 *      {Boolean} force - write document regardless of conflicts!
 *
 * @param {String} id
 * @param {Object} doc
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

CouchDB.prototype.save = function (id, doc, /*optional*/options, callback) {
    var that = this;

    if (!callback) {
        callback = options;
        options = {};
    }
    var method = id ? 'PUT': 'POST';
    var path = id || '';

    if (options.force) {
        // WARNING! this is a brute-force document update
        // updates revision number to latest revision before saving
        this.exists(id, function (err, exists, rev) {
            if (err) return callback(err);
            if (exists) doc._rev = rev;
            that.JSONClient(method, path, doc, function (err, d) {
                if (err) return callback(err);
                doc._id = d.id;
                doc._rev = d.rev;
                callback(null, doc);
            });
        });
    }
    else this.JSONClient(method, path, doc, callback);
};

/**
 * Deletes a document to a CouchDB instance.
 *
 * Options:
 *      {Boolean} force - delete document regardless of conflicts!
 *
 * @param {String} id
 * @param {Object} rev
 * @param {Object} options
 * @param {Function} callback
 * @api public
 */

CouchDB.prototype.delete = function (id, rev, /*optional*/options, callback) {
    var that = this;

    if (!callback) {
        callback = options;
        options = {};
    }
    var args = {};
    if(rev) args.rev = rev;
    var path = id || '';

    if (options.force) {
        // WARNING! this is a brute-force document delete
        // updates revision number to latest revision before deleting
        this.exists(id, function (err, exists, rev) {
            if (err) return callback(err);
            if (exists) args.rev = rev;
            that.JSONClient('DELETE', path, args, callback);
        });
    }
    else this.JSONClient('DELETE', path, args, callback);
};

/**
 * Streams an attachment to CouchDB using sys.pump.
 *
 * @param {String} path
 * @param {String} file
 * @param {String} rev
 * @param {Function} callback
 * @api public
 */

CouchDB.prototype.upload = function (path, file, /*optional*/rev, callback) {
    if (!callback) {
        callback = rev;
        rev = null;
    }
    if (rev) path += '?' + querystring.stringify({rev: rev});
    path = (this.instance.pathname || '') + '/' + path;
    logger.debug('couchdb.upload:', path);

    var headers = {
        'Host': this.instance.hostname,
        'Content-Type': mime.lookup(file),
        'Accept': 'application/json'
    };
    if (this.instance.auth) {
        headers.Authorization = "Basic " + base64.encode(this.instance.auth);
    }

    var client = http.createClient(this.instance.port, this.instance.hostname);
    var request = client.request('PUT', path, headers);

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
            if (response.statusCode >= 300 && data && data.error) {
                var err = new Error(data.reason || data.error);
                err.error = data.error;
                err.reason = data.reason;
                err.response = response;
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

/**
 * Streams an attachment to filesystem using sys.pump.
 *
 * @param {String} path
 * @param {String} file
 * @param {Function} callback
 * @api public
 */

CouchDB.prototype.download = function (path, file, callback) {
    path = (this.instance.pathname || '') + '/' + path;
    logger.debug('couchdb.download:', path);

    var headers = {
        'Host': this.instance.hostname,
        'Accept': 'application/json'
    };
    if (this.instance.auth) {
        headers.Authorization = "Basic " + base64.encode(this.instance.auth);
    }

    var client = http.createClient(this.instance.port, this.instance.hostname);
    client.on('error', function (err) {
        logger.debug('client error:', err);
        callback(err);
        callback = function(){};
    });

    var stream = fs.createWriteStream(file);
    // wait for open event otherwise we sometimes get
    // "TypeError: Bad argument" in fs:173
    stream.on('open', function (fd) {
        logger.debug('stream event:', 'open');

        var request = client.request('GET', path, headers);
        request.on('response', function (response) {
            logger.debug('response:', response);

            if (response.statusCode === 200) {
                sys.pump(response, stream, callback);

                response.on('error', function (err) {
                    logger.debug('reponse event:', 'error');
                    callback(err);
                    callback = function(){};
                });
                response.on('data', function (chunk) {
                    logger.debug('reponse event:', 'data');
                    logger.debug('chunk:', chunk.toString());
                });
                response.on('end', function () {
                    logger.debug('reponse event:', 'end');
                    callback();
                    callback = function(){};
                });
            }
            else {
                var buffer = [];
                response.on('data', function (chunk) {
                    buffer.push(chunk.toString());
                });
                response.on('end', function () {
                    var content = buffer.join('');
                    var data = buffer.length ? JSON.parse(content): null;
                    logger.debug('data:', data);
                    if (response.statusCode >= 300 && data && data.error) {
                        var err = new Error(data.reason || data.error);
                        err.error = data.error;
                        err.reason = data.reason;
                        err.response = response;
                        callback(err, data, response);
                    }
                    else callback(null, data, response);
                    callback = function () {};
                });
            }
        });

        logger.debug('request:', request);
        request.end();
    });

    stream.on('error', function (err) {
        logger.debug('stream error:', err);
        callback(err);
        callback = function(){};
    });
    stream.on('data', function(){
        logger.debug('stream event:', 'data');
    });
    stream.on('end', function(){
        logger.debug('stream event:', 'end');
        callback();
        callback = function(){};
    });
};
