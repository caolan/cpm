var settings = require('settings'),
    path = require('path');


exports['readSettingsFile'] = function (test) {
    test.expect(2);
    var p = __dirname + '/fixtures/cpmrc';
    settings.readSettingsFile(p, function (err, settings) {
        test.ok(!err);
        test.same(settings, {one:1,two:2});
        test.done();
    });
};

exports['readSettingsFile'] = function (test) {
    test.expect(1);
    var p = __dirname + '/fixtures/cpmrc_invalid';
    settings.readSettingsFile(p, function (err, settings) {
        test.ok(err, 'return JSON parsing errors');
        test.done();
    });
};

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

    var _readSettingsFile = settings.readSettingsFile;
    settings.readSettingsFile = function (p, callback) {
        test.equals(p, '/home/user/.cpmrc');
        process.nextTick(function () {
            callback(null, {a:1,b:2});
        });
        settings.readSettingsFile = function (p, callback) {
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
        test.same(s, {a:1,b:3,c:4});
        process.env['HOME'] = _home;
        settings.readSettingsFile = _readSettingsFile;
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

    var _readSettingsFile = settings.readSettingsFile;
    settings.readSettingsFile = function (p, callback) {
        test.equals(p, '/home/user/.cpmrc');
        process.nextTick(function () {
            callback(null, {a:1,b:2});
        });
        settings.readSettingsFile = function (p, callback) {
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
        test.same(s, {a:1,b:2});
        process.env['HOME'] = _home;
        settings.readSettingsFile = _readSettingsFile;
        settings.validate = _validate;
        path.exists = _exists;
        test.done();
    });
};

exports['loadSettings return errors from readSettingsFile'] = function (test) {
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

    var _readSettingsFile = settings.readSettingsFile;
    settings.readSettingsFile = function (p, callback) {
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
        settings.readSettingsFile = _readSettingsFile;
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

    var _readSettingsFile = settings.readSettingsFile;
    settings.readSettingsFile = function (p, callback) {
        callback();
    };

    var _validate = settings.validate;
    settings.validate = function (settings) {
        throw new Error('validation error');
    };

    settings.loadSettings('projectdir', function (err, s) {
        test.equals(err.message, 'validation error');
        process.env['HOME'] = _home;
        settings.readSettingsFile = _readSettingsFile;
        settings.validate = _validate;
        path.exists = _exists;
        test.done();
    });
};

exports['validate ok'] = function (test) {
    settings.validate({
        cache: '/home/user/.cpm/cache'
    });
    test.done();
};

exports['validate - empty'] = function (test) {
    test.expect(1);
    try       { settings.validate({}); }
    catch (e) { test.ok(e); }
    test.done();
};
