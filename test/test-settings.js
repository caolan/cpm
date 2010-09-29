var settings = require('../lib/settings'),
    util = require('../lib/util'),
    path = require('path');


exports['loadSettings with local .cpmrc'] = function (test) {
    test.expect(6);
    var _home = process.env['HOME'];
    process.env['HOME'] = '/home/user';

    var _exists = path.exists;
    path.exists = function (p, callback) {
        test.ok(true, 'path.exists called');
        process.nextTick(function () {
            callback(true);
        });
    };

    var _readJSON = util.readJSON;
    util.readJSON = function (p, callback) {
        test.equals(p, '/home/user/.cpmrc');
        process.nextTick(function () {
            callback(null, {a:1,b:2});
        });
        util.readJSON = function (p, callback) {
            test.equals(p, 'projectdir/.cpmrc');
            process.nextTick(function () {
                callback(null, {b:3,c:4});
            });
        };
    };

    var _validate = settings.validate;
    settings.validate = function (settings) {
        test.ok(true, 'validate called');
    };

    settings.loadSettings('projectdir', function (err, s) {
        test.same(s, {
            cache: '/home/user/.cpm/cache',
            repositories: {},
            instances: {},
            a:1,
            b:3,
            c:4
        });
        process.env['HOME'] = _home;
        util.readJSON = _readJSON;
        settings.validate = _validate;
        path.exists = _exists;
        test.done();
    });
};

exports['loadSettings without local .cpmrc'] = function (test) {
    test.expect(5);
    var _home = process.env['HOME'];
    process.env['HOME'] = '/home/user';

    var _exists = path.exists;
    path.exists = function (p, callback) {
        test.ok(true, 'path.exists called');
        if (p == 'projectdir/.cpmrc') process.nextTick(function () {
            callback(false);
        });
        else process.nextTick(function () {
            callback(true);
        });
    };

    var _readJSON = util.readJSON;
    util.readJSON = function (p, callback) {
        test.equals(p, '/home/user/.cpmrc');
        process.nextTick(function () {
            callback(null, {a:1,b:2});
        });
        util.readJSON = function (p, callback) {
            test.ok(false, 'should not be called for local .cpmrc');
            process.nextTick(function () {
                callback(null, {b:3,c:4});
            });
        };
    };

    var _validate = settings.validate;
    settings.validate = function (settings) {
        test.ok(true, 'validate called');
    };

    settings.loadSettings('projectdir', function (err, s) {
        test.same(s, {
            cache: '/home/user/.cpm/cache',
            repositories: {},
            instances: {},
            a:1,
            b:2
        });
        process.env['HOME'] = _home;
        util.readJSON = _readJSON;
        settings.validate = _validate;
        path.exists = _exists;
        test.done();
    });
};

exports['loadSettings return errors from readJSON'] = function (test) {
    test.expect(3);
    var _home = process.env['HOME'];
    process.env['HOME'] = '/home/user';

    var _exists = path.exists;
    path.exists = function (p, callback) {
        test.ok(true, 'path.exists called');
        process.nextTick(function () {
            callback(true);
        });
    };

    var _readJSON = util.readJSON;
    util.readJSON = function (p, callback) {
        test.equals(p, '/home/user/.cpmrc');
        process.nextTick(function () {
            callback('error', null);
        });
    };

    var _validate = settings.validate;
    settings.validate = function (settings) {
        test.ok(false, 'dont validate files not read');
    };

    settings.loadSettings('projectdir', function (err, s) {
        test.equals(err, 'error');
        process.env['HOME'] = _home;
        util.readJSON = _readJSON;
        settings.validate = _validate;
        path.exists = _exists;
        test.done();
    });
};

exports['loadSettings return errors from validate'] = function (test) {
    test.expect(3);
    var _home = process.env['HOME'];
    process.env['HOME'] = '/home/user';

    var _exists = path.exists;
    path.exists = function (p, callback) {
        test.ok(true, 'path.exists called');
        process.nextTick(function () {
            callback(true);
        });
    };

    var _readJSON = util.readJSON;
    util.readJSON = function (p, callback) {
        callback();
    };

    var _validate = settings.validate;
    settings.validate = function (settings) {
        throw new Error('validation error');
    };

    settings.loadSettings('projectdir', function (err, s) {
        test.equals(err.message, 'validation error');
        process.env['HOME'] = _home;
        util.readJSON = _readJSON;
        settings.validate = _validate;
        path.exists = _exists;
        test.done();
    });
};

exports['validate ok'] = function (test) {
    settings.validate({
        cache: '/home/user/.cpm/cache',
        default_repository: 'default',
        repositories: {
            'default': {
                hostname: 'localhost',
                port: 5984,
                db: 'repository'
            }
        }
    });
    test.done();
};

exports['validate - empty'] = function (test) {
    test.expect(1);
    try       { settings.validate({}); }
    catch (e) { test.ok(e); }
    test.done();
};
