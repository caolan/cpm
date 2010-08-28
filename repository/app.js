exports.validate_doc_update = function (newDoc, savedDoc, userCtx) {
    if (!newDoc._deleted) {
        if (!newDoc.package) {
            throw({forbidden: 'Packages must contain package metadata'});
        }
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

exports.rewrites = [
    {from: '/', to: '_view/packages'},
    {from: '/:name', to: '_view/packages', query: {
        startkey: [':name'], endkey: [':name', {}]
    }},
    {from: '/:name/:version', to: '_view/packages', query: {
        startkey: [':name', ':version'], endkey: [':name', ':version']
    }}
];
