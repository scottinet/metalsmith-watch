"use strict";

var _path = require("path");

var _chokidar = _interopRequireDefault(require("chokidar"));

var _chalk = _interopRequireDefault(require("chalk"));

var _multimatch = _interopRequireDefault(require("multimatch"));

var _unyield = _interopRequireDefault(require("unyield"));

var _metalsmithFilenames = _interopRequireDefault(require("metalsmith-filenames"));

var _livereload = _interopRequireDefault(require("./livereload"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

var jsFileRE = /\.(jsx?|es\d{0,1})$/;
var addFilenames = (0, _metalsmithFilenames.default)();

var ok = _chalk.default.green("✔︎");

var nok = _chalk.default.red("✗");

function livereloadFiles(livereload, files, options) {
  if (livereload) {
    var keys = Object.keys(files);
    var nbOfFiles = Object.keys(files).length;
    options.log("".concat(ok, " ").concat(nbOfFiles, " file").concat(nbOfFiles > 1 ? "s" : "", " reloaded"));
    livereload.changed({
      body: {
        files: keys
      }
    });
  }
}

function backupCollections(collections) {
  var collectionsBackup = {};

  if (_typeof(collections) === "object") {
    Object.keys(collections).forEach(function (key) {
      collectionsBackup[key] = _toConsumableArray(collections[key]);
    });
  }

  return collectionsBackup;
}

function updateCollections(metalsmith, collections) {
  var metadata = _objectSpread({}, metalsmith.metadata(), {
    collections: collections
  });

  Object.keys(collections).forEach(function (key) {
    metadata[key] = collections[key];
  });
  metalsmith.metadata(metadata);
}

function saveFilenameInFilesData(files) {
  addFilenames(files);
}

function removeFilesFromCollection(files, collections) {
  var filenames = Object.keys(files);
  Object.keys(collections).forEach(function (key) {
    for (var i = 0; i < collections[key].length; i++) {
      if (filenames.indexOf(collections[key][i].filename) > -1) {
        collections[key] = _toConsumableArray(collections[key].slice(0, i)).concat(_toConsumableArray(collections[key].slice(i + 1)));
        i--;
      }
    }
  });
}

function runAndUpdate(metalsmith, files, livereload, options, previousFilesMap) {
  saveFilenameInFilesData(files);
  var collections = metalsmith.metadata().collections;
  var collectionsBackup = backupCollections(collections);

  if (collections) {
    removeFilesFromCollection(files, collections);
    updateCollections(metalsmith, collections);
  }

  metalsmith.run(files, function (err, freshFiles) {
    if (err) {
      if (collections) {
        updateCollections(metalsmith, collectionsBackup);
      }

      options.log(_chalk.default.red("".concat(nok, " ").concat(err.toString())));

      if (err.codeFrame) {
        err.codeFrame.split("\n").forEach(function (line) {
          return options.log(line);
        });
      }

      return;
    }

    Object.keys(freshFiles).forEach(function (path) {
      previousFilesMap[path] = freshFiles[path];
    });
    metalsmith.write(freshFiles, function (writeErr) {
      if (writeErr) {
        throw writeErr;
      }

      livereloadFiles(livereload, freshFiles, options);
    });
  });
}

function rebuild(metalsmith, patterns, livereload, options, previousFilesMap) {
  (0, _unyield.default)(metalsmith.read())(function (err, files) {
    if (err) {
      options.log(_chalk.default.red("".concat(nok, " ").concat(err)));
      return;
    }

    var filesToUpdate = {};
    (0, _multimatch.default)(Object.keys(files), patterns).forEach(function (path) {
      return filesToUpdate[path] = files[path];
    });
    patterns.forEach(function (p) {
      if (files[p]) {
        filesToUpdate[p] = files[p];
      }
    });
    var nbOfFiles = Object.keys(filesToUpdate).length;
    options.log(_chalk.default.gray("- Updating ".concat(nbOfFiles, " file").concat(nbOfFiles > 1 ? "s" : "", "...")));
    runAndUpdate(metalsmith, filesToUpdate, livereload, options, previousFilesMap);
  });
}

function getRebuildList(metalsmith, patterns, changed) {
  var patternsToUpdate = Object.keys(patterns).filter(function (pattern) {
    return patterns[pattern].has("${self}");
  });
  var filesToUpdate = (0, _multimatch.default)(changed, patternsToUpdate).map(function (file) {
    var filepath = (0, _path.resolve)(metalsmith.path(), file);
    return (0, _path.relative)(metalsmith.source(), filepath);
  });
  var patternsToUpdatePattern = [];

  var _arr = Object.keys(patterns);

  var _loop = function _loop() {
    var pattern = _arr[_i];
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      var _loop2 = function _loop2() {
        var updatePattern = _step.value;

        if (updatePattern.includes("${dirname}")) {
          patternsToUpdatePattern.push.apply(patternsToUpdatePattern, _toConsumableArray(changed.filter(function (pathToUpdate) {
            return (0, _multimatch.default)(pathToUpdate, pattern).length > 0;
          }).map(function (pathToUpdate) {
            var absolutePath = (0, _path.dirname)((0, _path.resolve)(metalsmith.directory(), pathToUpdate)),
                relativeToSrc = (0, _path.relative)(metalsmith.source(), absolutePath);
            return (0, _path.normalize)(updatePattern.replace("${dirname}", relativeToSrc));
          })));
        } else if (updatePattern !== "${self}" && (0, _multimatch.default)(changed, pattern).length > 0) {
          patternsToUpdatePattern.push(updatePattern);
        }
      };

      for (var _iterator = patterns[pattern][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        _loop2();
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return != null) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  };

  for (var _i = 0; _i < _arr.length; _i++) {
    _loop();
  }

  return filesToUpdate.concat(patternsToUpdatePattern);
}

module.exports = function (options) {
  options = _objectSpread({}, {
    paths: "${source}/**/*",
    livereload: false,
    log: function log() {
      var _console;

      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      (_console = console).log.apply(_console, [_chalk.default.gray("[metalsmith-watch]")].concat(args));
    },
    invalidateCache: true
  }, options || {});

  if (typeof options.paths === "string") {
    options.paths = _defineProperty({}, options.paths, true);
  }

  var livereload;

  if (options.livereload) {
    livereload = (0, _livereload.default)(options.livereload, options.log);
  }

  var watched = false;

  var plugin = function metalsmithWatch(files, metalsmith, cb) {
    if (watched) {
      cb();
      return;
    }

    watched = true;
    saveFilenameInFilesData(files);
    var patterns = {};
    Object.keys(options.paths).map(function (pattern) {
      var watchPattern = pattern.replace("${source}", metalsmith.source());

      if (!(0, _path.isAbsolute)(watchPattern)) {
        watchPattern = (0, _path.resolve)(metalsmith.directory(), pattern);
      }

      var watchPatternRelative = (0, _path.relative)(metalsmith.directory(), watchPattern);
      var replacement = new Set(Array.isArray(options.paths[pattern]) ? options.paths[pattern] : [options.paths[pattern]]);

      if (replacement.has(true)) {
        replacement.delete(true);
        replacement.add("${self}");
      }

      patterns[watchPatternRelative] = replacement;
    });

    var watcher = _chokidar.default.watch(Object.keys(patterns), Object.assign({
      ignored: "".concat(metalsmith._destination, "/**/*"),
      ignoreInitials: true,
      cwd: metalsmith._directory,
      persistent: false
    }, options.chokidar));

    watcher.on("error", function (err) {
      throw err;
    });
    watcher.on("ready", function () {
      Object.keys(patterns).forEach(function (pattern) {
        options.log("".concat(ok, " Watching ").concat(_chalk.default.cyan(pattern)));
      });

      var previousFilesMap = _objectSpread({}, files);

      var updateDelay = 50;
      var updatePlanned = false;
      var pathsToUpdate = [];

      var update = function update() {
        if (options.invalidateCache && pathsToUpdate.some(function (file) {
          return file.match(jsFileRE);
        })) {
          var filesToInvalidate = Object.keys(patterns).reduce(function (acc, pattern) {
            return _toConsumableArray(acc).concat(_toConsumableArray((0, _multimatch.default)(Object.keys(require.cache), "".concat((0, _path.resolve)(metalsmith._directory), "/").concat(pattern))));
          }, []);

          if (filesToInvalidate.length) {
            options.log(_chalk.default.gray("- Deleting cache for ".concat(filesToInvalidate.length, " entries...")));
            filesToInvalidate.forEach(function (file) {
              return delete require.cache[file];
            });
            options.log("".concat(ok, " Cache deleted"));
          }
        }

        var toRebuild = getRebuildList(metalsmith, patterns, pathsToUpdate);

        if (toRebuild.length) {
          rebuild(metalsmith, toRebuild, livereload, options, previousFilesMap);
        }

        pathsToUpdate = [];
      };

      watcher.on("all", function (event, path) {
        if (event === "add" || event === "addDir" || event === "change" || event === "unlink" || event === "unlinkDir") {
          options.log("".concat(ok, " ").concat(_chalk.default.cyan(path), " ").concat(event));
        }

        if (event === "add" || event === "change") {
          pathsToUpdate.push(path);

          if (updatePlanned) {
            clearTimeout(updatePlanned);
          }

          updatePlanned = setTimeout(update, updateDelay);
        }
      });

      plugin.close = function () {
        if (_typeof(watcher) === "object") {
          watcher.close();
        }
      };
    });
    cb();
  };

  plugin.options = options;
  return plugin;
};