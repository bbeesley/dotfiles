/**
 * Interactive Linter Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


define(function(require, exports, module) {

    /**
    * BUG: jshint gives the wrong character index when dealing with tabs.
    * https://github.com/jshint/jshint/issues/430
    * I am stuck only expecting correct results when the files uses white
    * spaces. Arrrggh!
    */

    require("jshint/libs/jshint");
    var groomer = require("jshint/groomer");


    function lint( text, settings ) {
        var i, length;

        // Get document as a string to be passed into JSHint
        if ( !JSHINT(text, settings, settings.globals) ) {
            var errors = JSHINT.errors.slice(0);

            // If JSHINT.errors is false, then JSHint has some errors it needs to report
            for ( i = 0, length = errors.length; i < length; i++ ) {

                // If an error is empty, it should be the last error in the array which
                // means that the max number of errors was exceeded or there was a fatal
                // error while linting the file
                if ( errors[i] ) {
                    errors[i].token = groomer.groom(errors[i], settings);
                }
            }

            return errors;
        }
    }


    return {
        language: "javascript",
        lint: lint,

        // Default settings
        defaultSettings: {
            "undef": true,
            "unused": true,
            "curly": true,
            "indent": 4,
            "devel": true,
            "globals": { }
        },
        settingsFile: ".jshintrc"
    };
});
