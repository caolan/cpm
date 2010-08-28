{
    map: function (doc) {
        if (doc.package) {
            emit([doc.package.name, doc.package.version], doc._id);
        }
    }/*,
    reduce: function (keys, values, rereduce) {
        var rv = {};
        var latest = '';
        for (var i = 0; i < values.length; i++) {
            rv[values[i]] = keys[i][1];
            if (values[i] > latest) latest = values[i];
        }
        rv['latest'] = rv[latest];
        return rv;
    }*/
}
