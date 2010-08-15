var packages = require('../lib/packages');

exports['loadPackage'] = function (test) {
    var file = __dirname + '/fixtures/package.json';
    packages.loadPackage(file, function(err, data){
        test.same(data, [{_design: {
            'package': {name: 'testpackage'}
        }}]);
        test.done();
    });
};
