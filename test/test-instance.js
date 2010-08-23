var couchdb = require('../lib/couchdb'),
    instance = require('../lib/instance');


exports['push'] = function (test) {
    test.expect(8);

    var pkgs = {
        testapp: {
            _attachments: {'1':'one', '2':'two'},
            other_properties: 'asdf'
        }
    };
    var ins = {
        hostname: 'host',
        port: 123,
        db: 'testdb'
    };

    var _save = couchdb.save;
    couchdb.save = function (ins, id, doc, options, callback) {
        test.same(ins, ins);
        test.equals(id, '_design/testapp');
        test.same(doc, pkgs.testapp);
        doc._rev = 1;
        callback(null, doc);
    };

    var _ensureDB = couchdb.ensureDB;
    couchdb.ensureDB = function (ins, callback) {
        test.same(ins, ins);
        callback(null, this);
    };

    var uploads = {};
    var _upload = couchdb.upload;
    couchdb.upload = function (ins, path, file, rev, callback) {
        test.same(ins, ins);
        uploads[path] = {file: file, rev: rev};
        callback(null, rev + 1);
    };

    instance.push(ins, pkgs, function (err) {
        test.same(uploads, {
            '_design/testapp/1': {file: 'one', rev: 1},
            '_design/testapp/2': {file: 'two', rev: 2}
        });
        test.ok(pkgs.testapp._attachments === undefined);
        couchdb.ensureDB = _ensureDB;
        couchdb.upload = _upload;
        couchdb.save = _save;
        test.done();
    });
};
