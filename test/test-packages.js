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
                modules: ["lib"],
                properties: ["validate_doc_update.js", "shows", "views"]
            }
        });
        test.same(_design, {
            'package': pkg,
            'lib': {
                'module': 'exports.test = "test module";\n'
            },
            'validate_doc_update': 'function (newDoc, oldDoc, userCtx) {\n' +
            '    // some validation function\n' +
            '}',
            'shows': {
                'testshow': 'function (doc, req) {\n' +
                '    // some show function\n' +
                '}'
            },
            'views': {
                'testview': {
                    map: 'function (doc) {\n' +
                    '        emit(doc._id, doc);\n' +
                    '    }'
                 }
             }
        });
        test.same(attachments, []);
        test.done();
    });
};
