var fs = require('fs'),
    utils = require('./utils');

exports.loadPackage = function (path, callback) {
    utils.readJSON(path, function(err, pkg){
        callback(err, [{_design: {package: pkg} }]);
    });
};
