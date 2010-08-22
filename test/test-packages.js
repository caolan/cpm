var packages = require('../lib/packages'),
    couchdb = require('../lib/couchdb'),
    fs = require('fs');


exports['loadPackage'] = function (test) {
    var file = __dirname + '/fixtures/testpackage';

    packages.loadPackage(file, function (err, pkg, _design) {
        if(err) throw err;

        test.same(pkg, {
            name: 'testpackage',
            version: '0.0.1',
            app: 'lib/app',
            dependencies: [
                'testlib1',
                'testlib2'
            ],
            paths: {
                attachments: "static",
                templates: ["templates"],
                modules: "lib",
                properties: ["validate_doc_update.js", "shows", "views"]
            }
        });
        var static_dir = __dirname + '/fixtures/testpackage/static';
        test.same(_design.package, pkg);
        test.same(_design.templates, {
            'test.html': "module.exports = '<h1>\"\\'test\\'\"</h1>\\n';"
        });
        test.same(_design.lib, {
            'module': 'exports.test = "test module";\n',
            'module2': 'exports.test = "test module 2";\n',
            'app': fs.readFileSync(
                __dirname + '/fixtures/testpackage/lib/app.js'
            ).toString()
        });
        test.equals(
            _design.validate_doc_update,
            'function (newDoc, oldDoc, userCtx) {\n' +
            '    // some validation function\n' +
            '}'
        );
        test.same(_design.shows, {
            'testshow': 'function (doc, req) {\n' +
            '    // some show function\n' +
            '}'/*,
            'appshow': 'function () {\n' +
            '    var args = Array.prototype.call(arguments);\n' +
            '    var fn = require("../lib/app").shows["appshow"];\n' +
            '    return fn.apply(this, args);\n' +
            '}'*/
        });
        test.same(_design.views, {
            'testview': {
                map: 'function (doc) {\n' +
                '        emit(doc._id, doc);\n' +
                '    }'
             },
             'testview2': {
                map: 'function (doc) {\n' +
                '        emit(doc._id, doc);\n' +
                '    }'
             }
        });
        // test that the functions have been stringified
        test.equals(typeof _design.views.testview.map, 'string');
        test.equals(typeof _design.views.testview2.map, 'string');
        test.same(_design._attachments, {
            'static/folder/file1': static_dir + '/folder/file1',
            'static/file2': static_dir + '/file2',
            'static/file3': static_dir + '/file3'
        });
        test.equals(_design.language, 'javascript');
        test.same(Object.keys(_design).sort(), [
            'language',
            'package',
            'templates',
            'lib',
            'validate_doc_update',
            'shows',
            'views',
            '_attachments'
        ].sort());
        test.done();
    });
};

exports['loadApp'] = function (test) {
    var file = __dirname + '/fixtures/testpackage';

    packages.loadPackage(file, function (err, pkg, _design) {
        if (err) throw err;
        var pkgs = {};
        pkgs[pkg.name] = _design;
        packages.loadApp(pkgs, pkg.name, pkg.app);
        test.same(_design.shows, {
            'testshow': 'function (doc, req) {\n' +
            '    // some show function\n' +
            '}',
            'appshow': 'function () {\n' +
            '    var args = Array.prototype.call(arguments);\n' +
            '    var fn = require("../lib/app")["shows"]["appshow"];\n' +
            '    return fn.apply(this, args);\n' +
            '}'
        });
        test.same(_design.lists, {
            'applist': 'function () {\n' +
            '    var args = Array.prototype.call(arguments);\n' +
            '    var fn = require("../lib/app")["lists"]["applist"];\n' +
            '    return fn.apply(this, args);\n' +
            '}'
        });
        test.same(_design.updates, {
            'appupdate': 'function () {\n' +
            '    var args = Array.prototype.call(arguments);\n' +
            '    var fn = require("../lib/app")["updates"]["appupdate"];\n' +
            '    return fn.apply(this, args);\n' +
            '}'
        });
        test.same(_design.rewrites, [
            {from: '/show/:id', to: '_show/appshow/:id'},
            {from: '/list', to: '_list/appshow/testview'}
        ]);
        // ensure that the array keeps its type, and doesn't change to an object
        // with the index numbers as properties: {"0": ..., "1": ...} etc
        test.ok(_design.rewrites instanceof Array);
        test.done();
    });
};

exports['loadApp - app module only'] = function (test) {
    var file = __dirname + '/fixtures/appname';

    packages.loadPackage(file, function (err, pkg, _design) {
        if (err) throw err;
        var pkgs = {};
        pkgs[pkg.name] = _design;
        packages.loadApp(pkgs, pkg.name, pkg.app);
        test.same(_design.shows, {
            'appshow': 'function () {\n' +
            '    var args = Array.prototype.call(arguments);\n' +
            '    var fn = require("../app")["shows"]["appshow"];\n' +
            '    return fn.apply(this, args);\n' +
            '}'
        });
        test.same(_design.lists, {
            'applist': 'function () {\n' +
            '    var args = Array.prototype.call(arguments);\n' +
            '    var fn = require("../app")["lists"]["applist"];\n' +
            '    return fn.apply(this, args);\n' +
            '}'
        });
        test.same(_design.updates, {
            'appupdate': 'function () {\n' +
            '    var args = Array.prototype.call(arguments);\n' +
            '    var fn = require("../app")["updates"]["appupdate"];\n' +
            '    return fn.apply(this, args);\n' +
            '}'
        });
        test.equals(
            _design.validate_doc_update,
            'function (oldDoc, newDoc, userCtx) {\n' +
            '    // validate fn\n' +
            '}'
        );
        test.same(_design.rewrites, [
            {from: '/show/:id', to: '_show/appshow/:id'},
            {from: '/list', to: '_list/appshow/testview'}
        ]);
        test.done();
    });
};

exports['loadApp - duplicate validate_doc_update test'] = function (test) {
    test.expect(2);
    var file = __dirname + '/fixtures/validate_test';

    packages.loadPackage(file, function (err, pkg, _design) {
        if (err) throw err;
        var pkgs = {};
        pkgs[pkg.name] = _design;
        try {
            packages.loadApp(pkgs, pkg.name, pkg.app);
        }
        catch (e) {
            test.equals(
                e.message,
                'Could not load app: validate_doc_update already exists'
            );
        }
        test.equals(
            _design.validate_doc_update,
            'function (newDoc, oldDoc, userCtx) {\n' +
            '    // some validation function\n' +
            '}'
        );
        test.done();
    });
};

exports['push'] = function (test) {
    test.expect(8);

    var pkgs = {
        testapp: {
            _attachments: {'1':'one', '2':'two'},
            other_properties: 'asdf'
        }
    };
    var instance = {
        hostname: 'host',
        port: 123,
        db: 'testdb'
    };

    var _save = couchdb.save;
    couchdb.save = function (ins, id, doc, options, callback) {
        test.same(ins, instance);
        test.equals(id, '_design/testapp');
        test.same(doc, pkgs.testapp);
        doc._rev = 1;
        callback(null, doc);
    };

    var _ensureDB = couchdb.ensureDB;
    couchdb.ensureDB = function (ins, callback) {
        test.same(ins, instance);
        callback(null, this);
    };

    var uploads = {};
    var _upload = couchdb.upload;
    couchdb.upload = function (ins, path, file, rev, callback) {
        test.same(ins, instance);
        uploads[path] = {file: file, rev: rev};
        callback(null, rev + 1);
    };

    packages.push(instance, pkgs, function (err) {
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
