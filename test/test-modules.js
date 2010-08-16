var modules = require('../lib/modules');

exports['require'] = function (test) {
    var module_cache = {};
    var packages = {
        testapp: {
            lib: {
                testlib: "exports.hello = function (name) {\n" +
                "    return 'hello ' + name;\n" +
                "};"
             },
             other: {
                lib2: "exports.hi = function (name) {\n" +
                "    return 'hi ' + name;\n" +
                "};"
             }
         },
         app2: {
            lib: {
                asdf: "exports.test = 'asdf';"
            }
         }
    };
    test.equals(
        modules.require(
            module_cache, packages, '/testapp', 'lib/testlib'
        ).hello('world'),
        'hello world'
    );
    test.equals(
        modules.require(
            module_cache, packages, '/testapp/lib', './testlib'
        ).hello('world'),
        'hello world'
    );
    test.equals(
        modules.require(
            module_cache, packages, '/testapp/lib', 'testlib'
        ).hello('world'),
        'hello world'
    );
    test.equals(
        modules.require(
            module_cache, packages, '/testapp/lib', '../other/lib2'
        ).hi('world'),
        'hi world'
    );
    test.equals(
        modules.require(
            module_cache, packages, '/testapp/lib', '../../app2/lib/asdf'
        ).test,
        'asdf'
    );
    test.equals(module_cache['/app2/lib/asdf'].test, 'asdf');
    test.equals(module_cache['/testapp/other/lib2'].hi('test'), 'hi test');
    test.done();
};

exports['require within a modules'] = function (test) {
    var module_cache = {};
    var packages = {
        testapp: {
            lib: {
                name: "exports.name = 'world';\n",
                hello: "var name = require('name').name;\n" +
                "exports.hello = function () {\n" +
                "    return 'hello ' + name;\n" +
                "};"
             }
         }
    };
    test.equals(
        modules.require(module_cache, packages, '/testapp/lib','name').name,
        'world'
    );
    test.equals(module_cache['/testapp/lib/name'].name, 'world');
    test.equals(
        modules.require(module_cache, packages, '/testapp/lib','hello').hello(),
        'hello world'
    );
    test.done();
};

exports['require between modules'] = function (test) {
    var module_cache = {};
    var packages = {
        app1: {
            lib: {
                hello: "var name = require('../../app2/lib/name').name;\n" +
                "exports.hello = function () {\n" +
                "    return 'hello ' + name;\n" +
                "};"
             }
         },
         app2: {
            lib: {
                name: "exports.name = 'world';\n",
            }
         }
    };
    test.equals(
        modules.require(module_cache, packages, '/app1/lib','hello').hello(),
        'hello world'
    );
    test.done();
};

exports['require missing module'] = function (test) {
    test.expect(1);
    var packages = {
        app1: {
            lib: {
                hello: "var name = require('../../app2/lib/name').name;\n" +
                "exports.hello = function () {\n" +
                "    return 'hello ' + name;\n" +
                "};"
             }
         }
    };
    try {
        modules.require({}, packages, '/app1/lib','hello').hello();
    }
    catch (e) {
        test.equals(e.message, 'Could not require module: ../../app2/lib/name');
    }
    test.done();
};
