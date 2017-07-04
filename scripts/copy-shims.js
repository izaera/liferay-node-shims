#!/usr/bin/env node

var mkdirp = require('mkdirp');
var ncp = require('ncp').ncp;

mkdirp.sync('build/resources/main/META-INF/resources/node_modules');

ncp(
	'src/main/shims',
	'build/resources/main/META-INF/resources/node_modules',
	handleFailure
);

function handleFailure(err) {
	if (err) {
		console.error(err);
		process.exit(1);
	}
}
