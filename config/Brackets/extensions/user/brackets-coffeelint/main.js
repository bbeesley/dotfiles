/*
 * The MIT License (MIT)

 * Copyright (c) 2014 Ingo Richter

 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, strict:true, undef:true, unused:true, curly:true, browser:true, indent:4, maxerr:100, plusplus:false, devel:true, nomen:false */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4 */
/*global define, brackets, $, window */

/**
 * Provides coffeelint results via the core linting extension point
 */
define(function (require, exports, module) {
    "use strict";

    var DocumentManager = brackets.getModule("document/DocumentManager"),
        ProjectManager  = brackets.getModule("project/ProjectManager"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        CodeInspection  = brackets.getModule("language/CodeInspection");


    // name of the coffeelint config
    var CONFIG_FILE_NAME = ".coffeelintrc";

    // default options for coffeelint
    var options = {};

    var coffeelint;
    require(["thirdparty/coffee-script/coffee-script"], function (coffeescript) {
        // HACK to make coffeelint happy
        if (window) {
            window.CoffeeScript = coffeescript;
        }
        
        // Monkey Patch coffeescript to make Brackets happy with the Stacktrace format
        var originalPrepareStackTrace = Error.prepareStackTrace;
        var pst = function (err, stack) {
            var st = originalPrepareStackTrace(err, stack);
            if (st.lastIndexOf("\n") === st.length - 1) {
                return st.substr(0, st.length - 1);
            }
            return st;
        };
        
        Error.prepareStackTrace = pst;

        require(["thirdparty/coffeelint/coffeelint"], function (linter) {
            coffeelint = linter;
        });
    });

    function loadCoffelintConfig() {
        var projectRootEntry = ProjectManager.getProjectRoot(),
            result = new $.Deferred();

        var file = FileSystem.getFileForPath(projectRootEntry.fullPath + CONFIG_FILE_NAME);
        file.read(function (err, content) {
            if (!err) {
                var config = {};

                try {
                    config = JSON.parse(content);
                } catch (error) {
                    console.error("Coffeelint: Error parsing " + file.fullPath + ". Details: " + error);
                    result.reject(error);
                    return;
                }
                result.resolve(config);
            } else {
                result.reject(err);
            }
        });

        return result.promise();
    }

    function _getOptions() {
        return options;
    }
    
    function tryLoadCoffelintConfig() {
        loadCoffelintConfig().done(function (cfg) {
            options = cfg;
        }).fail(function (e) {
            console.warn(e);
            options = {};
        });
    }

    /**
     * Run coffeelint on the current document. Reports results to the main UI. Displays
     * a gold star when no errors are found.
     */
    function lintOneFile(text, fullPath) {
        /* no options at the moment */
        var options = _getOptions();
        var lintResults = coffeelint.lint(text, options);
        
        if (lintResults.length) {
            var errors = lintResults.map(function (lintResult) {
                return {
                    // Coffeelint returns 1-based line/col numbers
                    pos: { line: lintResult.lineNumber - 1, ch: 1 },
                    message: lintResult.message + " " + lintResult.context,
                    type: (lintResult.level === "error" ? CodeInspection.Type.ERROR : CodeInspection.Type.WARNING)
                };
            });
            
            return { errors: errors };
        }

        return null;
    }

    // Register for coffeescript files
    CodeInspection.register("coffeescript", {
        name: "CoffeeLint",
        scanFile: lintOneFile
    });

    $(DocumentManager)
        .on("documentSaved.coffeelint documentRefreshed.coffeelint", function (event, document) {
            // if this project's .csslintrc config has been updated, reload
            if (document.file.fullPath === ProjectManager.getProjectRoot().fullPath + CONFIG_FILE_NAME) {
                tryLoadCoffelintConfig();
            }
        });

    $(ProjectManager)
        .on("projectOpen.coffeelint", function () {
            tryLoadCoffelintConfig();
        });
});

