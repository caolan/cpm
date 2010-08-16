var packages = require('../lib/packages');


exports['loadPackage'] = function (test) {
    var file = __dirname + '/fixtures/testpackage';

    packages.loadPackage(file, function (err, pkg, _design) {
        if(err) throw err;

        test.same(pkg, {
            name: 'testpackage',
            dependencies: [
                'testlib1',
                'testlib2'
            ],
            directories: {
                attachments: ["static"],
                templates: ["templates"],
                modules: ["lib"],
                properties: ["validate_doc_update.js", "shows", "views"]
            }
        });
        var static_dir = __dirname + '/fixtures/testpackage/static';
        test.same(_design, {
            'package': pkg,
            'templates': {
                'test.html': "module.exports = '<h1>\"\\'test\\'\"</h1>\\n';"
            },
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
             },
             '_attachments': {
                'static/folder/file1': static_dir + '/folder/file1',
                'static/file2': static_dir + '/file2',
                'static/file3': static_dir + '/file3'
             }
        });
        test.done();
    });
};
