var filesystem = require('../lib/transports/filesystem'),
    child_process = require('child_process');


exports['getPackage - no dependencies'] = function (test) {
    var p = __dirname + '/fixtures/testpackage';
    var settings = {repositories: {}, instances: {}};

    filesystem.getPackage(settings, p, function (err, pkg) {
        if (err) throw err;
        test.same(pkg, require(__dirname + '/fixtures/testpackage_loaded'));
        test.done();
    });
};

exports['getMetadata'] = function (test) {
    var p = __dirname + '/fixtures/appname';
    var settings = {repositories: {}, instances: {}};

    filesystem.getMetadata(settings, p, function (err, meta) {
        if (err) throw err;
        test.same(meta, {
            "name": "appname",
            "description": "test app",
            "version": "0.1.2",
            "app": "app",
            "paths": {
                "modules": ["app.js"]
            }
        });
        test.done();
    });
};

exports['putPackage'] = function (test) {
    var pkg = require(__dirname + '/fixtures/testpackage_loaded');
    var from = __dirname + '/fixtures/testpackage';
    var to = __dirname + '/fixtures/testpackage_put';
    var settings = {repositories: {}, instances: {}};

    // delete any previous test data
    var rm = child_process.spawn('rm', ['-rf', to]);
    rm.on('exit', function (code) {
        // put package to fixtures/test/testpackage_put
        filesystem.putPackage(settings, to, pkg, function (err) {
            if (err) throw err;
            var diff = child_process.spawn('diff', [from, to]);
            diff.on('exit', function (code) {
                test.equals(code, 0, 'there should be no differences');
                test.done();
            });
        });
    });
};
