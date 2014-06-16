define(function (require, exports, module) {
  'use strict';
  
  var LanguageManager = brackets.getModule("language/LanguageManager");

  LanguageManager.defineLanguage("r", {
      name: "R",
      mode: "r",
      fileExtensions: ["R"],
      lineComment: ["#"]
  });
});