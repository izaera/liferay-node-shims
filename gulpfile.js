'use strict';

var gulp = require('gulp');
var liferayGulpPackager = require('liferay-gulp-packager');
var fs = require('fs');
var readJsonSync = require('read-json-sync');

// List of built-in Node.js v7.10.0 modules.
//
// Get the full list from https://nodejs.org/docs/latest/api/index.html
// Or alternatively: https://github.com/sindresorhus/builtin-modules
// A good place to look for shims is:
// https://github.com/substack/node-browserify/blob/master/lib/builtins.js
var shims = {
	assert: 'assert',
	buffer: 'buffer',
	child_process: null,
	cluster: null,
	console: 'console-browserify',
	// CUSTOMIZED constants: 'constants-browserify',
	crypto: null, // has ciclic dependencies: 'crypto-browserify',
	dgram: null,
	dns: null,
	domain: 'domain-browser',
	events: 'events',
	fs: null,
	http: null, // has ciclic dependencies: 'stream-http',
	https: null, // has ciclic dependencies: 'https-browserify',
	module: null,
	net: null,
	os: 'os-browserify/browser',
	path: 'path-browserify',
	process: 'process/browser',
	punycode: 'punycode',
	querystring: 'querystring-es3',
	readline: null,
	repl: null,
	stream: null, // has ciclic dependencies: 'stream-browserify',
	string_decoder: 'string_decoder',
	timers: 'timers-browserify',
	tls: null,
	tty: 'tty-browserify',
	url: 'url',
	util: 'util/util',
	v8: null,
	vm: 'vm-browserify',
	zlib: null, // has an invalid require: 'browserify-zlib',
};

var dependencies = readJsonSync('package.json').dependencies;

// Tune module shims to avoid ciclic dependencies
var nodeModules = Object.keys(shims).map(function(module) {
	var shim = shims[module];

	if (shim == null) {
		return null;
	}

	var version = dependencies[shim];

	if (!version) {
		return null;
	}

	return [module, version];
});

liferayGulpPackager.attach(gulp, {
	// debug: true,
	flatDependencies: true,
	task: null,
	nodeModules: nodeModules,
	// Disable global shims to avoid ciclic dependencies
	nodeGlobals: {
		Buffer: null,
		clearImmediate: null,
		process: null,
		setImmediate: null,
	},
});

gulp.task('copy-shims', ['lr:all'], function() {
	return gulp
		.src('src/main/shims/**/*')
		.pipe(gulp.dest('build/resources/main/META-INF/resources/node_modules'));
});

gulp.task('default', ['copy-shims']);

// Task create-shims is a helper to generate all shims at once.
// WARNING: It overwrites files in src/main/shims directory!!!
gulp.task('create-shims', function() {
	Object.keys(shims).forEach(function(shim) {
		var name = 'liferay-node-' + shim;
		var id = name + '@1.0.0';
		var dir = 'src/main/shims/' + id;
		var requireModule = shims[shim];

		var pkgJson = {
			name: name,
			version: '1.0.0',
			description: 'Liferay Node.js shim for ' + shim + ' package',
			main: 'index.js',
			dependencies: {},
		};
		var indexJs = '';

		if (requireModule == null) {
			indexJs += "Liferay.Loader.define('" + id + "/index', ";
			indexJs += "['module'], ";
			indexJs += 'function(module) {\n';
			indexJs += '\n';
			indexJs +=
				"module.exports = 'NO SHIM AVAILABLE FOR NODE MODULE " +
				shim +
				" :-(';\n";
			indexJs += '\n';
			indexJs += '});';
		} else {
			var requirePkg = requireModule;
			var i = requireModule.indexOf('/');

			if (i != -1) {
				requirePkg = requireModule.substring(0, i);
			}

			pkgJson.dependencies[requirePkg] = dependencies[requirePkg];

			indexJs += "Liferay.Loader.define('" + id + "/index', ";
			indexJs += "['module', '" + requireModule + "'], ";
			indexJs += 'function(module, shim) {\n';
			indexJs += '\n';
			indexJs += 'module.exports = shim;\n';
			indexJs += '\n';
			indexJs += '});';
		}

		try {
			fs.mkdirSync(dir);
		} catch (err) {}
		fs.writeFileSync(dir + '/package.json', JSON.stringify(pkgJson, null, 2));
		fs.writeFileSync(dir + '/index.js', indexJs);
	});
});
