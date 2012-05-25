# `Hey`, an event driven file watcher for NodeJS with some sugar

**Warning I:** this project is in early development stage, you might not find it useful for now. It only works in Linux (2.6+) boxes (as it depends on `libnotify` to do most of the work).

Most of this lib is a wrapper around [`inotify`](https://github.com/c4milo/node-inotify) with `EventEmitter` tied on.

## Install from npm
```
$ npm install hey
```

## Usage
```javascript
var Hey = require('hey').Hey;

var watch = new Hey({
	path : '/path/to/something',
	recursive : true | false [,
	mask : Hey.FLAGS.DELETE | Hey.FLAGS... ]
});

watch.on('create', function(path, type, mask) {
	// do what you want 'cause a pirate is free ...
});

watch.on('EOB', function() {
	console.log('arrr! ya arrr spyin\' ta manee scrrrrrolls per now!');
});
```
## API

### Constructor

**`Hey`** constructor takes an object as parameter, and it contains the following keys:

* `path` : the path to watch (required, obviously);
* `recursive` : in the case the path you choose is a folder, you can choose to watch it recursively. *Optional*, default not set;
* `mask` : the mask to listen to. Ex. if you want just to watch for new files, you use only `Hey.FLAGS.CREATE` as mask. All available masks (for `Hey`, not `libnotify`) are listed in this document; *Optional*, default to `Hey.FLAGS.MODIFY | Hey.FLAGS.CREATE | Hey.FLAGS.DELETE | Hey.FLAGS.SELF_DELETE | Hey.FLAGS.MOVE | Hey.FLAGS.SELF_MOVE`;


**Warning II:** activating `recursive` in a folder, you may run out of buffer (as it supports 1024 listeners). We do not plan to change this now as it required, on Linux, changing the `ulimit fopen` size and the source code of [`inotify`](https://github.com/c4milo/node-inotify).

### Available events

The following events are available for use (but, most of them only works with folders):

* `EOB` : fired when all available listeners are taken; perhaps you're watching too many files?
* `FB` : fired when some listener becomes available; it means *Free Buffer*, not the social thing;
* `any` : fired when any path event occurs (except `EOB` and `FB`);
* `access` : fired when a file is accessed;
* `modify` : fired when a file is modified;
* `open` : fired when a file is opened;
* `close` : fired when a file is closed;
* `metadata` : fired when the path attributes are modified;
* `create` : fired when a path is created;
* `delete` : fired when a path is deleted;
* `self delete` : fired when the `path` from constructor is deleted;
* `self move` : fired when the `path` from constructor is moved;
* `move` : fired when a path is moved;
* `ignore` : fired when an event is ignored (this event could happen if you use your own `mask`);
* `unknown` : fired when an unknown event happens to a path (not really unknown, but not relevant to the moment IMHO).

### Callbacks

The callback function can receive three arguments:

* `path` : the path which triggered the event; 
* `type` : fow now, if the path is a file `Hey.FILE` or directory `Hey.DIRECTORY`;
* `mask` : the mask of the event (number).

**Warning III:** these parameters works for all events **except** for `EOB` and `FB`, which receives none.

### Mask flags

* `Hey.FLAGS.ACCESS`
* `Hey.FLAGS.MODIFY`
* `Hey.FLAGS.OPEN`
* `Hey.FLAGS.CLOSE`
* `Hey.FLAGS.METADATA`
* `Hey.FLAGS.CREATE`
* `Hey.FLAGS.DELETE`
* `Hey.FLAGS.SELF_DELETE`
* `Hey.FLAGS.SELF_MOVE`
* `Hey.FLAGS.MOVE`
* `Hey.FLAGS.IGNORE`

### Developer notes

I ran ``Hey`` in my home folder (ext4 fs) recursively, which have around 210G of data, around 41157 folders and 484730 files. When started, the CPU usage goes to ~30% (Core i7) and memory usage to ~180M. When the "first round" of processing is done (read the folder recursively), CPU usage goes to 0% and memory usage to ~80M; and I couldn't detect any leaks so far, as it's runtime was about 6 hours. Of course, more testing needs to be done, specially if the number of notifiers increase.

**Note**: using default [`inotify`](https://github.com/c4milo/node-inotify) `BUF_LEN` and `ulimit fopen` in 1024.

## Future

Our plan is to support all platforms in the future, as Node's [`fs.watch()`](http://nodejs.org/api/fs.html#fs_fs_watch_filename_options_listener) evolves (seriously, do this kind of work on what it is **now** would be insane).

## TODO

* better documentation of the source code;
* a real document page, examples, and so on;
* **tests!**
* ~~jsHint standards~~ we don't like code standards.

## License

Copyright (C) 2012 [Humantech Gestao do Conhecimento](https://www.humantech.com.br/)

Distributed under the MIT License, the same as NodeJS.

[Read this](https://github.com/humantech/hey/blob/master/LICENSE) if you're in doubt.

## References
* [inotify.7 man page](http://www.kernel.org/doc/man-pages/online/pages/man7/inotify.7.html)
* [Example usage](https://github.com/humantech/hey/blob/master/examples/directory.js)
