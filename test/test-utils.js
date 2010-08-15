var utils = require('../lib/utils');

exports['propertyPath'] = function (test) {
    var obj = {test: 'test'};
    utils.setPropertyPath(obj, 'some/example/path.js', 'val');
    test.same(obj, {test: 'test', some: {example: {path: 'val'}}});
    utils.setPropertyPath(obj, 'some/other/path.js', 'val2');
    test.same(obj, {
        test: 'test',
        some: {
            example: {path: 'val'},
            other: {path: 'val2'}
        }
    });
    utils.setPropertyPath(obj, './test', 'test2');
    test.same(obj, {
        test: 'test2',
        some: {
            example: {path: 'val'},
            other: {path: 'val2'}
        }
    });
    test.done();
};

exports['propertyName'] = function (test) {
    test.equals(utils.propertyName('/path/to/file.js'), 'file');
    test.equals(utils.propertyName('/path/to/file.xyz'), 'file.xyz');
    test.equals(utils.propertyName('module.js'), 'module');
    test.equals(utils.propertyName('blah/blah/module.js'), 'module');
    test.equals(utils.propertyName('blah/blah/module.xyz.js'), 'module.xyz');
    test.done();
};

exports['descendants'] = function (test) {
    var dir = __dirname + '/fixtures/descendants_test';
    utils.descendants(dir, function (err, files) {
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
    utils.readJSON(p, function (err, settings) {
        test.ok(!err);
        test.same(settings, {one:1,two:2});
        test.done();
    });
};

exports['readJSON'] = function (test) {
    test.expect(1);
    var p = __dirname + '/fixtures/invalid_json';
    utils.readJSON(p, function (err, settings) {
        test.ok(err, 'return JSON parsing errors');
        test.done();
    });
};
