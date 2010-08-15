var packages = require('../lib/packages');


exports['loadPackage'] = function (test) {
    var file = __dirname + '/fixtures/testpackage';

    packages.loadPackage(file, function (err, pkg, _design, attachments) {
        test.same(pkg, {
            name: 'testpackage',
            dependencies: [
                'testlib1',
                'testlib2'
            ],
            directories: {
                attachments: ["static"],
                properties: ["views", "validate_doc_update.js"]
            }
        });
        test.same(_design, {'package': pkg});
        test.same(attachments, []);
        test.done();
    });
};
