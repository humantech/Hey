(function(exports) {

	if (process.platform !== 'linux') {
		throw "this module runs on linux only as it depends on libinotify";
	};
	
	var Inotify = require('inotify').Inotify,
		fs = require('fs'),
		path = require('path'),
		EventEmitter = require('events').EventEmitter,
		inotify = new Inotify();

	// class for watching a path with custom events and options
	var Hey = function Hey(options) {

		// force the use of new
		if (this.constructor !== Hey) {
			throw "Hey must be instantiated with \"new\"!";
		}

		// we need some options, don't we?
		if (!options || !options.path) {
			throw "Option object must be set with a valid path to watch.";
		}

		// start EventEmitter
		EventEmitter.call(this);

		// folders and descriptors, just in case
		this.__paths = [];
		this.__descriptors = [];

		// helpful boolean
		this.__end_of_buffer = false;

		// some filepath properties
		this.__isDirectory = false;
		this.__isFile = false;

		Object.defineProperty(this, "isDirectory", {
			enumerable: true,
			get: function () {
				return this.__isDirectory;
			}
		 });

		Object.defineProperty(this, "isFile", {
			enumerable: true,
			get: function () {
				return this.__isFile;
			}
		 });

		// define options as "property"
		this.__options = options;

		Object.defineProperty(this, "options", {
			enumerable: true,
			get: function () {
				return this.__options;
			}
		 });

		// default mask
		Object.defineProperty(this, "defaultMask", {
			enumerable: true,
			get: function () {
				return Hey.FLAGS.MODIFY | Hey.FLAGS.CREATE | Hey.FLAGS.DELETE
					| Hey.FLAGS.SELF_DELETE | Hey.FLAGS.MOVE
					| Hey.FLAGS.SELF_MOVE;
			}
		});

		this.initialize();
	};

	// complete EventEmitter usage
	Hey.super_ = EventEmitter;
	Hey.prototype = Object.create(EventEmitter.prototype, {
		constructor : {
			value : Hey,
			enumerable : false
		}
	});
	
	// initialize
	Hey.prototype.initialize = function() {

		var sPath = this.options.path;
		var self = this;

		fs.stat(sPath, function(err, stats) {
			if (err) {
				throw "The given path is not valid. " + err;
			}
			if ((self.__isDirectory = stats.isDirectory()) ||
				(self.__isFile = stats.isFile())) {
				self.__startWatch(sPath);
			} else {
				// TODO: log
			}
		});
	};

	// disable this watcher
	Hey.prototype.unwatch = function() {
		for (var sPath in this.__paths) {
			this.__deleteDescriptor(sPath);
		}
	};

	// starts watching files and folders
	Hey.prototype.__startWatch = function(sPath, rmSelf) {
		// at this point, we know if it's a directory or a file
		var mask = this.options.mask || this.defaultMask;
		var watch = inotify.addWatch({
			path : sPath,
			callback : this.__cb(sPath),
			watch_for : rmSelf ? mask - Hey.FLAGS.SELF_DELETE : mask
		});
		if (watch < 0) {
			if (!this.__end_of_buffer) {
				this.__end_of_buffer = true;
				this.emit('EOB');
			}
			return;
		} else {
			if (this.__end_of_buffer) {
				this.__end_of_buffer = false;
				this.emit('FB'); // free buffer, NOT the social thing
			}
		}
		if ((this.isDirectory || rmSelf) && this.options.recursive) {
			// scan for directories if recursive option is set
			var self = this;
			fs.readdir(sPath, function(err, files) {
				if (!err && files.indexOf) {
					files.forEach(function(file) {
						var childPath = path.join(sPath, file);
						fs.stat(childPath, function(err, stats) {
							if (err) {
								// TODO: log
								return;
							} else {
								if (stats.isDirectory()) {
									self.__startWatch(childPath, true);
								}
							}
						});
					});
				}
			});
			this.__paths.push(sPath);
			this.__descriptors.push(watch);
		}
	};

	// find descriptor
	Hey.prototype.__findDescriptor = function(sPath) {
		return this.__paths.indexOf(sPath);
	};

	// deletes the descriptor (or do nothing, strange behaviours)
	Hey.prototype.__deleteDescriptor = function(sPath) {
		var idx = this.__paths.indexOf(sPath);
		delete this.__paths[idx];
		try {
			inotify.removeWatch(this.__descriptors[idx])
		} catch (e) {
			// TODO log
		}
	};

	// callback
	Hey.prototype.__cb = function(sPath) {
		var self = this;
		return function(event) {
			var mask = event.mask;
			var eventPath = path.join(sPath, event.name);

			if (mask & Inotify.IN_CREATE) {
				if ((mask & Inotify.IN_ISDIR) && self.options.recursive) {
					self.__startWatch(eventPath, true);
				}
			}
			
			// a little cleaning ...
			if ((mask & Inotify.IN_DELETE) && self.__findDescriptor(eventPath)) {
				self.__deleteDescriptor(eventPath);
			}

			// and what's its type?
			var type = mask & Inotify.IN_ISDIR ? Hey.DIRECTORY : Hey.FILE;

			// on any event, here we go ...
			self.emit('any', eventPath, type, event);

			// tie more likely fs events to callbacks, the *if mayhem*
			if (mask & Inotify.IN_ACCESS) {
				self.emit('access', eventPath, type, event.mask);
			} else if (mask & Inotify.IN_MODIFY) {
				self.emit('modify', eventPath, type, event.mask);
			} else if (mask & Inotify.IN_OPEN) {
				self.emit('open', eventPath, type, event.mask);
			} else if (mask & Inotify.IN_CLOSE) {
				self.emit('close', eventPath, type, event.mask);
			} else if (mask & Inotify.IN_ATTRIB) {
				self.emit('metadata', eventPath, type, event.mask);
			} else if (mask & Inotify.IN_CREATE) {
				self.emit('create', eventPath, type, event.mask);
			} else if (mask & Inotify.IN_DELETE) {
				self.emit('delete', eventPath, type, event.mask);
			} else if (mask & Inotify.IN_DELETE_SELF) {
				self.emit('self delete', eventPath, type, event.mask);
				self.unwatch();
			} else if (mask & Inotify.IN_MOVE_SELF) {
				self.emit('self move', eventPath, type, event.mask);
			} else if (mask & Inotify.IN_MOVE) {
				self.emit('move', eventPath, type, event.mask);
			} else if (mask & Inotify.IN_IGNORED) {
				self.emit('ignore', eventPath, type, event.mask);
			} else {
				self.emit('unknown', eventPath, type, event.mask);
			}
		};
	};

	// constants - I plan to add more later ...
	Hey.FILE = 1;
	Hey.DIRECTORY = 2;

	// flags from Inotify
	Hey.FLAGS = {
		ACCESS : Inotify.IN_ACCESS,
		MODIFY : Inotify.IN_MODIFY,
		OPEN : Inotify.IN_OPEN,
		CLOSE : Inotify.IN_CLOSE,
		METADATA : Inotify.IN_ATTRIB,
		CREATE : Inotify.IN_CREATE,
		DELETE : Inotify.IN_DELETE,
		SELF_DELETE : Inotify.IN_DELETE_SELF,
		SELF_MOVE : Inotify.IN_MOVE_SELF,
		MOVE : Inotify.IN_MOVE,
		IGNORE : Inotify.IN_IGNORED
	};

	// Export the class
	exports.Hey = Hey;

}(this));
