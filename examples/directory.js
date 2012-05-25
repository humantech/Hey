
var Hey = require('../lib/hey').Hey;

function theType(type) {
	return type === Hey.DIRECTORY ? 'directory' : 'file';
};

var dir = new Hey({
	path : '/tmp/',
	recursive : true
});

dir.on('create', function(path, type, mask) {
	console.log(theType(type), path, 'created, mask:', mask);
});

dir.on('modify', function(path, type, mask) {
	console.log(theType(type), path, 'modified, mask:', mask);
});

dir.on('delete', function(path, type, mask) {
	console.log(theType(type), path, 'deleted, mask:', mask);
});

dir.on('self delete', function(path, type, mask) {
	console.log(theType(type), path, 'self deleted, mask:', mask);
});

dir.on('unknown', function(path, type, mask) {
	console.log(theType(type), path, 'unknown, mask:', mask);
});

dir.on('any', function() {
	console.log(arguments);
});

dir.on('EOB', function() {
	console.log('end of buffer; too many files to watch already!');
});

dir.on('FB', function() {
	console.log('free buffer, we are free to watch some files again!');
});
