var packages = require('../lib/packages'),
    fs = require('fs');


exports['loadPackage'] = function (test) {
    var file = __dirname + '/fixtures/testpackage';

    packages.loadPackage(file, function (err, pkg, _design) {
        if(err) throw err;

        test.same(pkg, {
            name: 'testpackage',
            app: 'lib/app',
            dependencies: [
                'testlib1',
                'testlib2'
            ],
            paths: {
                attachments: ["static"],
                templates: ["templates"],
                modules: ["lib"],
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
            'app':fs.readFileSync(__dirname+'/fixtures/testpackage/lib/app.js').toString()
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
        test.same(_design._attachments, {
            'static/folder/file1': static_dir + '/folder/file1',
            'static/file2': static_dir + '/file2',
            'static/file3': static_dir + '/file3'
        });
        test.same(Object.keys(_design).sort(), [
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
