var util = require('../lib/util'),
    path = require('path'),
    fs = require('fs'),
    child_process = require('child_process');


exports['setPropertyPath'] = function (test) {
    var obj = {test: 'test'};
    util.setPropertyPath(obj, 'some/example/path.js', 'val');
    test.same(obj, {test: 'test', some: {example: {path: 'val'}}});
    util.setPropertyPath(obj, 'some/other/path.js', 'val2');
    test.same(obj, {
        test: 'test',
        some: {
            example: {path: 'val'},
            other: {path: 'val2'}
        }
    });
    util.setPropertyPath(obj, './test', 'test2');
    test.same(obj, {
        test: 'test2',
        some: {
            example: {path: 'val'},
            other: {path: 'val2'}
        }
    });
    test.done();
};

exports['getPropertyPath'] = function (test) {
    var obj = {
        test: 'test',
        some: {
            example: {path: 'val'},
            other: {path: 'val2'}
        }
    };
    test.equals(util.getPropertyPath(obj, 'test'), 'test');
    test.equals(util.getPropertyPath(obj, 'some/example/path'), 'val');
    test.same(util.getPropertyPath(obj, 'some/other'), {path: 'val2'});
    test.same(util.getPropertyPath(obj, ''), obj);
    test.done();
};

exports['descendants'] = function (test) {
    var dir = __dirname + '/fixtures/descendants_test';
    util.descendants(dir, function (err, files) {
        if(err) throw err;
        test.same(files.sort(), [
            dir + '/file1',
            dir + '/file2',
            dir + '/folder1/file1.1',
            dir + '/folder2/folder2.1/file2.1.1',
            dir + '/folder2/folder2.2/file2.2.1',
            dir + '/folder2/folder2.2/file2.2.2'
        ].sort());
        test.done();
    });
};

exports['readJSON'] = function (test) {
    test.expect(2);
    var p = __dirname + '/fixtures/valid_json';
    util.readJSON(p, function (err, settings) {
        test.ok(!err);
        test.same(settings, {one:1,two:2});
        test.done();
    });
};

exports['readJSON'] = function (test) {
    test.expect(1);
    var p = __dirname + '/fixtures/invalid_json';
    util.readJSON(p, function (err, settings) {
        test.ok(err, 'return JSON parsing errors');
        test.done();
    });
};

exports['relpath'] = function (test) {
    var dir = '/some/test/path';
    test.equals(
        util.relpath('/some/test/path/some/file.ext', dir),
        'some/file.ext'
    );
    test.equals(
        util.relpath('/some/test/file.ext', dir),
        '../file.ext'
    );
    test.equals(
        util.relpath('some/test/file.ext', dir),
        'some/test/file.ext'
    );
    test.equals(
        util.relpath('/some/dir/../test/path/file.ext', dir),
        'file.ext'
    );
    test.equals(util.relpath('file.ext', dir), 'file.ext');
    test.done();
};

exports['stringifyFunctions'] = function (test) {
    var Script = process.binding('evals').Script;
    var obj = {
        a: {
            // this is not an instanceof Function but is
            // typeof 'function'...
            b: Script.runInNewContext("(function (){return 'fn1';})"),
            // this is an instanceof Function, and also typeof
            // Function
            c: function (){return 'fn2';},
            d: 123,
        },
        e: true,
        f: null,
        g: undefined,
        h: ['one', 'two', 3]
    }
    var stringified = util.stringifyFunctions(obj);
    test.same(
        stringified,
        {
            a: {
                b: "function (){return 'fn1';}",
                c: "function (){return 'fn2';}",
                d: 123,
            },
            e: true,
            f: null,
            g: undefined,
            h: ['one', 'two', 3]
        }
    );
    // deepEquals seems to test the string representations of functions
    // so we also need to test the type is correct
    test.equals(typeof stringified.a.b, 'string');
    test.equals(typeof stringified.a.c, 'string');
    // ensure that the array keeps its type, and doesn't change to an object
    // with the index numbers as properties: {"0": ..., "1": ...} etc
    test.ok(stringified.h instanceof Array);
    test.equals(stringified.h.length, 3);
    test.done();
};

exports['evalSandboxed'] = function (test) {
    test.expect(5);
    var obj = {test: 'test'};
    try { util.evalSandboxed("require('sys').puts('fail!')"); }
    catch (e) { test.ok(e, 'should throw an error'); }
    try { util.evalSandboxed("process.env['HOME']")}
    catch (e) { test.ok(e, 'should throw an error'); }
    try { util.evalSandboxed("obj.test = 'asdf'")}
    catch (e) { test.ok(e, 'should throw an error'); }
    test.equals(obj.test, 'test');
    test.same(util.evalSandboxed("{a: {b: 123}}"), {a: {b: 123}});
    test.done();
};

exports['padRight'] = function (test) {
    // pad strings below min length
    test.equals(util.padRight('test', 20), 'test                ');
    // don't pad strings equals to min length
    test.equals(util.padRight('1234567890', 10), '1234567890');
    // don't shorten strings above min length
    test.equals(util.padRight('123456789012345', 10), '123456789012345');
    test.done();
};

exports['ensureDir - new dirs'] = function (test) {
    test.expect(1);
    var p = __dirname + '/fixtures/ensure_dir/some/path';
    // remove any old test data
    var dir = __dirname + '/fixtures/ensure_dir';
    var rm = child_process.spawn('rm', ['-rf', dir]);
    rm.on('error', function (err) { throw err; });
    rm.on('exit', function (code) {
        util.ensureDir(p, function (err) {
            if (err) throw err;
            path.exists(p, function (exists) {
                test.ok(exists);
                test.done();
            });
        });
    });
};

exports['ensureDir - existing dir'] = function (test) {
    test.expect(1);
    var p = __dirname + '/fixtures/testpackage'
    fs.readdir(p, function (err, files) {
        util.ensureDir(p, function (err) {
            if (err) throw err;
            fs.readdir(p, function (err, new_files) {
                // test the contents of the directory are unchanged
                test.same(files, new_files);
                test.done();
            });
        });
    });
};

exports['cp'] = function (test) {
    var from = __dirname + '/fixtures/cp_file';
    var to = __dirname + '/fixtures/cp_file2';
    util.cp(from, to, function (err) {
        if (err) throw err;
        fs.readFile(to, function (err, content) {
            if (err) throw err;
            // TODO: sometimes the file is not written when this callback fires!
            // see notes in lib/util.js
            test.equals(content.toString(), 'test content\n');
            test.done();
        });
    });
};

exports['abspath'] = function (test) {
    test.equals(util.abspath('/some/path'), '/some/path');
    test.equals(util.abspath('some/path'), process.cwd() + '/some/path');
    test.equals(util.abspath('some/path', '/cwd'), '/cwd/some/path');
    test.equals(util.abspath('/some/path', '/cwd'), '/some/path');
    test.done();
};
