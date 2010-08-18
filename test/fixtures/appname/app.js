exports.shows = {
    appshow: function (doc, req) {
        return doc._id + " shown";
    }
};

exports.lists = {
    applist: function (head, req) {
        // list fn
    }
};

exports.updates = {
    appupdate: function (doc, req) {
        // update fn
    }
};

exports.validate_doc_update = function (oldDoc, newDoc, userCtx) {
    // validate fn
};

exports.rewrites = [
    {from: '/show/:id', to: '_show/appshow/:id'},
    {from: '/list', to: '_list/appshow/testview'}
];
