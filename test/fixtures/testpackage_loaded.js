module.exports = {
    "_attachments": {
        "static/folder/file1": __dirname + "/testpackage/static/folder/file1",
        "static/file2": __dirname + "/testpackage/static/file2",
        "static/file3": __dirname + "/testpackage/static/file3"
    },
    "cpm": {
        "files": [
            "validate_doc_update.js",
            "static/folder/file1",
            "static/file2",
            "static/file3",
            "shows/testshow.js",
            "views/testview.js",
            "views/testview2.js",
            "lib/app.js",
            "lib/module2.js",
            "lib/module.js",
            "templates/test.html"
        ],
        "properties_files": {
            "validate_doc_update.js": "function (newDoc, oldDoc, userCtx) {\n    // some validation function\n}\n",
            "shows/testshow.js": "function (doc, req) {\n    // some show function\n}\n",
            "views/testview.js": "{\n    map: function (doc) {\n        emit(doc._id, doc);\n    }\n}\n",
            "views/testview2.js": "{\n    map: function (doc) {\n        emit(doc._id, doc);\n    }\n}\n"
        }
    },
    "validate_doc_update": "function (newDoc, oldDoc, userCtx) {\n    // some validation function\n}",
    "shows": {
        "testshow": "function (doc, req) {\n    // some show function\n}",
        "appshow": "function () {\n    var args = Array.prototype.slice.call(arguments);\n    var fn = require(\"lib/app\")[\"shows\"][\"appshow\"];\n    return fn.apply(this, args);\n}"
    },
    "views": {
        "testview": {
            "map": "function (doc) {\n        emit(doc._id, doc);\n    }"
        },
        "testview2": {
            "map": "function (doc) {\n        emit(doc._id, doc);\n    }"
        }
    },
    "lib": {
        "app": "exports.shows = {\n    appshow: function (doc, req) {\n        return doc._id + \" shown\";\n    }\n};\n\nexports.lists = {\n    applist: function (head, req) {\n        // list fn\n    }\n};\n\nexports.updates = {\n    appupdate: function (doc, req) {\n        // update fn\n    }\n};\n\nexports.rewrites = [\n    {from: '/show/:id', to: '_show/appshow/:id'},\n    {from: '/list', to: '_list/appshow/testview'}\n];\n",
        "module2": "exports.test = \"test module 2\";\n",
        "module": "exports.test = \"test module\";\n"
    },
    "templates": {
        "test.html": "module.exports = '<h1>\"\\'test\\'\"</h1>\\n';"
    },
    "package": {
        "name": "testpackage",
        "description": "test package",
        "version": "0.0.1",
        "app": "lib/app",
        "paths": {
            "attachments": "static",
            "templates": [
                "templates"
            ],
            "modules": "lib",
            "properties": [
                "validate_doc_update.js",
                "shows",
                "views"
            ]
        }
    },
    "language": "javascript",
    "lists": {
        "applist": "function () {\n    var args = Array.prototype.slice.call(arguments);\n    var fn = require(\"lib/app\")[\"lists\"][\"applist\"];\n    return fn.apply(this, args);\n}"
    },
    "updates": {
        "appupdate": "function () {\n    var args = Array.prototype.slice.call(arguments);\n    var fn = require(\"lib/app\")[\"updates\"][\"appupdate\"];\n    return fn.apply(this, args);\n}"
    },
    "rewrites": [
        {
            "from": "/show/:id",
            "to": "_show/appshow/:id"
        },
        {
            "from": "/list",
            "to": "_list/appshow/testview"
        }
    ]
};
