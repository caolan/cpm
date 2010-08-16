var modules = require('../lib/modules');

exports['require'] = function (test) {
    var module_cache = {};
    var packages = {
        testapp: {
            _design: {
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
             }
         },
         app2: {
            _design: {
                lib: {
                    asdf: "exports.test = 'asdf';"
                }
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
