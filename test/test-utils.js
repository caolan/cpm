var utils = require('../lib/utils');

exports['propertyPath'] = function (test) {
    var obj = {test: 'test'};
    utils.setPropertyPath(obj, 'some/example/path', 'val');
    test.same(obj, {test: 'test', some: {example: {path: 'val'}}});
    utils.setPropertyPath(obj, 'some/other/path', 'val2');
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
