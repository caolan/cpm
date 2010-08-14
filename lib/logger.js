var sys = require('sys');

// change this to alter log level
exports.level = 'info';


var wrap = function (code, reset) {
    return function (str) {
        return "\033[" + code + "m" + str + "\033[" + reset + "m";
    };
}

var bold    = exports.bold    = wrap(1, 22);
var red     = exports.red     = wrap(31, 39);
var green   = exports.green   = wrap(32, 39);
var cyan    = exports.cyan    = wrap(36, 39);
var yellow  = exports.yellow  = wrap(33, 39);
var magenta = exports.magenta = wrap(35, 39);


// used for reporting upload start and completion without newline
exports.print = function (str) {
    sys.print(str);
};


exports.log = function (label, val) {
    if (val === undefined) {
        val = label;
        label = null;
    }
    if (typeof val !== 'string') {
        val = sys.inspect(val);
    }
    label ? sys.puts(magenta(label + ' ') + val): sys.puts(val);
};

exports.warning = function (msg) {
    sys.puts( yellow( bold('Warning: ') + msg ) );
};

exports.error = function (err) {
    sys.puts(red(bold('Error: ') + (
        err.stack || err.message || err.error || err
    )));
};

exports.info = function (label, val) {
    if (exports.level === 'info' || exports.level === 'debug') {
        exports.log(label, val);
    }
};

exports.debug = function (label, val) {
    if (exports.level === 'debug') {
        if (val === undefined) {
            val = label;
            label = null;
        }
        if (typeof val !== 'string') {
            val = sys.inspect(val);
        }
        (label && val)? sys.puts(cyan(label + ' ') + val): sys.puts(label);
    }
};


// display a failure message if exit is unexpected
var clean_exit = false;

exports.end = function (msg) {
    clean_exit = true;
    sys.puts(green(bold('OK')) + (msg ? green(bold(':')) + msg: ''));
};

process.on('exit', function () {
    if (!clean_exit) {
        sys.puts(red(bold('Failed')));
    }
});

process.on('uncaughtException', function (err) {
    exports.error(err.stack || err);
});
