# CPM

A [couchapp](http://couchapp.org) management tool built with
[node.js](http://nodejs.org)

* Understands JavaScript, which allows for a more relaxed JSON interpretation.
* Object literals can replace folder strucutres where convenient.
* Can evaluate CommonJS modules and use exported functions for list, show,
  validation functions etc, __including the correct scope__.


## Relax! - its 'not quite JSON'

Properties can be added to the final design doc using a relaxed JSON format,
where properties don't need to be properly quoted, and functions are converted
to a string after loading. By writing CPM in node.js, parsing JavaScript
is made much easier, allowing for a more flexible interpretation of structure.

Let's take an example that uses the couchapp tool. It contains some views with
both map and reduce functions. With couchapp, this requires the following
directory structure:

    helloworld
      |- views
         |- view-name
            |- map.js
            |- reduce.js
         |- another-view
            |- map.js
            |- reduce.js

There is something to be said for the simplicity of this approach, but now you
have to edit 4 files should you want to update your views. I find this format
a bit unwieldy and would prefer to have a single __views.js__ containing all
of these functions. With CPM, this is possible!

    helloworld
      |- views.js

views.js:

    {
        "view-name": {
            map: function (doc) {
                ...
            },
            reduce: function () {
                ...
            }
        },
        "another-view": {
            map: function (doc) {
                ...
            },
            reduce: function () {
                ...
            }
        }
    }

Alternatively, you could have a separate file for each view. You can substitute
folders for JSON structures and vice-versa, its totally flexible:

    helloworld
      |- views
         |- view-name.js
         |- another-view.js

views/view-name.js:

    {
        map: function (doc) {
            ...
        },
        reduce: function () {
            ...
        }
    }

views/another-view.js:

    {
        map: function (doc) {
            ...
        },
        reduce: function () {
            ...
        }
    }


## CPM understands CommonJS too!

One thing I don't like about couchapp is the use of macros to include code from
other files, especially when there is a CommonJS module system supported by
CouchDB. Using "require('a')" makes more sense than: "// !code a.js"...
'Magic' comments are __really bad__.

This is why CPM supports loading apps from CommonJS modules. The module
simply has to export rewrites, show and list functions and the like, and they
can be used in the resulting design document. What's more, these functions
__operate in the scope they are defined__. The functions are not simply
converted to a string and inserted into the design document, they are executed
in the module's context!

This has potentially interesting applications for pure JavaScript frameworks
on top of CPM, allowing the generation of URLs, show and list functions
etc... using an imported framework. Think sammy.js for the server-side. Or,
how about auto-generating forms and validation rules based on JavaScript type
definitions?

### Using context in a commonjs show function:

    function greet(name) {
        return 'hello ' + name;
    }

    exports.shows = {
        example: function (doc, req) {
            return greet('world');
        }
    };

In CPM, this 'just works'.

The one caveat, is that view functions cannot be defined inside a CommonJS
module, this is because CouchDB needs to know when the views property has
changed so it can rebuild its index. This prevents us running it from the
CommonJS module.


## Installation

Clone this repository, cd to the cloned directory, then:

    make && sudo make install


## Usage

    help                                Display this help message
    push url [package]                  Upload a package to a CouchDB database
    publish package [repository]        Publish a package to a repository
    unpublish package [repository]      Unpublish a package from a repository
    list [repository]                   Lists the packages available in a repository
    info package [repository]           Show information on a package
    clone url path                      Clone a package from a CouchDB database

The repository tools are currently quite basic, and still in development.


## App Config (package.json)

The package.json file stores information about your project.
This is _real_ JSON (for now), obey the rules!

### Example

    {
        "name": "app name",       <-- the name of your app
        "version": "0.0.1",       <-- the version of your app
        "description": "testing"  <-- a description of your app
        "app": "lib/app",         <-- use the exported properties of this
                                      commonjs module for show / list functions
                                      etc. [optional]
        "paths": {                <-- paths to load data from [all optional]
            "properties": [            <-- load as properties of the design doc
                "views",               <-- ...can be folders
                "fulltext.js"          <-- ...or single files
            ],
            "modules": "lib",          <-- load commonjs modules from here
            "attachments": "static"    <-- load attachments from this dir,
                                           notice path values can be arrays
                                           or strings
        }
    }

The package.json file should be stored in the project directory and will be
automatically loaded by CPM when using this directory as a source / target.


## CPM Preferences (.cpmrc)

Your CPM preferences are stored in .cpmrc files. CPM will work without any
.cpmrc file defined, and will just use the default settings.

Settings are loaded in preference order, starting with the default settings
built into CPM, which are overridden by any settings in ~/.cpmrc, which in
turn can be overridden by a .cpmrc file in your project directory.

One useful trick when developing an app is to add a named CouchDB to a .cpmrc
file in your project:

    {
        "instances": {
            "dev": "http://localhost:5984/myapp"
        }
    }

You can now use this as a target in cpm commands:

    cpm push dev

You might want to make sure that this file is ignored by your version control
so that you don't accidentally commit your password to the repository.

The format of the rest of the .cpmrc file is currently still quite fluid, look
at the code in lib/settings.js for more information on how these settings are
defined.


## Repositories

This feature is still in development, but if you want to try it out you can
create a repository by pushing the repository couchapp in the cpm directory.
You can then use the database you pushed the app to as a repository.

If you add dependencies to your package.json, they will be loaded from the
repository defined in your CPM preferences.

__package.json__

    {
        "name": "dep_test",
        "description": "Dependency test package",
        "version": "0.1.0",
        "dependencies": {
            "dep_test_lib": [    <-- the dependencies are keyed by
                "0.0.2",             package name, and the value should
                "0.0.3"              be an array of version numbers or
            ]                        a single version number as a string
        }
    }

__.cpmrc__

    {
        "repositories": [
            "http://localhost:5984/repository"    <-- this is where you pushed the
                                                      repository app to. more
                                                      can be added here if you wish,
                                                      and dependencies will be
                                                      resolved by looking at the
                                                      first repository, then going
                                                      through the list in order,
                                                      stopping on the first match.
        ]
    }

Loaded dependencies will be uploaded as seperate design docs when pushed to a
CouchDB database, and are also available at the loading stage. This means
dependencies are available for generating exports from a commonjs module:

    var mylib = require('../dependency_name/mylib');

    exports.rewrites = mylib.generateURLs();

In this way it's possible to break-up and share common libraries between your apps,
and also load frameworks for building your app.
