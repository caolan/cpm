var packages = require('../lib/packages'),
    couchdb = require('../lib/couchdb'),
    async = require('../deps/async'),
    utils = require('../lib/utils'),
    child_process = require('child_process'),
    fs = require('fs');


exports['loadPackage'] = function (test) {
    var dir = __dirname + '/fixtures/testpackage';

    packages.loadPackage(dir, function (err, pkg, _design) {
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
        var static_dir = dir + '/static';
        test.same(_design.package, pkg);
        test.same(_design.cpm.files.sort(), [
            'validate_doc_update.js',
            'templates/test.html',
            'lib/app.js',
            'lib/module2.js',
            'lib/module.js',
            'views/testview.js',
            'views/testview2.js',
            'shows/testshow.js',
            'static/folder/file1',
            'static/file2',
            'static/file3'
        ].sort());
        test.same(_design.cpm.properties_files, {
            'validate_doc_update.js': fs.readFileSync(
                dir + '/validate_doc_update.js'
            ).toString(),
            'views/testview.js': fs.readFileSync(
                dir + '/views/testview.js'
            ).toString(),
            'views/testview2.js': fs.readFileSync(
                dir + '/views/testview2.js'
            ).toString(),
            'shows/testshow.js': fs.readFileSync(
                dir + '/shows/testshow.js'
            ).toString()
        });
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
            '_attachments',
            'cpm'
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

exports['clone'] = function (test) {
    test.expect(10);

    var pkg = {
        _id: '_design/clone_test',
        _rev: 'rev_no',
        package: {
            name: 'clone_test',
            version: '0.0.1',
            paths: {
                modules: ['lib','deps'],
                properties: 'views',
                templates: 'templates',
                attachments: ['static']
            }
        },
        cpm: {
            properties_files: {
                'views/testview.js': '{\n' +
                '    map: function (doc) {\n' +
                '        emit(doc._id, doc);\n' +
                '    }\n' +
                '}\n'
            },
            files: [
                'lib/hello.js',
                'deps/name.js',
                'views/testview.js',
                'templates/test.html',
                'static/index.html'
            ]
        },
        views: {
            testview: {
                map: 'function (doc) {\n' +
                '        emit(doc._id, doc);\n' +
                '    }'
             }
        },
        templates: {
            'test.html': "module.exports = '<h1>\"\\'test\\'\"</h1>\\n';"
        },
        lib: {
            hello: "exports.hello = function (name) {\n" +
            "    return 'hello ' + name;\n" +
            "};\n"
        },
        deps: {
            name: "exports.name = 'world';\n"
        }
    };

    var ins = {
        hostname: 'hostname',
        port: 5984,
        db: 'db'
    };

    var dir = __dirname + '/fixtures/clone_test';

    var _couchdb_get = couchdb.get;
    couchdb.get = function (instance, id, callback) {
        test.same(instance, ins);
        test.equals(id, pkg._id);
        callback(null, pkg);
    };

    var _couchdb_download = couchdb.download;
    couchdb.download = function (instance, path, file, callback) {
        test.same(instance, ins);
        test.equals(path, pkg._id + '/static/index.html');
        test.equals(file, dir + '/static/index.html');
        callback(null);
    };

    // remove any old test data
    var rm = child_process.spawn('rm', ['-rf', dir]);
    rm.on('error', function (err) { throw err; });
    rm.on('exit', function (code) {
        utils.ensureDir(dir, function (err) {
            if (err) {
                throw err;
                return test.done();
            }

            packages.clone(ins, pkg._id, dir, function (err) {
                if (err) {
                    throw err;
                    return test.done();
                }
                async.parallel([
                    function (cb) {
                        fs.readFile(dir+'/lib/hello.js', function (err, data) {
                            if (err) return cb(err);
                            test.equals(data.toString(), pkg.lib.hello);
                            cb();
                        });
                    },
                    function (cb) {
                        fs.readFile(dir+'/deps/name.js', function (err, data) {
                            if (err) return cb(err);
                            test.equals(data.toString(), pkg.deps.name);
                            cb();
                        });
                    },
                    function (cb) {
                        var f = 'templates/test.html';
                        fs.readFile(dir + '/' + f, function (err, data) {
                            if (err) return cb(err);
                            test.equals(
                                data.toString(),
                                '<h1>"\'test\'"</h1>\n'
                            );
                            cb();
                        });
                    },
                    function (cb) {
                        var f = 'views/testview.js';
                        fs.readFile(dir + '/' + f, function (err, data) {
                            if (err) return cb(err);
                            test.equals(
                                data.toString(),
                                pkg.cpm.properties_files[f]
                            );
                            cb();
                        });
                    },
                    function (cb) {
                        var f = 'package.json';
                        fs.readFile(dir + '/' + f, function (err, data) {
                            if (err) return cb(err);
                            test.equals(
                                data.toString(),
                                JSON.stringify(pkg.package, null, 4) + '\n'
                            );
                            cb();
                        });
                    }
                ], function (err) {
                    if (err) throw err;
                    couchdb.get = _couchdb_get;
                    test.done();
                });
            });

        });
    });

};

exports['pathType'] = function (test) {
    var pkg = {
        package: {
            paths: {
                modules: ['deps','lib','validate_doc_update.js'],
                attachments: 'static',
                templates: 'templates',
                properties: ['views', 'shows']
            }
        }
    };
    test.equals(packages.pathType(pkg, 'lib/test/xyz'), 'modules');
    test.equals(packages.pathType(pkg, 'deps/test/xyz'), 'modules');
    test.equals(packages.pathType(pkg, 'validate_doc_update.js'), 'modules');
    test.equals(packages.pathType(pkg, 'static/index.html'), 'attachments');
    test.equals(packages.pathType(pkg, 'templates/index.html'), 'templates');
    test.equals(packages.pathType(pkg, 'views/myview'), 'properties');
    try {
        packages.pathType(pkg, 'xyz');
        test.ok(false, 'should have thrown error');
    }
    catch (e) {
        test.ok(e, 'error thrown for invalid path');
    }
    test.done();
};
