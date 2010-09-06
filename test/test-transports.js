var transports = require('../lib/transports');


exports['locationType'] = function (test) {
    var locationType = transports.locationType;

    test.equals(locationType('http://hostname:port/path'), 'db');
    test.equals(locationType('https://hostname:port/path'), 'db');
    test.equals(locationType('http://user:pass@hostname/path'), 'db');

    test.equals(locationType('/home/user/package'), 'filesystem');
    test.equals(locationType('./package'), 'filesystem');
    test.equals(locationType('.'), 'filesystem');

    test.equals(locationType('package'), 'repository');
    test.equals(locationType('package@0.0.1'), 'repository');

    test.done();
};
