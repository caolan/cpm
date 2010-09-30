var mustache = require('../deps/mustache');


var template = function (name, data) {
    var content = require('../templates/' + name);
    return mustache.to_html(content, data);
};

exports.rewrites = [
    {from: '/', to: '_list/home/packages'},
    {from: '/:name', to: '_list/package/packages', query: {
        startkey: [':name'], endkey: [':name', {}], include_docs: true
    }}

    // requires secure_rewrites to be turned off
    //{from: '/_session', to: '../../../_session'},

    /*{from: '/api', to: '_view/packages'},
    {from: '/api/:name', to: '_view/packages', query: {
        startkey: [':name'], endkey: [':name', {}]
    }},
    {from: '/api/:name/:version', to: '_view/packages', query: {
        startkey: [':name', ':version'], endkey: [':name', ':version']
    }},*/

    //{from: '/*', to: 'static/*'}
];

exports.lists = {
    home: function (head, req) {
        start({"headers": {"Content-Type": "text/html"}});
        var packages = [], row;
        while(row = getRow()) { packages.push(row.key[0]); }
        send(template('home.html', {packages: packages}));
    },
    package: function (head, req) {
        start({"headers": {"Content-Type": "text/html"}});
        var versions = [], row;
        while(row = getRow()) { versions.push(row.doc.package); }
        send(template('package.html', {
            package: versions[versions.length-1]
        }));
    }
};

exports.validate_doc_update = function (newDoc, savedDoc, userCtx) {
    if (!newDoc._deleted && newDoc.package) {
        /*if (!newDoc.package) {
            throw({forbidden: 'Packages must contain package metadata'});
        }*/
        if(!newDoc.package.version) {
            throw({forbidden: 'Packages must have a version number'});
        }
        if(typeof newDoc.package.version !== 'string') {
            throw({forbidden: 'Package version numbers should be a string'});
        }
        if(!newDoc.package.description) {
            throw({forbidden: 'Packages must have a description'});
        }
        if(newDoc._id != newDoc.package.name + '-' + newDoc.package.version){
            throw({forbidden: 'invalid package _id format'});
        }
    }
};
