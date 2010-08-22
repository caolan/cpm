{
    map: function (doc) {
        if (doc.package) {
            emit(doc.package.name, doc.package.version);
        }
    },
    reduce: function (keys, values, rereduce) {
        var rv = {};
        for (var i = 0; i < values.length; i++) {
            var name = values[i];
            if(!rv[name]) rv[name] = [];
            rv[name].push(keys[i][1]);
        }
        return rv;
    }
}
