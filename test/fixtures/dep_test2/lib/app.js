var dep_test_lib_rewrites = require('../../dep_test_lib/lib/rewrites');

exports.rewrites = [
    {'from': '/', 'to': dep_test_lib_rewrites}
];
