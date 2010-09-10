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


var ins = 'http://admin:password@localhost:5984/cpm_test_db';
var repo_ins = 'http://admin:password@localhost:5984/cpm_test_repository';
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


var clear_test_db = function (callback) {
    // remove any old test data
    couchdb(ins).delete('', null, function (err) {
        if (err && err.message !== 'missing') throw err;

        couchdb(ins).ensureDB(function (err) {
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
    couchdb(repo_ins).delete('', null, function (err) {
        if (err && err.message !== 'missing') return callback(err);

        couchdb(repo_ins).ensureDB(function (err) {
            if (err) return callback(err);

            var p = __dirname + '/../repository';
            filesystem.getPackage(settings, p, function (err, pkg) {
                if (err) return callback(err);

                // put package to cpm_test_repository
                db.putPackage(settings, repo_ins, pkg, callback);

            });
        });
    });
};

var settings = {
    default_repository: 'default',
    repositories: {'default': repo_ins},
    instances: {}
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

        filesystem.getPackage(settings, p, function (err, pkg) {
            if (err) throw err;

            // put package to cpm_test_db
            db.putPackage(settings, ins, pkg, function (err) {
                if (err) throw err;

                couchdb(ins).get('_design/testpackage', function (err, pkg) {
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
    var loc = ins + '/_design/testpackage';

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
        var loc = repo_ins + '/' + id;

        filesystem.getPackage(settings, p, function (err, pkg) {
            if (err) throw err;

            // put package to cpm_test_db
            repository.putPackage(settings, loc, pkg, function (err) {
                if (err) throw err;

                couchdb(repo_ins).get(id, function (err, pkg) {
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
        var lib_id = '_design/dep_test_lib';
        var app_id = '_design/dep_test';

        filesystem.getPackageFull(settings, p, function (err, pkg, pkgs) {
            if (err) throw err;

            async.forEach(Object.keys(pkgs), function (k, cb) {
                db.putPackage(settings, ins, pkgs[k], cb);
            },
            function (err) {
                if (err) throw err;

                couchdb(ins).get(app_id, function (err, pkg) {
                    test.equals(err, null);
                    test.equals(pkg.package.name, 'dep_test');

                    couchdb(ins).get(lib_id, function (err, pkg) {
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
    db.list(settings, ins, function (err, pkgs) {
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
        var p = repo_ins + '/dep_test_lib-0.0.3';
        couchdb(repo_ins).exists(p, function (err, exists) {
            if (err) throw err;
            test.equals(exists, false);
            test.done();
        });
    });
};

// delete
exports['db.deletePackage'] = function (test) {
    var loc = ins + '/_design/dep_test';
    db.deletePackage(settings, loc, function (err) {
        if (err) throw err;
        couchdb(ins).exists('_design/dep_test', function (err, exists) {
            if (err) throw err;
            test.equals(exists, false);
            test.done();
        });
    });
};
