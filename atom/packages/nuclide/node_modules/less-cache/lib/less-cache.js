(function() {
  var LessCache, _, basename, cacheVersion, crypto, dirname, extname, fs, join, less, lessFs, ref, relative, walkdir,
    slice = [].slice;

  crypto = require('crypto');

  ref = require('path'), basename = ref.basename, dirname = ref.dirname, extname = ref.extname, join = ref.join, relative = ref.relative;

  _ = require('underscore-plus');

  fs = require('fs-plus');

  less = null;

  lessFs = null;

  walkdir = require('walkdir').sync;

  cacheVersion = 1;

  module.exports = LessCache = (function() {
    LessCache.digestForContent = function(content) {
      return crypto.createHash('SHA1').update(content, 'utf8').digest('hex');
    };

    function LessCache(params) {
      if (params == null) {
        params = {};
      }
      this.cacheDir = params.cacheDir, this.importPaths = params.importPaths, this.resourcePath = params.resourcePath, this.fallbackDir = params.fallbackDir, this.syncCaches = params.syncCaches, this.lessSourcesByRelativeFilePath = params.lessSourcesByRelativeFilePath, this.importedFilePathsByRelativeImportPath = params.importedFilePathsByRelativeImportPath;
      if (this.lessSourcesByRelativeFilePath == null) {
        this.lessSourcesByRelativeFilePath = {};
      }
      if (this.importedFilePathsByRelativeImportPath == null) {
        this.importedFilePathsByRelativeImportPath = {};
      }
      this.importsCacheDir = this.cacheDirectoryForImports(this.importPaths);
      if (this.fallbackDir) {
        this.importsFallbackDir = join(this.fallbackDir, basename(this.importsCacheDir));
      }
      try {
        this.importedFiles = this.readJson(join(this.importsCacheDir, 'imports.json')).importedFiles;
      } catch (undefined) {}
      this.setImportPaths(this.importPaths);
      this.stats = {
        hits: 0,
        misses: 0
      };
    }

    LessCache.prototype.cacheDirectoryForImports = function(importPaths) {
      if (importPaths == null) {
        importPaths = [];
      }
      if (this.resourcePath) {
        importPaths = importPaths.map((function(_this) {
          return function(importPath) {
            return _this.relativize(_this.resourcePath, importPath);
          };
        })(this));
      }
      return join(this.cacheDir, LessCache.digestForContent(importPaths.join('\n')));
    };

    LessCache.prototype.getDirectory = function() {
      return this.cacheDir;
    };

    LessCache.prototype.getImportPaths = function() {
      return _.clone(this.importPaths);
    };

    LessCache.prototype.getImportedFiles = function(importPaths) {
      var absoluteImportPath, error, error1, i, importPath, importedFilePaths, importedFiles, len;
      importedFiles = [];
      for (i = 0, len = importPaths.length; i < len; i++) {
        absoluteImportPath = importPaths[i];
        importPath = null;
        if (this.resourcePath != null) {
          importPath = this.relativize(this.resourcePath, absoluteImportPath);
        } else {
          importPath = absoluteImportPath;
        }
        importedFilePaths = this.importedFilePathsByRelativeImportPath[importPath];
        if (importedFilePaths != null) {
          importedFiles = importedFiles.concat(importedFilePaths);
        } else {
          try {
            walkdir(absoluteImportPath, {
              no_return: true
            }, (function(_this) {
              return function(filePath, stat) {
                if (!stat.isFile()) {
                  return;
                }
                if (_this.resourcePath != null) {
                  return importedFiles.push(_this.relativize(_this.resourcePath, filePath));
                } else {
                  return importedFiles.push(filePath);
                }
              };
            })(this));
          } catch (error1) {
            error = error1;
            continue;
          }
        }
      }
      return importedFiles;
    };

    LessCache.prototype.setImportPaths = function(importPaths) {
      var error, error1, filesChanged, importedFiles, pathsChanged;
      if (importPaths == null) {
        importPaths = [];
      }
      importedFiles = this.getImportedFiles(importPaths);
      pathsChanged = !_.isEqual(this.importPaths, importPaths);
      filesChanged = !_.isEqual(this.importedFiles, importedFiles);
      if (pathsChanged) {
        this.importsCacheDir = this.cacheDirectoryForImports(importPaths);
        if (this.fallbackDir) {
          this.importsFallbackDir = join(this.fallbackDir, basename(this.importsCacheDir));
        }
      } else if (filesChanged) {
        try {
          fs.removeSync(this.importsCacheDir);
        } catch (error1) {
          error = error1;
          if ((error != null ? error.code : void 0) === 'ENOENT') {
            try {
              fs.removeSync(this.importsCacheDir);
            } catch (undefined) {}
          }
        }
      }
      this.writeJson(join(this.importsCacheDir, 'imports.json'), {
        importedFiles: importedFiles
      });
      this.importedFiles = importedFiles;
      return this.importPaths = importPaths;
    };

    LessCache.prototype.observeImportedFilePaths = function(callback) {
      var importedPaths, originalFsReadFileSync;
      importedPaths = [];
      if (lessFs == null) {
        lessFs = require('less/lib/less-node/fs.js');
      }
      originalFsReadFileSync = lessFs.readFileSync;
      lessFs.readFileSync = (function(_this) {
        return function() {
          var args, content, digest, filePath, lessSource, relativeFilePath;
          filePath = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
          if (_this.resourcePath) {
            relativeFilePath = _this.relativize(_this.resourcePath, filePath);
          }
          lessSource = _this.lessSourcesByRelativeFilePath[relativeFilePath];
          content = null;
          digest = null;
          if (lessSource != null) {
            content = lessSource.content;
            digest = lessSource.digest;
          } else {
            content = originalFsReadFileSync.apply(null, [filePath].concat(slice.call(args)));
            digest = LessCache.digestForContent(content);
          }
          importedPaths.push({
            path: relativeFilePath != null ? relativeFilePath : filePath,
            digest: digest
          });
          return content;
        };
      })(this);
      try {
        callback();
      } finally {
        lessFs.readFileSync = originalFsReadFileSync;
      }
      return importedPaths;
    };

    LessCache.prototype.readJson = function(filePath) {
      return JSON.parse(fs.readFileSync(filePath));
    };

    LessCache.prototype.writeJson = function(filePath, object) {
      return fs.writeFileSync(filePath, JSON.stringify(object));
    };

    LessCache.prototype.digestForPath = function(relativeFilePath) {
      var absoluteFilePath, lessSource;
      lessSource = this.lessSourcesByRelativeFilePath[relativeFilePath];
      if (lessSource != null) {
        return lessSource.digest;
      } else {
        absoluteFilePath = null;
        if (this.resourcePath && !fs.isAbsolute(relativeFilePath)) {
          absoluteFilePath = join(this.resourcePath, relativeFilePath);
        } else {
          absoluteFilePath = relativeFilePath;
        }
        return LessCache.digestForContent(fs.readFileSync(absoluteFilePath));
      }
    };

    LessCache.prototype.relativize = function(from, to) {
      var relativePath;
      relativePath = relative(from, to);
      if (relativePath.indexOf('..') === 0) {
        return to;
      } else {
        return relativePath;
      }
    };

    LessCache.prototype.getCachePath = function(directory, filePath) {
      var cacheFile, directoryPath;
      cacheFile = (basename(filePath, extname(filePath))) + ".json";
      directoryPath = dirname(filePath);
      if (this.resourcePath) {
        directoryPath = this.relativize(this.resourcePath, directoryPath);
      }
      if (directoryPath) {
        directoryPath = LessCache.digestForContent(directoryPath);
      }
      return join(directory, 'content', directoryPath, cacheFile);
    };

    LessCache.prototype.getCachedCss = function(filePath, digest) {
      var cacheEntry, error, error1, error2, fallbackDirUsed, i, len, path, ref1, ref2;
      try {
        cacheEntry = this.readJson(this.getCachePath(this.importsCacheDir, filePath));
      } catch (error1) {
        error = error1;
        if (this.importsFallbackDir != null) {
          try {
            cacheEntry = this.readJson(this.getCachePath(this.importsFallbackDir, filePath));
            fallbackDirUsed = true;
          } catch (undefined) {}
        }
      }
      if (digest !== (cacheEntry != null ? cacheEntry.digest : void 0)) {
        return;
      }
      ref1 = cacheEntry.imports;
      for (i = 0, len = ref1.length; i < len; i++) {
        ref2 = ref1[i], path = ref2.path, digest = ref2.digest;
        try {
          if (this.digestForPath(path) !== digest) {
            return;
          }
        } catch (error2) {
          error = error2;
          return;
        }
      }
      if (this.syncCaches) {
        if (fallbackDirUsed) {
          this.writeJson(this.getCachePath(this.importsCacheDir, filePath), cacheEntry);
        } else if (this.importsFallbackDir != null) {
          this.writeJson(this.getCachePath(this.importsFallbackDir, filePath), cacheEntry);
        }
      }
      return cacheEntry.css;
    };

    LessCache.prototype.putCachedCss = function(filePath, digest, css, imports) {
      var cacheEntry;
      cacheEntry = {
        digest: digest,
        css: css,
        imports: imports,
        version: cacheVersion
      };
      this.writeJson(this.getCachePath(this.importsCacheDir, filePath), cacheEntry);
      if (this.syncCaches && (this.importsFallbackDir != null)) {
        return this.writeJson(this.getCachePath(this.importsFallbackDir, filePath), cacheEntry);
      }
    };

    LessCache.prototype.parseLess = function(filePath, contents) {
      var css, imports, options;
      css = null;
      options = {
        filename: filePath,
        syncImport: true,
        paths: this.importPaths
      };
      if (less == null) {
        less = require('less');
      }
      imports = this.observeImportedFilePaths(function() {
        return less.render(contents, options, function(error, result) {
          if (error != null) {
            throw error;
          } else {
            return css = result.css, result;
          }
        });
      });
      return {
        imports: imports,
        css: css
      };
    };

    LessCache.prototype.readFileSync = function(absoluteFilePath) {
      var lessSource, relativeFilePath;
      lessSource = null;
      if (this.resourcePath && fs.isAbsolute(absoluteFilePath)) {
        relativeFilePath = this.relativize(this.resourcePath, absoluteFilePath);
        lessSource = this.lessSourcesByRelativeFilePath[relativeFilePath];
      }
      if (lessSource != null) {
        return this.cssForFile(absoluteFilePath, lessSource.content, lessSource.digest);
      } else {
        return this.cssForFile(absoluteFilePath, fs.readFileSync(absoluteFilePath, 'utf8'));
      }
    };

    LessCache.prototype.cssForFile = function(filePath, lessContent, digest) {
      var css, imports, ref1;
      if (digest == null) {
        digest = LessCache.digestForContent(lessContent);
      }
      css = this.getCachedCss(filePath, digest);
      if (css != null) {
        this.stats.hits++;
        return css;
      }
      this.stats.misses++;
      ref1 = this.parseLess(filePath, lessContent), imports = ref1.imports, css = ref1.css;
      this.putCachedCss(filePath, digest, css, imports);
      return css;
    };

    return LessCache;

  })();

}).call(this);
