define(function (require, exports, module) {
  "use strict";

  CodeMirror.defineMode('jade', function (config) {
    'use strict';
  
    if (false && !CodeMirror.StringStream.prototype.hideFirstChars) {
      var SS = CodeMirror.StringStream.prototype;
      var countColumn = CodeMirror.countColumn;
      SS.sol = function () {
        this.lineStart = this.lineStart || 0;
        return this.pos == this.lineStart;
      };
      SS.column = function () {
        this.lineStart = this.lineStart || 0;
        if (this.lastColumnPos < this.start) {
          this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
          this.lastColumnPos = this.start;
        }
        return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
      };
      SS.indentation = function () {
        this.lineStart = this.lineStart || 0;
        return countColumn(this.string, null, this.tabSize) -
          (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
      };
      SS.hideFirstChars = function (n, inner) {
        this.lineStart = this.lineStart || 0;
        this.lineStart += n;
        try { return inner(); }
        finally { this.lineStart -= n; }
      }
    }
  
    // token types
    var KEYWORD = 'keyword';
    var DOCTYPE = 'meta';
    var ID = 'builtin';
    var CLASS = 'qualifier';
  
    var ATTRS_NEST = {
      '{': '}',
      '(': ')',
      '[': ']'
    };
  
    var jsMode = CodeMirror.getMode(config, 'javascript');
    // So the dependency can be detected
    CodeMirror.getMode(config, 'css');
  
    function State() {
      this.javaScriptLine = false;
      this.javaScriptLineExcludesColon = false;
  
      this.javaScriptArguments = false;
      this.javaScriptArgumentsDepth = 0;
  
      this.isInterpolating = false;
      this.interpolationNesting = 0;
  
      this.jsState = jsMode.startState();
  
      this.restOfLine = '';
  
      this.isIncludeFiltered = false;
      this.isEach = false;
  
      this.lastTag = '';
      this.scriptType = '';
  
      // Attributes Mode
      this.isAttrs = false;
      this.attrsNest = [];
      this.inAttributeName = true;
      this.attributeIsType = false;
      this.attrValue = '';
  
      // Indented Mode
      this.indentOf = Infinity;
      this.indentToken = '';
  
      this.innerMode = null;
      this.innerState = null;
  
      this.innerModeForLine = false;
    }
    /**
     * Safely copy a state
     *
     * @return {State}
     */
    State.prototype.copy = function () {
      var res = new State();
      res.javaScriptLine = this.javaScriptLine;
      res.javaScriptLineExcludesColon = this.javaScriptLineExcludesColon;
      res.javaScriptArguments = this.javaScriptArguments;
      res.javaScriptArgumentsDepth = this.javaScriptArgumentsDepth;
      res.isInterpolating = this.isInterpolating;
      res.interpolationNesting = this.intpolationNesting;
  
      res.jsState = CodeMirror.copyState(jsMode, this.jsState);
  
      res.innerMode = this.innerMode;
      if (this.innerMode && this.innerState) {
        res.innerState = CodeMirror.copyState(this.innerMode, this.innerState);
      }
  
      res.restOfLine = this.restOfLine;
  
      res.isIncludeFiltered = this.isIncludeFiltered;
      res.isEach = this.isEach;
      res.lastTag = this.lastTag;
      res.scriptType = this.scriptType;
      res.isAttrs = this.isAttrs;
      res.attrsNest = this.attrsNest.slice();
      res.inAttributeName = this.inAttributeName;
      res.attributeIsType = this.attributeIsType;
      res.attrValue = this.attrValue;
      res.indentOf = this.indentOf;
      res.indentToken = this.indentToken;
  
      res.innerModeForLine = this.innerModeForLine;
  
      return res;
    }
  
    function javaScript(stream, state) {
      if (stream.sol()) {
        // if javaScriptLine was set at end of line, ignore it
        state.javaScriptLine = false;
        state.javaScriptLineExcludesColon = false;
      }
      if (state.javaScriptLine) {
        if (state.javaScriptLineExcludesColon && stream.peek() === ':') {
          state.javaScriptLine = false;
          state.javaScriptLineExcludesColon = false;
          return;
        }
        var tok = jsMode.token(stream, state.jsState);
        if (stream.eol()) state.javaScriptLine = false;
        return tok || true;
      }
    }
    function javaScriptArguments(stream, state) {
      if (state.javaScriptArguments) {
        if (state.javaScriptArgumentsDepth === 0 && stream.peek() !== '(') {
          state.javaScriptArguments = false;
          return;
        }
        if (stream.peek() === '(') {
          state.javaScriptArgumentsDepth++;
        } else if (stream.peek() === ')') {
          state.javaScriptArgumentsDepth--;
        }
        if (state.javaScriptArgumentsDepth === 0) {
          state.javaScriptArguments = false;
          return;
        }
  
        var tok = jsMode.token(stream, state.jsState);
        return tok || true;
      }
    }
  
    function yieldStatement(stream, state) {
      if (stream.match(/^yield\b/)) {
          return 'keyword';
      }
    }
  
    function doctype(stream, state) {
      if (stream.match(/^(?:doctype) *([^\n]+)?/)) {
          return DOCTYPE;
      }
    }
  
    function interpolation(stream, state) {
      if (stream.match('#{')) {
        state.isInterpolating = true;
        state.interpolationNesting = 0;
        return 'punctuation';
      }
    }
  
    function interpolationContinued(stream, state) {
      if (state.isInterpolating) {
        if (stream.peek() === '}') {
          state.interpolationNesting--;
          if (state.interpolationNesting < 0) {
            stream.next();
            state.isInterpolating = false;
            return 'puncutation';
          }
        } else if (stream.peek() === '{') {
          state.interpolationNesting++;
        }
        return jsMode.token(stream, state.jsState) || true;
      }
    }
  
    function caseStatement(stream, state) {
      if (stream.match(/^case\b/)) {
        state.javaScriptLine = true;
        return KEYWORD;
      }
    }
  
    function when(stream, state) {
      if (stream.match(/^when\b/)) {
        state.javaScriptLine = true;
        state.javaScriptLineExcludesColon = true;
        return KEYWORD;
      }
    }
  
    function defaultStatement(stream, state) {
      if (stream.match(/^default\b/)) {
        return KEYWORD;
      }
    }
  
    function extendsStatement(stream, state) {
      if (stream.match(/^extends?\b/)) {
        state.restOfLine = 'string';
        return KEYWORD;
      }
    }
  
    function append(stream, state) {
      if (stream.match(/^append\b/)) {
        state.restOfLine = 'variable';
        return KEYWORD;
      }
    }
    function prepend(stream, state) {
      if (stream.match(/^prepend\b/)) {
        state.restOfLine = 'variable';
        return KEYWORD;
      }
    }
    function block(stream, state) {
      if (stream.match(/^block\b *(?:(prepend|append)\b)?/)) {
        state.restOfLine = 'variable';
        return KEYWORD;
      }
    }
  
    function include(stream, state) {
      if (stream.match(/^include\b/)) {
        state.restOfLine = 'string';
        return KEYWORD;
      }
    }
  
    function includeFiltered(stream, state) {
      if (stream.match(/^include:([a-zA-Z0-9\-]+)/, false) && stream.match('include')) {
        state.isIncludeFiltered = true;
        return KEYWORD;
      }
    }
  
    function includeFilteredContinued(stream, state) {
      if (state.isIncludeFiltered) {
        var tok = filter(stream, state);
        state.isIncludeFiltered = false;
        state.restOfLine = 'string';
        return tok;
      }
    }
  
    function mixin(stream, state) {
      if (stream.match(/^mixin\b/)) {
        state.javaScriptLine = true;
        return KEYWORD;
      }
    }
  
    function call(stream, state) {
      if (stream.match(/^\+([-\w]+)/)) {
        if (!stream.match(/^\( *[-\w]+ *=/, false)) {
          state.javaScriptArguments = true;
          state.javaScriptArgumentsDepth = 0;
        }
        return 'variable';
      }
      if (stream.match(/^\+#{/, false)) {
        stream.next();
        state.mixinCallAfter = true;
        return interpolation(stream, state);
      }
    }
    function callArguments(stream, state) {
      if (state.mixinCallAfter) {
        state.mixinCallAfter = false;
        if (!stream.match(/^\( *[-\w]+ *=/, false)) {
          state.javaScriptArguments = true;
          state.javaScriptArgumentsDepth = 0;
        }
        return true;
      }
    }
  
    function conditional(stream, state) {
      if (stream.match(/^(if|unless|else if|else)\b/)) {
        state.javaScriptLine = true;
        return KEYWORD;
      }
    }
  
    function each(stream, state) {
      var captures;
      if (stream.match(/^(- *)?(each|for)\b/)) {
        state.isEach = true;
        return KEYWORD;
      }
    }
    function eachContinued(stream, state) {
      if (state.isEach) {
        if (stream.match(/^ in\b/)) {
          state.javaScriptLine = true;
          state.isEach = false;
          return KEYWORD;
        } else if (stream.sol() || stream.eol()) {
          state.isEach = false;
        } else if (stream.next()) {
          while (!stream.match(/^ in\b/, false) && stream.next());
          return 'variable';
        }
      }
    }
  
    function whileStatement(stream, state) {
      if (stream.match(/^while\b/)) {
        state.javaScriptLine = true;
        return KEYWORD;
      }
    }
  
    function tag(stream, state) {
      var captures;
      if (captures = stream.match(/^(\w(?:[-:\w]*\w)?)\/?/)) {
        state.lastTag = captures[1].toLowerCase();
        if (state.lastTag === 'script') {
          state.scriptType = 'application/javascript';
        }
        return 'tag';
      }
    }
  
    function filter(stream, state) {
      if (stream.match(/^:([\w\-]+)/)) {
        var innerMode;
        if (config && config.innerModes) {
          innerMode = config.innerModes(stream.current().substring(1));
        }
        if (!innerMode) {
          innerMode = stream.current().substring(1);
        }
        if (typeof innerMode === 'string') {
          innerMode = CodeMirror.getMode(config, innerMode);
        }
        setInnerMode(stream, state, innerMode);
        return 'atom';
      }
    }
  
    function code(stream, state) {
      if (stream.match(/^(!?=|-)/)) {
        state.javaScriptLine = true;
        return 'punctuation';
      }
    }
  
    function id(stream, state) {
      if (stream.match(/^#([\w-]+)/)) {
        return ID;
      }
    }
  
    function className(stream, state) {
      if (stream.match(/^\.([\w-]+)/)) {
        return CLASS;
      }
    }
  
    function attrs(stream, state) {
      if (stream.peek() == '(') {
        stream.next();
        state.isAttrs = true;
        state.attrsNest = [];
        state.inAttributeName = true;
        state.attrValue = '';
        state.attributeIsType = false;
        return 'punctuation';
      }
    }
  
    function attrsContinued(stream, state) {
      if (state.isAttrs) {
        if (ATTRS_NEST[stream.peek()]) {
          state.attrsNest.push(ATTRS_NEST[stream.peek()]);
        }
        if (state.attrsNest[state.attrsNest.length - 1] === stream.peek()) {
          state.attrsNest.pop();
        } else  if (stream.eat(')')) {
          state.isAttrs = false;
          return 'punctuation';
        }
        if (state.inAttributeName && stream.match(/^[^=,\)!]+/)) {
          if (stream.peek() === '=' || stream.peek() === '!') {
            state.inAttributeName = false;
            state.jsState = jsMode.startState();
            if (state.lastTag === 'script' && stream.current().trim().toLowerCase() === 'type') {
              state.attributeIsType = true;
            } else {
              state.attributeIsType = false;
            }
          }
          return 'attribute';
        }
  
        var tok = jsMode.token(stream, state.jsState);
        if (state.attributeIsType && tok === 'string') {
          state.scriptType = stream.current().toString();
        }
        if (state.attrsNest.length === 0 && (tok === 'string' || tok === 'variable' || tok === 'keyword')) {
          try {
            Function('', 'var x ' + state.attrValue.replace(/,\s*$/, '').replace(/^!/, ''));
            state.inAttributeName = true;
            state.attrValue = '';
            stream.backUp(stream.current().length);
            return attrsContinued(stream, state);
          } catch (ex) {
            //not the end of an attribute
          }
        }
        state.attrValue += stream.current();
        return tok || true;
      }
    }
  
    function attributesBlock(stream, state) {
      if (stream.match(/^&attributes\b/)) {
        state.javaScriptArguments = true;
        state.javaScriptArgumentsDepth = 0;
        return 'keyword';
      }
    }
  
    function indent(stream, state) {
      if (stream.sol() && stream.eatSpace()) {
        return 'indent';
      }
    }
  
    function comment(stream, state) {
      if (stream.match(/^ *\/\/(-)?([^\n]*)/)) {
        state.indentOf = stream.indentation();
        state.indentToken = 'comment';
        return 'comment';
      }
    }
  
    function colon(stream, state) {
      if (stream.match(/^: */)) {
        return 'colon';
      }
    }
  
    function text(stream, state) {
      if (stream.match(/^(?:\| ?| )([^\n]+)/)) {
        return 'string';
      }
      if (stream.match(/^(<[^\n]*)/, false)) {
        // html string
        setInnerMode(stream, state, 'htmlmixed');
        state.innerModeForLine = true;
        return innerMode(stream, state, true);
      }
    }
  
    function dot(stream, state) {
      if (stream.eat('.')) {
        var innerMode = null;
        if (state.lastTag === 'script' && state.scriptType.toLowerCase().indexOf('javascript') != -1) {
          innerMode = state.scriptType.toLowerCase().replace(/"|'/g, '');
        } else if (state.lastTag === 'style') {
          innerMode = 'css';
        }
        setInnerMode(stream, state, innerMode);
        return 'dot';
      }
    }
  
    function fail(stream, state) {
      stream.next();
      return null;
    }
  
  
    function setInnerMode(stream, state, mode) {
      mode = CodeMirror.mimeModes[mode] || mode;
      mode = config.innerModes ? config.innerModes(mode) || mode : mode;
      mode = CodeMirror.mimeModes[mode] || mode;
      mode = CodeMirror.getMode(config, mode);
      state.indentOf = stream.indentation();
  
      if (mode && mode.name !== 'null') {
        state.innerMode = mode;
      } else {
        state.indentToken = 'string';
      }
    }
    function innerMode(stream, state, force) {
      if (stream.indentation() > state.indentOf || (state.innerModeForLine && !stream.sol()) || force) {
        if (state.innerMode) {
          if (!state.innerState) {
            state.innerState = state.innerMode.startState ? state.innerMode.startState(stream.indentation()) : {};
          }
          return stream.hideFirstChars(state.indentOf + 2, function () {
            return state.innerMode.token(stream, state.innerState) || true;
          });
        } else {
          stream.skipToEnd();
          return state.indentToken;
        }
      } else if (stream.sol()) {
        state.indentOf = Infinity;
        state.indentToken = null;
        state.innerMode = null;
        state.innerState = null;
      }
    }
    function restOfLine(stream, state) {
      if (stream.sol()) {
        // if restOfLine was set at end of line, ignore it
        state.restOfLine = '';
      }
      if (state.restOfLine) {
        stream.skipToEnd();
        var tok = state.restOfLine;
        state.restOfLine = '';
        return tok;
      }
    }
  
  
    function startState() {
      return new State();
    }
    function copyState(state) {
      return state.copy();
    }
    /**
     * Get the next token in the stream
     *
     * @param {Stream} stream
     * @param {State} state
     */
    function nextToken(stream, state) {
      var tok = innerMode(stream, state)
        || restOfLine(stream, state)
        || interpolationContinued(stream, state)
        || includeFilteredContinued(stream, state)
        || eachContinued(stream, state)
        || attrsContinued(stream, state)
        || javaScript(stream, state)
        || javaScriptArguments(stream, state)
        || callArguments(stream, state)
  
        || yieldStatement(stream, state)
        || doctype(stream, state)
        || interpolation(stream, state)
        || caseStatement(stream, state)
        || when(stream, state)
        || defaultStatement(stream, state)
        || extendsStatement(stream, state)
        || append(stream, state)
        || prepend(stream, state)
        || block(stream, state)
        || include(stream, state)
        || includeFiltered(stream, state)
        || mixin(stream, state)
        || call(stream, state)
        || conditional(stream, state)
        || each(stream, state)
        || whileStatement(stream, state)
        || tag(stream, state)
        || filter(stream, state)
        || code(stream, state)
        || id(stream, state)
        || className(stream, state)
        || attrs(stream, state)
        || attributesBlock(stream, state)
        || indent(stream, state)
        || text(stream, state)
        || comment(stream, state)
        || colon(stream, state)
        || dot(stream, state)
        || fail(stream, state);
  
      return tok === true ? null : tok;
    }
    return {
      startState: startState,
      copyState: copyState,
      token: nextToken
    }
  });
  ;//Adding an overlay to the js CodeMirror mode
  
  (function (CodeMirror, getMode) {
    if (!CodeMirror.overlayMode) return;
    var jade = CodeMirror.getMode({}, 'jade');
    CodeMirror.getMode = function (options, spec) {
      var mode = getMode.apply(this, arguments);
      if (mode && mode.name === 'javascript' && !mode.hasJadeSupport) {
        //{ startState: startState, copyState: copyState, token: nextToken }
        mode = CodeMirror.overlayMode(mode, {
          startState: function () {
            return {overlay: false, jade: null};
          },
          copyState: function (s) {
            return {overlay: s.overlay, jade: s.jade ? jade.copyState(s.jade) : s.jade};
          },
          token: function(stream, state) {
            if (!state.overlay && stream.match('jade`')) {
              state.overlay = true;
              state.jade = jade.startState();
              return null;
            }
            if (state.overlay && stream.match('`')) {
              state.overlay = false;
              state.jade = null;
              return null;
            }
            if (state.overlay) {
              var token = jade.token(stream, state.jade);
              if (stream.current().indexOf('`') !== -1) {
                state.overlay = false;
                state.jade = null;
              }
              return token ? token : 'jade-default';
            } else {
              stream.skipTo('j') || stream.skipToEnd();
              if (!stream.current()) stream.next();
              return null;
            }
          }
        });
        mode.name = 'javascript';
        mode.hasJadeSupport = true;
      }
      return mode;
    };
  }(CodeMirror, CodeMirror.getMode));
  

  var LanguageManager = brackets.getModule("language/LanguageManager");
  LanguageManager.defineLanguage("jade", {"name":"Jade","mode":"jade","fileExtensions":["jade"],"lineComment":["//"]});
  var HTML_STRUCTURE_MODULE = (function () {
    var exports = {};
    var module = {exports: exports};
    (function (module, exports) {    "use strict";
      
      // This file is generated by /update-auto-complete.js
      // Do not edit it directly
      
      exports.tags = {
        "a": {
          "attributes": [
            "href",
            "hreflang",
            "media",
            "rel",
            "target",
            "type"
          ]
        },
        "abbr": {
          "attributes": []
        },
        "address": {
          "attributes": []
        },
        "area": {
          "attributes": [
            "alt",
            "coords",
            "href",
            "hreflang",
            "media",
            "rel",
            "shape",
            "target",
            "type"
          ]
        },
        "article": {
          "attributes": []
        },
        "aside": {
          "attributes": []
        },
        "audio": {
          "attributes": [
            "autoplay",
            "controls",
            "loop",
            "mediagroup",
            "muted",
            "preload",
            "src"
          ]
        },
        "b": {
          "attributes": []
        },
        "base": {
          "attributes": [
            "href",
            "target"
          ]
        },
        "bdi": {
          "attributes": []
        },
        "bdo": {
          "attributes": []
        },
        "big": {
          "attributes": []
        },
        "blockquote": {
          "attributes": [
            "cite"
          ]
        },
        "body": {
          "attributes": [
            "onafterprint",
            "onbeforeprint",
            "onbeforeunload",
            "onhashchange",
            "onmessage",
            "onoffline",
            "ononline",
            "onpagehide",
            "onpageshow",
            "onpopstate",
            "onredo",
            "onresize",
            "onstorage",
            "onundo",
            "onunload"
          ]
        },
        "br": {
          "attributes": []
        },
        "button": {
          "attributes": [
            "autofocus",
            "disabled",
            "form",
            "formaction",
            "formenctype",
            "formmethod",
            "formnovalidate",
            "formtarget",
            "name",
            "type",
            "value"
          ]
        },
        "canvas": {
          "attributes": [
            "height",
            "width"
          ]
        },
        "caption": {
          "attributes": []
        },
        "cite": {
          "attributes": []
        },
        "code": {
          "attributes": []
        },
        "col": {
          "attributes": [
            "span"
          ]
        },
        "colgroup": {
          "attributes": [
            "span"
          ]
        },
        "command": {
          "attributes": [
            "checked",
            "disabled",
            "icon",
            "label",
            "radiogroup",
            "type"
          ]
        },
        "datalist": {
          "attributes": []
        },
        "dd": {
          "attributes": []
        },
        "del": {
          "attributes": [
            "cite",
            "datetime"
          ]
        },
        "details": {
          "attributes": [
            "open"
          ]
        },
        "dfn": {
          "attributes": []
        },
        "dialog": {
          "attributes": [
            "open"
          ]
        },
        "div": {
          "attributes": []
        },
        "dl": {
          "attributes": []
        },
        "dt": {
          "attributes": []
        },
        "em": {
          "attributes": []
        },
        "embed": {
          "attributes": [
            "height",
            "src",
            "type",
            "width"
          ]
        },
        "fieldset": {
          "attributes": [
            "disabled",
            "form",
            "name"
          ]
        },
        "figcaption": {
          "attributes": []
        },
        "figure": {
          "attributes": []
        },
        "footer": {
          "attributes": []
        },
        "form": {
          "attributes": [
            "accept-charset",
            "action",
            "autocomplete",
            "enctype",
            "method",
            "name",
            "novalidate",
            "target"
          ]
        },
        "h1": {
          "attributes": []
        },
        "h2": {
          "attributes": []
        },
        "h3": {
          "attributes": []
        },
        "h4": {
          "attributes": []
        },
        "h5": {
          "attributes": []
        },
        "h6": {
          "attributes": []
        },
        "head": {
          "attributes": []
        },
        "header": {
          "attributes": []
        },
        "hgroup": {
          "attributes": []
        },
        "hr": {
          "attributes": []
        },
        "html": {
          "attributes": [
            "manifest",
            "xml:lang",
            "xmlns"
          ]
        },
        "i": {
          "attributes": []
        },
        "iframe": {
          "attributes": [
            "height",
            "name",
            "sandbox",
            "seamless",
            "src",
            "srcdoc",
            "width"
          ]
        },
        "ilayer": {
          "attributes": []
        },
        "img": {
          "attributes": [
            "alt",
            "height",
            "ismap",
            "longdesc",
            "src",
            "usemap",
            "width"
          ]
        },
        "input": {
          "attributes": [
            "accept",
            "alt",
            "autocomplete",
            "autofocus",
            "checked",
            "dirname",
            "disabled",
            "form",
            "formaction",
            "formenctype",
            "formmethod",
            "formnovalidate",
            "formtarget",
            "height",
            "list",
            "max",
            "maxlength",
            "min",
            "multiple",
            "name",
            "pattern",
            "placeholder",
            "readonly",
            "required",
            "size",
            "src",
            "step",
            "type",
            "value",
            "width"
          ]
        },
        "ins": {
          "attributes": [
            "cite",
            "datetime"
          ]
        },
        "kbd": {
          "attributes": []
        },
        "keygen": {
          "attributes": [
            "autofocus",
            "challenge",
            "disabled",
            "form",
            "keytype",
            "name"
          ]
        },
        "label": {
          "attributes": [
            "for",
            "form"
          ]
        },
        "legend": {
          "attributes": []
        },
        "li": {
          "attributes": [
            "value"
          ]
        },
        "link": {
          "attributes": [
            "disabled",
            "href",
            "hreflang",
            "media",
            "rel",
            "sizes",
            "type"
          ]
        },
        "map": {
          "attributes": [
            "name"
          ]
        },
        "mark": {
          "attributes": []
        },
        "marquee": {
          "attributes": [
            "align",
            "behavior",
            "bgcolor",
            "direction",
            "height",
            "hspace",
            "loop",
            "scrollamount",
            "scrolldelay",
            "truespeed",
            "vspace",
            "width"
          ]
        },
        "menu": {
          "attributes": [
            "label",
            "type"
          ]
        },
        "meta": {
          "attributes": [
            "charset",
            "content",
            "http-equiv",
            "name"
          ]
        },
        "meter": {
          "attributes": [
            "form",
            "high",
            "low",
            "max",
            "min",
            "optimum",
            "value"
          ]
        },
        "nav": {
          "attributes": []
        },
        "noscript": {
          "attributes": []
        },
        "object": {
          "attributes": [
            "archive",
            "codebase",
            "codetype",
            "data",
            "declare",
            "form",
            "height",
            "name",
            "standby",
            "type",
            "usemap",
            "width"
          ]
        },
        "ol": {
          "attributes": [
            "reversed",
            "start",
            "type"
          ]
        },
        "optgroup": {
          "attributes": [
            "disabled",
            "label"
          ]
        },
        "option": {
          "attributes": [
            "disabled",
            "label",
            "selected",
            "value"
          ]
        },
        "output": {
          "attributes": [
            "for",
            "form",
            "name"
          ]
        },
        "p": {
          "attributes": []
        },
        "param": {
          "attributes": [
            "name",
            "value"
          ]
        },
        "pre": {
          "attributes": []
        },
        "progress": {
          "attributes": [
            "form",
            "max",
            "value"
          ]
        },
        "q": {
          "attributes": [
            "cite"
          ]
        },
        "rp": {
          "attributes": []
        },
        "rt": {
          "attributes": []
        },
        "ruby": {
          "attributes": []
        },
        "samp": {
          "attributes": []
        },
        "script": {
          "attributes": [
            "async",
            "charset",
            "defer",
            "src",
            "type"
          ]
        },
        "section": {
          "attributes": []
        },
        "select": {
          "attributes": [
            "autofocus",
            "disabled",
            "form",
            "multiple",
            "name",
            "required",
            "size"
          ]
        },
        "small": {
          "attributes": []
        },
        "source": {
          "attributes": [
            "media",
            "src",
            "type"
          ]
        },
        "span": {
          "attributes": []
        },
        "strong": {
          "attributes": []
        },
        "style": {
          "attributes": [
            "disabled",
            "media",
            "scoped",
            "type"
          ]
        },
        "sub": {
          "attributes": []
        },
        "summary": {
          "attributes": []
        },
        "sup": {
          "attributes": []
        },
        "table": {
          "attributes": [
            "border"
          ]
        },
        "tbody": {
          "attributes": []
        },
        "td": {
          "attributes": [
            "colspan",
            "headers",
            "rowspan"
          ]
        },
        "textarea": {
          "attributes": [
            "autofocus",
            "cols",
            "dirname",
            "disabled",
            "form",
            "label",
            "maxlength",
            "name",
            "placeholder",
            "readonly",
            "required",
            "rows",
            "wrap"
          ]
        },
        "tfoot": {
          "attributes": []
        },
        "th": {
          "attributes": [
            "colspan",
            "headers",
            "rowspan",
            "scope"
          ]
        },
        "thead": {
          "attributes": []
        },
        "time": {
          "attributes": [
            "datetime",
            "pubdate"
          ]
        },
        "title": {
          "attributes": []
        },
        "tr": {
          "attributes": []
        },
        "track": {
          "attributes": [
            "default",
            "kind",
            "label",
            "src",
            "srclang"
          ]
        },
        "tt": {
          "attributes": []
        },
        "ul": {
          "attributes": []
        },
        "var": {
          "attributes": []
        },
        "video": {
          "attributes": [
            "autoplay",
            "controls",
            "height",
            "loop",
            "mediagroup",
            "muted",
            "poster",
            "preload",
            "src",
            "width"
          ]
        },
        "wbr": {
          "attributes": []
        }
      }
      
      exports.attrs = {
        "accesskey": {
          "attribOption": [],
          "global": "true"
        },
        "class": {
          "attribOption": [],
          "global": "true",
          "type": "cssStyle"
        },
        "contenteditable": {
          "attribOption": [],
          "global": "true",
          "type": "boolean"
        },
        "contextmenu": {
          "attribOption": [],
          "global": "true"
        },
        "dir": {
          "attribOption": [
            "ltr",
            "rtl"
          ],
          "global": "true"
        },
        "draggable": {
          "attribOption": [
            "auto",
            "false",
            "true"
          ],
          "global": "true"
        },
        "dropzone": {
          "attribOption": [
            "copy",
            "move",
            "link"
          ],
          "global": "true"
        },
        "hidden": {
          "attribOption": [
            "hidden"
          ],
          "global": "true"
        },
        "id": {
          "attribOption": [],
          "global": "true",
          "type": "cssId"
        },
        "lang": {
          "attribOption": [
            "ab",
            "aa",
            "af",
            "sq",
            "am",
            "ar",
            "an",
            "hy",
            "as",
            "ay",
            "az",
            "ba",
            "eu",
            "bn",
            "dz",
            "bh",
            "bi",
            "br",
            "bg",
            "my",
            "be",
            "km",
            "ca",
            "zh",
            "co",
            "hr",
            "cs",
            "da",
            "nl",
            "en",
            "eo",
            "et",
            "fo",
            "fa",
            "fi",
            "fr",
            "fy",
            "gl",
            "gd",
            "gv",
            "ka",
            "de",
            "el",
            "kl",
            "gn",
            "gu",
            "ht",
            "ha",
            "he",
            "hi",
            "hu",
            "is",
            "io",
            "id",
            "ia",
            "ie",
            "iu",
            "ik",
            "ga",
            "it",
            "ja",
            "jv",
            "kn",
            "ks",
            "kk",
            "rw",
            "ky",
            "rn",
            "ko",
            "ku",
            "lo",
            "la",
            "lv",
            "li",
            "ln",
            "lt",
            "mk",
            "mg",
            "ms",
            "ml",
            "mt",
            "mi",
            "mr",
            "mo",
            "mn",
            "na",
            "ne",
            "no",
            "oc",
            "or",
            "om",
            "ps",
            "pl",
            "pt",
            "pa",
            "qu",
            "rm",
            "ro",
            "ru",
            "sz",
            "sm",
            "sg",
            "sa",
            "sr",
            "sh",
            "st",
            "tn",
            "sn",
            "ii",
            "sd",
            "si",
            "ss",
            "sk",
            "sl",
            "so",
            "es",
            "su",
            "sw",
            "sv",
            "tl",
            "tg",
            "ta",
            "tt",
            "te",
            "th",
            "bo",
            "ti",
            "to",
            "ts",
            "tr",
            "tk",
            "tw",
            "ug",
            "uk",
            "ur",
            "uz",
            "vi",
            "vo",
            "wa",
            "cy",
            "wo",
            "xh",
            "yi",
            "yo",
            "zu"
          ],
          "global": "true"
        },
        "role": {
          "attribOption": [
            "alert",
            "alertdialog",
            "article",
            "application",
            "banner",
            "button",
            "checkbox",
            "columnheader",
            "combobox",
            "complementary",
            "contentinfo",
            "definition",
            "directory",
            "dialog",
            "document",
            "form",
            "grid",
            "gridcell",
            "group",
            "heading",
            "img",
            "link",
            "list",
            "listbox",
            "listitem",
            "log",
            "main",
            "marquee",
            "math",
            "menu",
            "menubar",
            "menuitem",
            "menuitemcheckbox",
            "menuitemradio",
            "navigation",
            "note",
            "option",
            "presentation",
            "progressbar",
            "radio",
            "radiogroup",
            "region",
            "row",
            "rowgroup",
            "rowheader",
            "scrollbar",
            "search",
            "separator",
            "slider",
            "spinbutton",
            "status",
            "tab",
            "tablist",
            "tabpanel",
            "textbox",
            "timer",
            "toolbar",
            "tooltip",
            "tree",
            "treegrid",
            "treeitem"
          ],
          "global": "true"
        },
        "spellcheck": {
          "attribOption": [],
          "global": "true",
          "type": "boolean"
        },
        "style": {
          "attribOption": [],
          "global": "true",
          "type": "style"
        },
        "tabindex": {
          "attribOption": [],
          "global": "true"
        },
        "title": {
          "attribOption": [],
          "global": "true"
        },
        "onabort": {
          "attribOption": [],
          "global": "true"
        },
        "onblur": {
          "attribOption": [],
          "global": "true"
        },
        "oncanplay": {
          "attribOption": [],
          "global": "true"
        },
        "oncanplaythrough": {
          "attribOption": [],
          "global": "true"
        },
        "onchange": {
          "attribOption": [],
          "global": "true"
        },
        "onclick": {
          "attribOption": [],
          "global": "true"
        },
        "oncontextmenu": {
          "attribOption": [],
          "global": "true"
        },
        "oncuechange": {
          "attribOption": [],
          "global": "true"
        },
        "ondblclick": {
          "attribOption": [],
          "global": "true"
        },
        "ondrag": {
          "attribOption": [],
          "global": "true"
        },
        "ondragend": {
          "attribOption": [],
          "global": "true"
        },
        "ondragenter": {
          "attribOption": [],
          "global": "true"
        },
        "ondragleave": {
          "attribOption": [],
          "global": "true"
        },
        "ondragover": {
          "attribOption": [],
          "global": "true"
        },
        "ondragstart": {
          "attribOption": [],
          "global": "true"
        },
        "ondrop": {
          "attribOption": [],
          "global": "true"
        },
        "ondurationchange": {
          "attribOption": [],
          "global": "true"
        },
        "onemptied": {
          "attribOption": [],
          "global": "true"
        },
        "onended": {
          "attribOption": [],
          "global": "true"
        },
        "onerror": {
          "attribOption": [],
          "global": "true"
        },
        "onfocus": {
          "attribOption": [],
          "global": "true"
        },
        "oninput": {
          "attribOption": [],
          "global": "true"
        },
        "oninvalid": {
          "attribOption": [],
          "global": "true"
        },
        "onkeydown": {
          "attribOption": [],
          "global": "true"
        },
        "onkeypress": {
          "attribOption": [],
          "global": "true"
        },
        "onkeyup": {
          "attribOption": [],
          "global": "true"
        },
        "onload": {
          "attribOption": [],
          "global": "true"
        },
        "onloadeddata": {
          "attribOption": [],
          "global": "true"
        },
        "onloadedmetadata": {
          "attribOption": [],
          "global": "true"
        },
        "onloadstart": {
          "attribOption": [],
          "global": "true"
        },
        "onmousedown": {
          "attribOption": [],
          "global": "true"
        },
        "onmousemove": {
          "attribOption": [],
          "global": "true"
        },
        "onmouseout": {
          "attribOption": [],
          "global": "true"
        },
        "onmouseover": {
          "attribOption": [],
          "global": "true"
        },
        "onmouseup": {
          "attribOption": [],
          "global": "true"
        },
        "onmousewheel": {
          "attribOption": [],
          "global": "true"
        },
        "onpause": {
          "attribOption": [],
          "global": "true"
        },
        "onplay": {
          "attribOption": [],
          "global": "true"
        },
        "onplaying": {
          "attribOption": [],
          "global": "true"
        },
        "onprogress": {
          "attribOption": [],
          "global": "true"
        },
        "onratechange": {
          "attribOption": [],
          "global": "true"
        },
        "onreadystatechange": {
          "attribOption": [],
          "global": "true"
        },
        "onreset": {
          "attribOption": [],
          "global": "true"
        },
        "onscroll": {
          "attribOption": [],
          "global": "true"
        },
        "onseeked": {
          "attribOption": [],
          "global": "true"
        },
        "onseeking": {
          "attribOption": [],
          "global": "true"
        },
        "onselect": {
          "attribOption": [],
          "global": "true"
        },
        "onshow": {
          "attribOption": [],
          "global": "true"
        },
        "onstalled": {
          "attribOption": [],
          "global": "true"
        },
        "onsubmit": {
          "attribOption": [],
          "global": "true"
        },
        "onsuspend": {
          "attribOption": [],
          "global": "true"
        },
        "ontimeupdate": {
          "attribOption": [],
          "global": "true"
        },
        "onvolumechange": {
          "attribOption": [],
          "global": "true"
        },
        "onwaiting": {
          "attribOption": [],
          "global": "true"
        },
        "accept": {
          "attribOption": [
            "text/html",
            "text/plain",
            "application/msword",
            "application/msexcel",
            "application/postscript",
            "application/x-zip-compressed",
            "application/pdf",
            "application/rtf",
            "video/x-msvideo",
            "video/quicktime",
            "video/x-mpeg2",
            "audio/x-pn/realaudio",
            "audio/x-mpeg",
            "audio/x-waw",
            "audio/x-aiff",
            "audio/basic",
            "image/tiff",
            "image/jpeg",
            "image/gif",
            "image/x-png",
            "image/x-photo-cd",
            "image/x-MS-bmp",
            "image/x-rgb",
            "image/x-portable-pixmap",
            "image/x-portable-greymap",
            "image/x-portablebitmap"
          ]
        },
        "accept-charset": {
          "attribOption": []
        },
        "action": {
          "attribOption": []
        },
        "align": {
          "attribOption": []
        },
        "alt": {
          "attribOption": []
        },
        "archive": {
          "attribOption": []
        },
        "async": {
          "attribOption": [],
          "type": "flag"
        },
        "autocomplete": {
          "attribOption": [
            "off",
            "on"
          ]
        },
        "autofocus": {
          "attribOption": [],
          "type": "flag"
        },
        "autoplay": {
          "attribOption": [],
          "type": "flag"
        },
        "behavior": {
          "attribOption": [
            "scroll",
            "slide",
            "alternate"
          ]
        },
        "bgcolor": {
          "attribOption": [],
          "type": "color"
        },
        "border": {
          "attribOption": []
        },
        "challenge": {
          "attribOption": []
        },
        "charset": {
          "attribOption": [
            "iso-8859-1",
            "utf-8",
            "shift_jis",
            "euc-jp",
            "big5",
            "gb2312",
            "euc-kr",
            "din_66003-kr",
            "ns_4551-1-kr",
            "sen_850200_b",
            "csISO2022jp",
            "hz-gb-2312",
            "ibm852",
            "ibm866",
            "irv",
            "iso-2022-kr",
            "iso-8859-2",
            "iso-8859-3",
            "iso-8859-4",
            "iso-8859-5",
            "iso-8859-6",
            "iso-8859-7",
            "iso-8859-8",
            "iso-8859-9",
            "koi8-r",
            "ks_c_5601",
            "windows-1250",
            "windows-1251",
            "windows-1252",
            "windows-1253",
            "windows-1254",
            "windows-1255",
            "windows-1256",
            "windows-1257",
            "windows-1258",
            "windows-874",
            "x-euc",
            "asmo-708",
            "dos-720",
            "dos-862",
            "dos-874",
            "cp866",
            "cp1256"
          ]
        },
        "checked": {
          "attribOption": [],
          "type": "flag"
        },
        "cite": {
          "attribOption": []
        },
        "codebase": {
          "attribOption": []
        },
        "codetype": {
          "attribOption": []
        },
        "cols": {
          "attribOption": []
        },
        "colspan": {
          "attribOption": []
        },
        "content": {
          "attribOption": []
        },
        "controls": {
          "attribOption": [],
          "type": "flag"
        },
        "coords": {
          "attribOption": []
        },
        "data": {
          "attribOption": []
        },
        "datetime": {
          "attribOption": []
        },
        "declare": {
          "attribOption": [],
          "type": "flag"
        },
        "default": {
          "attribOption": [],
          "type": "flag"
        },
        "defer": {
          "attribOption": [],
          "type": "flag"
        },
        "direction": {
          "attribOption": [
            "left",
            "right",
            "up",
            "down"
          ]
        },
        "dirname": {
          "attribOption": []
        },
        "disabled": {
          "attribOption": [],
          "type": "flag"
        },
        "enctype": {
          "attribOption": [
            "application/x-www-form-urlencoded",
            "multipart/form-data",
            "text/plain"
          ]
        },
        "for": {
          "attribOption": []
        },
        "form": {
          "attribOption": []
        },
        "formaction": {
          "attribOption": []
        },
        "formenctype": {
          "attribOption": [
            "application/x-www-form-urlencoded",
            "multipart/form-data",
            "text/plain"
          ]
        },
        "formmethod": {
          "attribOption": [
            "get",
            "post"
          ]
        },
        "formnovalidate": {
          "attribOption": [],
          "type": "flag"
        },
        "formtarget": {
          "attribOption": [
            "_blank",
            "_parent",
            "_self",
            "_top"
          ]
        },
        "headers": {
          "attribOption": []
        },
        "height": {
          "attribOption": []
        },
        "high": {
          "attribOption": []
        },
        "href": {
          "attribOption": []
        },
        "hreflang": {
          "attribOption": []
        },
        "hspace": {
          "attribOption": []
        },
        "http-equiv": {
          "attribOption": [
            "content-type",
            "default-style",
            "refresh"
          ]
        },
        "icon": {
          "attribOption": []
        },
        "ismap": {
          "attribOption": [],
          "type": "flag"
        },
        "keytype": {
          "attribOption": [
            "dsa",
            "ec",
            "rsa"
          ]
        },
        "kind": {
          "attribOption": [
            "captions",
            "chapters",
            "descriptions",
            "metadata",
            "subtitles"
          ]
        },
        "label": {
          "attribOption": []
        },
        "list": {
          "attribOption": []
        },
        "longdesc": {
          "attribOption": []
        },
        "loop": {
          "attribOption": [],
          "type": "flag"
        },
        "low": {
          "attribOption": []
        },
        "manifest": {
          "attribOption": []
        },
        "max": {
          "attribOption": []
        },
        "maxlength": {
          "attribOption": []
        },
        "media": {
          "attribOption": [
            "screen",
            "tty",
            "tv",
            "projection",
            "handheld",
            "print",
            "aural",
            "braille",
            "embossed",
            "speech",
            "all",
            "width",
            "min-width",
            "max-width",
            "height",
            "min-height",
            "max-height",
            "device-width",
            "min-device-width",
            "max-device-width",
            "device-height",
            "min-device-height",
            "max-device-height",
            "orientation",
            "aspect-ratio",
            "min-aspect-ratio",
            "max-aspect-ratio",
            "device-aspect-ratio",
            "min-device-aspect-ratio",
            "max-device-aspect-ratio",
            "color",
            "min-color",
            "max-color",
            "color-index",
            "min-color-index",
            "max-color-index",
            "monochrome",
            "min-monochrome",
            "max-monochrome",
            "resolution",
            "min-resolution",
            "max-resolution",
            "scan",
            "grid"
          ],
          "allowMultipleValues": "true"
        },
        "mediagroup": {
          "attribOption": []
        },
        "method": {
          "attribOption": [
            "get",
            "post"
          ]
        },
        "min": {
          "attribOption": []
        },
        "multiple": {
          "attribOption": [],
          "type": "flag"
        },
        "muted": {
          "attribOption": [],
          "type": "flag"
        },
        "name": {
          "attribOption": []
        },
        "meta/name": {
          "attribOption": [
            "application-name",
            "author",
            "description",
            "generator",
            "Keywords"
          ]
        },
        "novalidate": {
          "attribOption": [],
          "type": "flag"
        },
        "open": {
          "attribOption": [],
          "type": "flag"
        },
        "optimum": {
          "attribOption": []
        },
        "pattern": {
          "attribOption": []
        },
        "placeholder": {
          "attribOption": []
        },
        "poster": {
          "attribOption": []
        },
        "preload": {
          "attribOption": [
            "auto",
            "metadata",
            "none"
          ]
        },
        "pubdate": {
          "attribOption": []
        },
        "radiogroup": {
          "attribOption": []
        },
        "rel": {
          "attribOption": [
            "alternate",
            "author",
            "bookmark",
            "help",
            "license",
            "next",
            "nofollow",
            "noreferrer",
            "prefetch",
            "prev",
            "search",
            "sidebar",
            "tag",
            "external"
          ]
        },
        "link/rel": {
          "attribOption": [
            "alternate",
            "author",
            "help",
            "icon",
            "license",
            "next",
            "pingback",
            "prefetch",
            "prev",
            "search",
            "sidebar",
            "stylesheet",
            "tag"
          ]
        },
        "readonly": {
          "attribOption": [],
          "type": "flag"
        },
        "required": {
          "attribOption": [],
          "type": "flag"
        },
        "reversed": {
          "attribOption": [],
          "type": "flag"
        },
        "rows": {
          "attribOption": []
        },
        "rowspan": {
          "attribOption": []
        },
        "sandbox": {
          "attribOption": [
            "allow-forms",
            "allow-same-origin",
            "allow-scripts",
            "allow-top-navigation"
          ]
        },
        "seamless": {
          "attribOption": [],
          "type": "flag"
        },
        "selected": {
          "attribOption": [],
          "type": "flag"
        },
        "scope": {
          "attribOption": [
            "col",
            "colgroup",
            "row",
            "rowgroup"
          ]
        },
        "scoped": {
          "attribOption": [],
          "type": "boolean"
        },
        "scrollamount": {
          "attribOption": []
        },
        "scrolldelay": {
          "attribOption": []
        },
        "shape": {
          "attribOption": [
            "circle",
            "default",
            "poly",
            "rect"
          ]
        },
        "size": {
          "attribOption": []
        },
        "sizes": {
          "attribOption": [
            "any"
          ]
        },
        "span": {
          "attribOption": []
        },
        "src": {
          "attribOption": []
        },
        "srcdoc": {
          "attribOption": []
        },
        "srclang": {
          "attribOption": []
        },
        "standby": {
          "attribOption": []
        },
        "start": {
          "attribOption": []
        },
        "step": {
          "attribOption": []
        },
        "target": {
          "attribOption": [
            "_blank",
            "_parent",
            "_self",
            "_top"
          ]
        },
        "truespeed": {
          "attribOption": [],
          "type": "flag"
        },
        "type": {
          "attribOption": []
        },
        "button/type": {
          "attribOption": [
            "button",
            "reset",
            "submit"
          ]
        },
        "command/type": {
          "attribOption": [
            "command",
            "checkbox",
            "radio"
          ]
        },
        "link/type": {
          "attribOption": [
            "text/css"
          ]
        },
        "menu/type": {
          "attribOption": [
            "context",
            "list",
            "toolbar"
          ]
        },
        "ol/type": {
          "attribOption": [
            "1",
            "a",
            "A",
            "i",
            "I"
          ]
        },
        "script/type": {
          "attribOption": [
            "text/javascript",
            "text/ecmascript",
            "text/jscript",
            "text/livescript",
            "text/tcl",
            "text/x-javascript",
            "text/x-ecmascript",
            "application/x-javascript",
            "application/x-ecmascript",
            "application/javascript",
            "application/ecmascript"
          ]
        },
        "style/type": {
          "attribOption": [
            "text/css"
          ]
        },
        "input/type": {
          "attribOption": [
            "button",
            "checkbox",
            "color",
            "date",
            "datetime",
            "datetime-local",
            "email",
            "file",
            "hidden",
            "image",
            "month",
            "number",
            "password",
            "radio",
            "range",
            "reset",
            "search",
            "submit",
            "tel",
            "text",
            "time",
            "url",
            "week"
          ]
        },
        "usemap": {
          "attribOption": []
        },
        "value": {
          "attribOption": []
        },
        "vspace": {
          "attribOption": []
        },
        "width": {
          "attribOption": []
        },
        "wrap": {
          "attribOption": [
            "hard",
            "soft"
          ]
        },
        "xml:lang": {
          "attribOption": []
        },
        "xmlns": {
          "attribOption": []
        }
      };
    }(module, exports));
    return module.exports;
  }());
  "use strict";
  
  // Load dependent modules
  var CodeHintManager = brackets.getModule("editor/CodeHintManager");
  var TokenUtils = brackets.getModule("utils/TokenUtils");
  
  var htmlStructure = HTML_STRUCTURE_MODULE;
  var tags = htmlStructure.tags;
  
  var TAG_NAME = 'tag';
  var KEYWORDS = [
    "include",
    "extends",
    "if",
    "else",
    "each",
    "while",
    "case",
    "when",
    "default",
    "mixin",
    "yield",
    "doctype",
    "append",
    "prepend",
    "block",
    "unless",
    "for"
  ];
  
  /**
   * Creates a tagInfo object and assures all the values are entered or are empty strings
   * @param {string=} tokenType what is getting edited and should be hinted
   * @param {number=} offset where the cursor is for the part getting hinted
   * @param {string=} tagName The name of the tag
   * @param {string=} attrName The name of the attribute
   * @param {string=} attrValue The value of the attribute
   * @return {{tagName:string,
   *           attr:{name:string, value:string, valueAssigned:boolean, quoteChar:string, hasEndQuote:boolean},
   *           position:{tokenType:string, offset:number}
   *         }}
   *         A tagInfo object with some context about the current tag hint.
   */
  function createTagInfo(tokenType, offset, tagName, attrName, attrValue, valueAssigned, quoteChar, hasEndQuote) {
    return {
      tagName: tagName || "",
      attr: {
        name: attrName || "",
        value: attrValue || "",
        valueAssigned: valueAssigned || false,
        quoteChar: quoteChar || "",
        hasEndQuote: hasEndQuote || false
      },
      position: {
        tokenType: tokenType || "",
        offset: offset || 0
      }
    };
  }
  
  function getTagInfo(editor, pos) {
    var ctx = TokenUtils.getInitialContext(editor._codeMirror, pos);
    var offset = TokenUtils.offsetInToken(ctx);
  
    // Check if this is inside a style block.
    if (editor.getModeForSelection() !== "jade") {
        return createTagInfo();
    }
  
    if (ctx.token.type === 'tag') {
      return createTagInfo(ctx.token.type, offset, ctx.token.string)
    }
  
    return createTagInfo();
  }
  
  function TagHints() {
  }
  
  /**
   * Determines whether HTML tag hints are available in the current editor
   * context.
   *
   * @param {Editor} editor
   * A non-null editor object for the active window.
   *
   * @param {string} implicitChar
   * Either null, if the hinting request was explicit, or a single character
   * that represents the last insertion and that indicates an implicit
   * hinting request.
   *
   * @return {boolean}
   * Determines whether the current provider is able to provide hints for
   * the given editor context and, in case implicitChar is non- null,
   * whether it is appropriate to do so.
   */
  TagHints.prototype.hasHints = function (editor, implicitChar) {
    var pos = editor.getCursorPos();
  
    this.tagInfo = getTagInfo(editor, pos);
    this.editor = editor;
    if (this.tagInfo.position.tokenType === TAG_NAME) {
      if (this.tagInfo.position.offset >= 0) {
        return true;
      }
    }
    return false;
  };
  
  /**
   * Returns a list of availble HTML tag hints if possible for the current
   * editor context.
   *
   * @return {jQuery.Deferred|{
   *        hints: Array.<string|jQueryObject>,
   *        match: string,
   *        selectInitial: boolean,
   *        handleWideResults: boolean}}
   * Null if the provider wishes to end the hinting session. Otherwise, a
   * response object that provides:
   * 1. a sorted array hints that consists of strings
   * 2. a string match that is used by the manager to emphasize matching
   *  substrings when rendering the hint list
   * 3. a boolean that indicates whether the first result, if one exists,
   *  should be selected by default in the hint list window.
   * 4. handleWideResults, a boolean (or undefined) that indicates whether
   *  to allow result string to stretch width of display.
   */
  TagHints.prototype.getHints = function (implicitChar) {
    this.tagInfo = getTagInfo(this.editor, this.editor.getCursorPos());
    if (this.tagInfo.position.tokenType === TAG_NAME) {
      if (this.tagInfo.position.offset >= 0) {
        var query = this.tagInfo.tagName.slice(0, this.tagInfo.position.offset);
        var result = Object.keys(tags).concat(KEYWORDS).filter(function (key) {
          return key.indexOf(query) === 0;
        }).sort();
  
        return {
          hints: result,
          match: query,
          selectInitial: true,
          handleWideResults: false
        };
      }
    }
  
    return null;
  };
  
  /**
   * Inserts a given HTML tag hint into the current editor context.
   *
   * @param {string} hint
   * The hint to be inserted into the editor context.
   *
   * @return {boolean}
   * Indicates whether the manager should follow hint insertion with an
   * additional explicit hint request.
   */
  TagHints.prototype.insertHint = function (completion) {
    var start = {line: -1, ch: -1};
    var end = {line: -1, ch: -1};
    var cursor = this.editor.getCursorPos();
    var charCount = 0;
  
    if (this.tagInfo.position.tokenType === TAG_NAME) {
      var textAfterCursor = this.tagInfo.tagName.substr(this.tagInfo.position.offset);
      charCount = this.tagInfo.tagName.length;
    }
  
    end.line = start.line = cursor.line;
    start.ch = cursor.ch - this.tagInfo.position.offset;
    end.ch = start.ch + charCount;
  
    if (completion !== this.tagInfo.tagName) {
      if (start.ch !== end.ch) {
        this.editor.document.replaceRange(completion, start, end);
      } else {
        this.editor.document.replaceRange(completion, start);
      }
    }
  
    return false;
  };
  
  
  var tagHints = new TagHints();
  CodeHintManager.registerHintProvider(tagHints, ["jade"], 0);
  
});