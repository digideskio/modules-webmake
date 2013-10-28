# modules-webmake

_Bundle CommonJS/Node.js modules for web browsers._

__Webmake allows you to organize JavaScript code for the browser the same way as you do for Node.js.__

- Work with best dependency management system that JavaScript currently has.
- Easily, without boilerplate, reuse your modules in any environment that runs JavaScript.  
 No matter if it's a server, client (any web browser) any other custom environment as e.g. Adobe Photoshop, or let's say your dishwasher if it speaks JavaScript.
- Require __CSS__ and __HTML__ files same way. Webmake allows you to require them too, which makes it a full stack modules bundler for a web browser.

<img src="http://medyk.org/webmake.copy.png" />

Files support can be extended to any other format that compiles to one of _.js_, _.json_, _.css_ or _.html_. See __[custom extensions](#extensions)__ for more information.

For a more in depth look into JavaScript modules and the reason for _Webmake_,
see the slides from my presentation at Warsaw's MeetJS: [__JavaScript Modules Done Right__][slides]

___If you wonder how Webmake compares with other solutions, see [comparison section](#comparison-with-other-solutions)___

## How does dependency resolution work?

As it has been stated, Webmake completely follows Node.js in that

Let's say in package named _foo_ you have following individual module files:

_add.js_

```javascript
module.exports = function() {
  var sum = 0, i = 0, args = arguments, l = args.length;
  while (i < l) sum += args[i++];
  return sum;
};
```

_increment.js_

```javascript
var add = require('./add');
module.exports = function(val) {
  return add(val, 1);
};
```

_program.js_

```javascript
var inc = require('./increment');
var a = 1;
inc(a); // 2
```

Let's pack _program.js_ with all it's dependencies so it will work in browsers:

    $ webmake program.js bundle.js

The generated file _bundle.js_ now contains the following:

```javascript
(function (modules) {
  // about 60 lines of import/export path resolution logic
})({
  "foo": {
    "add.js": function (exports, module, require) {
      module.exports = function () {
        var sum = 0, i = 0, args = arguments, l = args.length;
        while (i < l) sum += args[i++];
        return sum;
      };
    },
    "increment.js": function (exports, module, require) {
      var add = require('./add');
      module.exports = function (val) {
        return add(val, 1);
      };
    },
    "program.js": function (exports, module, require) {
      var inc = require('./increment');
      var a = 1;
     inc(a); // 2
    }
  }
})("foo/program");
```

When loaded in browser, _program.js_ module is executed immediately.

### Working with HTML and CSS

Technically you can construct whole website that way:

_body.html_

```html
<h1>Hello from NodeJS module</h1>
<p><a href="https://github.com/medikoo/modules-webmake">See Webmake for more details</a></p>
```

_style.css_

```css
body { font-family: Arial, Helvetica, sans-serif; }
h1, p { margin: 20px; }
p.footer { font-size: 14px; }
```

_program.js_

```javascript
document.title = "Hello from NodeJS module";

require('./style');

document.body.innerHTML = require('./body');

var footer = document.body.appendChild(document.createElement('p'));
footer.className = 'footer';
footer.innerHTML = 'Generated by Webmake!';
```

Bundle it

    $ webmake program.js bundle.js

See it working, by including it within document as such:

```html
<!DOCTYPE html>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<body><script src="bundle.js"></script>
```

## Installation

    $ npm install -g webmake

## Usage

### From the shell:

    $ webmake [options] <input> [<output>]

__input__ - Path to the initial module that should be executed when script is loaded.  
__output__ - (optional) Filename at which browser ready bundle should be saved. If not provided generated bundle is streamed to _stdout_.

#### Options

##### name `string`

Name at which program should be exposed in your namespace. Technically just assigns exported module to global namespace.

##### amd `string`

Expose bundle as AMD module. If used together with _[name](#name-string)_ option, module will be defined with provided name.

##### include `string`

Additional module(s) that should be included but due specific reasons are
not picked by parser (can be set multiple times)

##### ext `string`

Additional extensions(s) that should be used for modules resolution from custom formats e.g. _coffee-script_ or _yaml_.  
See [extensions](#extensions) section for more info.

##### sourceMap `boolean`

Include [source maps][], for easier debugging. Source maps work very well in WebKit and Chrome's web inspector. Firefox's Firebug however has some [issues][firebug issue].

##### ignoreErrors `boolean`

Ignore not parsable require paths (e.g. `require('./lang/' + lang)`) if any.
Dynamic paths in require calls are considered a bad practice and won't be possible with upcoming _ES6 modules_ standard. Still if we deal with modules that do that, we can workaround it by turning this option on, and including missing modules with [`include`](https://github.com/medikoo/modules-webmake/edit/master/README.md#include-string) option.

##### cache `boolean` _programmatical usage only_

Cache files content and its calculated dependencies. On repeated request only modified files are re-read and parsed.  
Speeds up re-generation of Webmake bundle, useful when Webmake is bound to server process, [see below example](#development-with-webmake).  
Highly recommended if [extensions](#extensions) are used.
Defaults to _false_.

### Programmatically:

```javascript
webmake(programPath[, options][, callback]);
```

`webmake` by default returns generated source to callback, but if _output_ path is provided as one of the options, then source will be automatically saved to file

### Development with Webmake

Currently best way is to use Webmake programmatically and setup a static-file server to generate bundle on each request. Webmake is fast, so it's acceptable approach even you bundle hundreds of modules at once.

You can setup simple static server as it's shown in following example script.  
_Example also uses [node-static][] module to serve other static files (CSS, images etc.) if you don't need it, just adjust code up to your needs._

```javascript
// Dependencies:
var createServer = require('http').createServer;
var staticServer = require('node-static').Server;
var webmake      = require('webmake');

// Settings:
// Project path:
var projectPath  = '/Users/open-web-user/Projects/Awesome';
// Public folder path (statics)
var staticsPath  = projectPath + '/public';
// Path to js program file
var programPath = projectPath + '/lib/public/main.js';
// Server port:
var port = 8000;
// Url at which we want to serve generated js file
var programUrl = '/j/main.js';

// Setup statics server
staticServer = new staticServer(staticsPath);

// Initialize http server
createServer(function (req, res) {
  // Start the flow (new Stream API demands that)
  req.resume();
  // Respond to request
  req.on('end', function () {
    if (req.url === programUrl) {
      // Generate bundle with Webmake

      // Send headers
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        // Do not cache generated bundle
        'Cache-Control': 'no-cache'
      });

      var time = Date.now();
      webmake(programPath, { sourceMap: true, cache: true }, function (err, content) {
        if (err) {
          console.error("Webmake error: " + err.message);
          // Expose eventual error brutally in browser
          res.end('document.write(\'<div style="font-size: 1.6em; padding: 1em;'
            + ' text-align: left; font-weight: bold; color: red;'
            + ' position: absolute; top: 1em; left: 10%; width: 80%;'
            + ' background: white; background: rgba(255,255,255,0.9);'
            + ' border: 1px solid #ccc;"><div>Could not generate ' + programUrl
            + '</div><div style="font-size: 0.8em; padding-top: 1em">'
            + err.message.replace(/'/g, '\\\'') + '</div></div>\');');
          return;
        }

        // Send script
        console.log("Webmake OK (" + ((Date.now() - time)/1000).toFixed(3) + "s)");
        res.end(content);
      });
    } else {
      // Serve static file
      staticServer.serve(req, res);
    }
  });
}).listen(port);
console.log("Server started");
````

### Using Webmake with Express or Connect

See [webmake-middleware](https://github.com/gillesruppert/webmake-middleware) prepared by [Gilles Ruppert](http://latower.com/).

### Using Webmake with Grunt

See [grunt-webmake](https://github.com/sakatam/grunt-webmake) prepared by [Sakata Makoto](https://github.com/sakatam).

### Working with other module systems

When you work with old school scripts or framework that uses different modules system, then you'd rather just bundle needed utilities (not whole application) and expose them to global scope.

#### Webassemble -> https://github.com/kenspirit/webassemble

Webassemble written by [Ken Chen](https://github.com/kenspirit) provides a convinient way to expose different packages, written CJS style, to outer scripts. It automatically creates one entry package that does the job and is used as a starting point for a Webmake bundle.

### Extensions

#### Extensions published on NPM

##### JS
* __CoffeeScript - [webmake-coffee](https://github.com/medikoo/webmake-coffee)__

##### JSON
* __YAML - [webmake-yaml](https://github.com/medikoo/webmake-yaml)__

##### CSS
* __LESS - [webmake-less](https://github.com/acdaniel/webmake-less)__

##### HTML
* __handlebars - [webmake-handlebars](https://github.com/acdaniel/webmake-handlebars)__

__Submit any missing extension via [new issue form](https://github.com/medikoo/modules-webmake/issues/new)__.

#### Using extensions with Webmake

Install chosen extension:

_EXT should be replaced by name of available extension of your choice_.

    $ npm install webmake-EXT

If you use global installation of Webmake, then extension also needs to be installed globally:

    $ npm install -g webmake-EXT

When extension is installed, you need to ask Webmake to use it:

    $ webmake --ext=EXT program.js bundle.js

Same way if used programmatically:

```javascript
webmake(inputPath, { ext: 'EXT' }, cb);
```

Multiple extensions can be used together:

    $ webmake --ext=EXT --ext=EXT2 program.js bundle.js

Programmatically:

```javascript
webmake(inputPath, { ext: ['EXT', 'EXT2'] }, cb);
```

#### Providing extensions programmatically

Extension doesn't need to be installed as package, you may pass it programmatically:

```javascript
webmake(inputPath, { ext: {
    name: 'EXT',
    extension: 'ext',
    type: 'js',
    compile: function (source, options) { /* ... */ }
} }, cb);
```
See [writing extensions](#writing-an-extension-for-a-new-format) section to see how to configure fully working extensions

#### Writing an extension for a new format

Prepare a `webmake-*` NPM package _(replace '*' with name of your extension)_, where main module is configured as in following example:

```javascript
// Define a file extension of a new format, can be an array e.g. ['xy', 'xyz']
exports.extension = 'xyz';

// Which type is addressed by extension (can be either 'js', 'json', 'css' or 'html')
exports.type = 'js';

// Define a compile function, that for given source code, produces valid body of a JavaScript module:
exports.compile = function (source, options) {
  // Return plain object, with compiled body assigned to `code` property.
  return { code: compile(source) };

  // If compilation for some reason is asynchronous then assign promise
  // (as produced by deferred library) which resolves with expected code body
  return { code: compileAsync(source) };

  // If custom format provides a way to calculate a source map and `sourceMap` options is on
  // it's nice to generate it:
  var data, map, code;
  if (options.sourceMap) {
    data = compile(source, { sourceMap: true });

    // Include original file in the map.
    map = JSON.parse(data.sourceMap);
    map.sourcesContent = [source];
    map = JSON.stringify(map);

    code = data.code + '\n//# sourceMappingURL=data:application/json;base64,' +
      new Buffer(map).toString('base64') + '\n';

    return { code: code };
  }
};
```
#### Writing extesions for either JSON, CSS or HTML

Be sure to state the right type, and return string that reflects addressed format (not JavaScript code)
e.g. extension for CSS:

```javascript
exports.type = 'css'
exports.compile = function (source, options) {
  return { code: compileToCSS(source) }; // `compileToCSS` returns plain CSS string
};
```

Publish it and refer to [Using extensions](#Using-extensions-with-webmake) section for usage instructions.  
Finally if everything works, please let me know, so I can update this document with link to your extension.

## Comparison with other solutions

### AMD

AMD is different format, and although most popular loader for AMD is named [RequireJS](http://requirejs.org/) it works very differently from _require_ as introduced earlier with CommonJS (one that Webmake handles).

Main idea behind AMD is that dependencies are resolved asynchronously (in contrary to synchronous resolution in case of CommonJS format). Sounds promising, but does it really make things better? Cause of waterfall nature of resolution and large number of HTTP requests not necessary. See [benchmark](https://github.com/medikoo/cjs-vs-amd-benchmark#compare-load-times-of-two-module-systems) that compares resolution speed of both formats when used in development mode.

Agreed advantage of AMD that attributes to its success is that in it's direct form works in a browser (it doesn't require any server setup), that is hard to achieve with CJS style (but [not impossible](https://github.com/creationix/chrome-app-module-loader)). Still due to large number of requests such approach is usually not suitable for production and it appears it's also [not that performant in development mode](https://github.com/medikoo/cjs-vs-amd-benchmark#compare-load-times-of-two-module-systems).

Quirks of AMD style is that it requires you to wrap all your modules with function wrappers, its modules are not runnable in direct form in Node.js and dependency resolution rules are basic and limited if you compare it with design of node.js + npm ecosystem.

### Browserify and other CJS bundlers

[Browserify](http://browserify.org/) is most popular CJS bundler, and shares very similar idea. The subtle difference is that Browserify is about porting code as written for node.js to web browser, so apart of resolving dependencies and bundling the code it struggles to bring what is needed and possible from Node.js API to the browser.

Webmake cares only about bringing node.js modules format to other environments. Conceptually it's addition to ECMAScript and not port of node.js to browser. It makes node.js modules format runnable in any environment that speaks at least ECMAScript 3. You can bundle with Webmake for Browser, TV, Adobe Photoshop or maybe a modern dishwasher.

When comparing with other CJS bundlers, main difference would be that Webmake completely follows resolution logic as it works in node.js. It resolves both packages and modules exactly as node.js, and it doesn't introduce any different ways to do that. Thanks to that, you can be sure that your modules are runnable in it's direct form both on server and client-side.

Other important difference is that Webmake doesn't do full AST scan to parse require's out of modules, it relies on [find-requires](https://github.com/medikoo/find-requires#find-requires--find-all-require-calls) module, which does only what's necessary to resolve dependencies list, and that makes it a noticeably faster solution.

### ES6 modules

Soon to be released, native JavaScript modules spec shares the main concept with CommmonJS. Thanks to that eventual transition will be easy and can be fully automated. First [transpilers](http://square.github.io/es6-module-transpiler/) are already here.

As soon as the standard will be finalized, implemented in first engines and possibly adapted by node.js Webmake will support it natively as well, then in a same way it will bundle it either for the sake of a bundle or for any ECMAScript 3+ environment that won't take it in natural way.

## Current limitations of Webmake

The application calculates dependencies via static analysis of source code
(with the help of the [find-requires][] module). So in some edge cases
not all require calls can be found. You can workaround that with help
of [`include` option](#include-stringarray)

Only relative paths and outer packages paths are supported, following will work:

```javascript
require('./module-in-same-folder');
require('./module/path/deeper');
require('./some/very/very/very/long' +
'/module/path');
require('../../module-path-up'); // unless it doesn't go out of package scope
require('other-package');
require('other-package/lib/some-module');
```

But this won't:

```javascript
require('/Users/foo/projects/awesome/my-module');
```

Different versions of same package will collide:  
Let's say, package A uses version 0.2 of package C and package B uses version 0.3 of the same package. If both package A and B are required, package B will most likely end up buggy. This is because webmake will only bundle the version that was called first. So in this case package B will end up with version 0.2 instead of 0.3.

## Tests [![Build Status](https://api.travis-ci.org/medikoo/modules-webmake.png?branch=master)](https://travis-ci.org/medikoo/modules-webmake)

    $ npm test

## Proud list of SPONSORS!

#### [@puzrin](https://github.com/Phoscur) (Vitaly Puzrin) member of [Nodeca](https://github.com/nodeca)
Vitaly pushed forward development of support for _JSON_ files, [extensions functionality](#extensions), along with [webmake-yaml](https://github.com/medikoo/webmake-yaml) extension. Vitaly is a member of a team that is behind [js-yaml](https://github.com/nodeca/js-yaml) JavaScript YAML parser and dumper, and powerful social platform [Nodeca](http://dev.nodeca.com/). Big Thank You Vitaly!

## Contributors

* [@Phoscur](https://github.com/Phoscur) (Justus Maier)
  * Help with source map feature
* [@jaap3](https://github.com/jaap3) (Jaap Roes)
  * Documentation quality improvements

[slides]:
  http://www.slideshare.net/medikoo/javascript-modules-done-right
  'JavaScript Modules Done Right on SlideShare'

[source maps]:
  http://pmuellr.blogspot.com/2011/11/debugging-concatenated-javascript-files.html
  'Debugging concatenated JavaScript files'

[firebug issue]:
  http://code.google.com/p/fbug/issues/detail?id=2198
  'Issue 2198:	@sourceURL doesn't work in eval() in some cases'

[find-requires]:
  https://github.com/medikoo/find-requires
  'find-requires: Find all require() calls'

[node-static]:
  https://github.com/cloudhead/node-static
  'HTTP static-file server module'
