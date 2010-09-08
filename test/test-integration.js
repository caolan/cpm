/**
 * TODO: Currently, the order of execution of these tests matters!
 * These are not really seperate tests but a single test script, and it could
 * do with some tidying up.
 */

var db = require('../lib/transports/db'),
    filesystem = require('../lib/transports/filesystem'),
    repository = require('../lib/transports/repository'),
    couchdb = require('../lib/couchdb'),
    async = require('../deps/async'),
    child_process = require('child_process');


var expected = require(__dirname + '/fixtures/testpackage_loaded');

var check_pkg = function(pkg, test) {
    test.same(Object.keys(pkg).sort(), Object.keys(expected).sort());
    test.same(
        Object.keys(pkg.cpm).sort(),
        Object.keys(expected.cpm).sort()
    );
    test.same(pkg.cpm.files.sort(), expected.cpm.files.sort());
    test.same(pkg.cpm.properties_files, expected.cpm.properties_files);
    // just test the keys, the values will be different
    test.same(
        Object.keys(pkg._attachments).sort(),
        Object.keys(expected._attachments).sort()
    );
    test.same(pkg.validate_doc_update, expected.validate_doc_update);
    test.same(pkg.shows, expected.shows);
    test.same(pkg.views, expected.views);
    test.same(pkg.lib, expected.lib);
    test.same(pkg.templates, expected.templates);
    test.same(pkg.package, expected.package);
    test.same(pkg.language, expected.language);
    test.same(pkg.lists, expected.lists);
    test.same(pkg.updates, expected.updates);
    test.same(pkg.rewrites.sort(), expected.rewrites.sort());
};

var repo_ins = {
    hostname: 'localhost',
    port: 5984,
    db: 'cpm_test_repository'
};

var clear_test_db = function (callback) {
    // remove any old test data
    couchdb.delete(ins, '', null, function (err) {
        if (err && err.message !== 'missing') throw err;

        couchdb.ensureDB(ins, function (err) {
            if (err) throw err;
            callback();
        });

    });
};

var delete_test_files = function (p, callback) {
    var rm = child_process.spawn('rm', ['-rf', p]);
    rm.on('exit', function (code) {
        callback();
    });
}

var reset_repository = function (callback) {
    // remove any old test data
    couchdb.delete(ins, '', null, function (err) {
        if (err && err.message !== 'missing') return callback(err);

        couchdb.ensureDB(ins, function (err) {
            if (err) return callback(err);

            var p = __dirname + '/../repository';
            var loc = 'http://localhost:5984/cpm_test_repository';
            filesystem.getPackage(settings, p, function (err, pkg) {
                if (err) return callback(err);

                // put package to cpm_test_db
                db.putPackage(settings, loc, pkg, callback);

            });
        });
    });
};

var settings = {
    default_repository: 'default',
    repositories: {
        'default': {
            hostname: 'localhost',
            port: 5984,
            db: 'cpm_test_repository'
        }
    },
    instances: {}
};

var ins = {
    hostname: 'localhost',
    port: 5984,
    db: 'cpm_test_db'
};

var diff_paths = function (a, b, test, callback) {
    var diff = child_process.spawn('diff', [a, b]);
    diff.on('exit', function (code) {
        test.equals(code, 0, 'there should be no differences');
        callback();
    });
};

// push
exports['filesystem.getPackage -> db.putPackage'] = function (test) {
    clear_test_db(function () {
        var p = __dirname + '/fixtures/testpackage';
        var loc = 'http://localhost:5984/cpm_test_db';

        filesystem.getPackage(settings, p, function (err, pkg) {
            if (err) throw err;

            // put package to cpm_test_db
            db.putPackage(settings, loc, pkg, function (err) {
                couchdb.get(ins, '_design/testpackage', function (err, pkg) {
                    if (err) throw err;
                    delete pkg._id;
                    delete pkg._rev;
                    check_pkg(pkg, test);
                    test.done();
                });
            });

        });
    });
};

// clone
exports['db.getPackage -> filesystem.putPackage'] = function (test) {
    var orig = __dirname + '/fixtures/testpackage';
    var p = __dirname + '/fixtures/cpm_test_db_clone';
    var loc = 'http://localhost:5984/cpm_test_db/_design/testpackage';

    db.getPackage(settings, loc, function (err, pkg) {
        if (err) throw err;

        delete_test_files(p, function () {
            // put package to fixtures/cpm_test_db_clone
            filesystem.putPackage(settings, p, pkg, function (err) {
                if (err) throw err;
                diff_paths(orig, p, test, test.done);
            });
        });

    });
};

// publish
exports['filesystem.getPackage -> repository.putPackage'] = function (test) {
    reset_repository(function (err) {
        if (err) throw err;

        var id = 'dep_test_lib-0.0.3';

        var p = __dirname + '/fixtures/dep_test_lib';
        var loc = 'http://localhost:5984/cpm_test_repository/' + id;

        filesystem.getPackage(settings, p, function (err, pkg) {
            if (err) throw err;

            // put package to cpm_test_db
            repository.putPackage(settings, loc, pkg, function (err) {
                couchdb.get(repo_ins, id, function (err, pkg) {
                    if (err) throw err;
                    test.equals(pkg.package.name, 'dep_test_lib');
                    test.done();
                });
            });

        });
    });
};

// clone from repository
exports['repository.getPackage -> filesystem.putPackage'] = function (test) {
    var orig = __dirname + '/fixtures/dep_test_lib';
    var p = __dirname + '/fixtures/cpm_test_repository_clone';
    var loc = 'dep_test_lib';

    repository.getPackage(settings, loc, function (err, pkg) {
        if (err) throw err;

        delete_test_files(p, function () {
            filesystem.putPackage(settings, p, pkg, function (err) {
                if (err) throw err;
                diff_paths(orig, p, test, test.done);
            });
        });

    });
};

// push with dependencies
exports['filesystem.getPackageFull -> db.putPackage'] = function (test) {
    clear_test_db(function () {
        var p = __dirname + '/fixtures/dep_test';
        var loc = 'http://localhost:5984/cpm_test_db';
        var lib_id = '_design/dep_test_lib';
        var app_id = '_design/dep_test';

        filesystem.getPackageFull(settings, p, function (err, pkg, pkgs) {
            if (err) throw err;

            async.forEach(Object.keys(pkgs), function (k, cb) {
                db.putPackage(settings, loc, pkgs[k], cb);
            },
            function (err) {
                if (err) throw err;

                couchdb.get(ins, app_id, function (err, pkg) {
                    test.equals(err, null);
                    test.equals(pkg.package.name, 'dep_test');

                    couchdb.get(ins, lib_id, function (err, pkg) {
                        test.equals(err, null);
                        test.equals(pkg.package.name, 'dep_test_lib');
                        test.done();
                    });

                });
            });

        });
    });
};

// list
exports['repository.list'] = function (test) {
    var loc = '';
    repository.list(settings, loc, function (err, pkgs) {
        if (err) throw err;
        test.same(pkgs, {'dep_test_lib': ['0.0.3']});
        test.done();
    });
};
exports['db.list'] = function (test) {
    var loc = 'http://localhost:5984/cpm_test_db';
    db.list(settings, loc, function (err, pkgs) {
        if (err) throw err;
        test.same(pkgs, {
            'dep_test_lib': ['0.0.3'],
            'dep_test': ['0.1.0']
        });
        test.done();
    });
};

// unpublish
exports['repository.deletePackage'] = function (test) {
    var loc = 'dep_test_lib@0.0.3';
    repository.deletePackage(settings, loc, function (err) {
        if (err) throw err;
        var p = 'http://localhost:5984/cpm_test_repository/dep_test_lib-0.0.3';
        couchdb.exists(repo_ins, p, function (err, exists) {
            if (err) throw err;
            test.equals(exists, false);
            test.done();
        });
    });
};

// delete
exports['db.deletePackage'] = function (test) {
    var loc = 'http://localhost:5984/cpm_test_db/_design/dep_test';
    db.deletePackage(settings, loc, function (err) {
        if (err) throw err;
        couchdb.exists(ins, '_design/dep_test', function (err, exists) {
            if (err) throw err;
            test.equals(exists, false);
            test.done();
        });
    });
};
