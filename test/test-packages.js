var packages = require('../lib/packages');


exports['loadPackage'] = function (test) {
    var file = __dirname + '/fixtures/testpackage';

    packages.loadPackage(file, function (err, pkg, _design, attachments) {
        if(err) throw err;

        test.same(pkg, {
            name: 'testpackage',
            dependencies: [
                'testlib1',
                'testlib2'
            ],
            directories: {
                attachments: ["static"],
                properties: ["validate_doc_update.js"]
            }
        });
        test.same(_design, {
            'package': pkg,
            'validate_doc_update': 'function (newDoc, oldDoc, userCtx) {\n' +
                '    // some validation function\n' +
            '};\n'
        });
        test.same(attachments, []);
        test.done();
    });
};
