(function(mod) {
  if (typeof exports == "object" && typeof module == "object")
    mod(require("../../lib/codemirror"))
  else if (typeof define == "function" && define.amd)
    define(["../../lib/codemirror"], mod)
  else
    mod(CodeMirror)
})(function(CodeMirror) {
  "use strict"

  function wordSet(words) {
    var set = {}
    for (var i = 0; i < words.length; i++) set[words[i]] = true
    return set
  }

  var keywords = wordSet(["module", "func"])
  var types = wordSet(["f32"])
  var buildin = wordSet(["call"])
  var rankedTypes = wordSet(["tensor", "memref"])
  var punc = ":;,.(){}[]<>"
  var hexadecimal = /^\-?0x[\dA-Fa-f][\dA-Fa-f_]*(?:(?:\.[\dA-Fa-f][\dA-Fa-f_]*)?[Pp]\-?\d[\d_]*)?/
  var decimal = /^\-?\d[\d_]*(?:\.\d[\d_]*)?(?:[Ee]\-?\d[\d_]*)?/
  var float = /[-+]?[0-9]+[.][0-9]*([eE][-+]?[0-9]+)?/


  var bareIdentifier = /([a-zA-Z$._-]|[_])([a-zA-Z$._-]|[0-9]|[_$.])*/
  var suffixIdentifier = /([0-9]+|([a-zA-Z$._-][0-9a-zA-Z$._-]*))/

  function tokenBase(stream, state, prev) {
    if (stream.sol()) state.indented = stream.indentation()
    if (stream.eatSpace()) return null

    var ch = stream.peek()
    if (ch == "/") {
      if (stream.match("//")) {
        stream.skipToEnd()
        return "comment"
      }
    }
    if (stream.match(decimal)) return "number"
    if (stream.match(hexadecimal)) return "number"
    if (stream.match(float)) return "number"
    if (ch == "%") {
      stream.next()
      if (stream.match(suffixIdentifier)) {
        return "variable"
      }
    }
    if (ch == "@") {
      stream.next()
      if (stream.match(suffixIdentifier)) {
        return "variable-2"
      }
    }
    if (punc.indexOf(ch) > -1) {
      stream.next()
      return "punctuation"
    }

    if (stream.match(bareIdentifier)) {
      var ident = stream.current()
      if (types.hasOwnProperty(ident)) return "variable-3"
      if (rankedTypes.hasOwnProperty(ident)) {
        var ch = stream.peek()
        if (ch == "<") {
          var tokenize = tokenTypeRank
          state.tokenize.push(tokenize)
        }
        return "variable-3"
      }
      if (buildin.hasOwnProperty(ident)) return "builtin"
      if (keywords.hasOwnProperty(ident)) return "keyword"
    }

    stream.next()
    return null
  }

  function tokenTypeRank(stream, state, prev) {
    var ch = stream.peek()
    while (true) {
      if (ch == ">") {
        stream.next()
        state.tokenize.pop()
        return null
      }
      if (ch == "x") {
        stream.next()
        return "builtin"
      }
      if (ch == "?") {
        stream.next()
        return "keyword"
      }
      if (stream.match(decimal)) {
        return "number"
      }

      stream.next()
      ch = stream.peek()
    }
  }

  function Context(prev, align, indented) {
    this.prev = prev
    this.align = align
    this.indented = indented
  }

  function pushContext(state, stream) {
    var align = stream.match(/^\s*($|\/[\/\*])/, false) ? null : stream.column() + 1
    state.context = new Context(state.context, align, state.indented)
  }

  function popContext(state) {
    if (state.context) {
      state.indented = state.context.indented
      state.context = state.context.prev
    }
  }

  CodeMirror.defineMode("mlir", function(config) {
    return {
      startState: function() {
        return {
          prev: null,
          context: null,
          indented: 0,
          tokenize: []
        }
      },

      token: function(stream, state) {
        var prev = state.prev
        state.prev = null
        var tokenize = state.tokenize[state.tokenize.length - 1] || tokenBase
        var style = tokenize(stream, state, prev)
        if (!style || style == "comment") state.prev = prev
        else if (!state.prev) state.prev = style

        if (style == "punctuation") {
          var bracket = /[\(\[\{]|([\]\)\}])/.exec(stream.current())
          if (bracket) {
            (bracket[1] ? popContext : pushContext)(state, stream)
          }
        }

        return style
      },

      indent: function(state, textAfter) {
        var cx = state.context
        if (!cx) return 0
        var closing = /^[\]\}\)]/.test(textAfter)
        if (cx.align != null) return cx.align - (closing ? 1 : 0)
        return cx.indented + (closing ? 0 : config.indentUnit)
      },

      electricInput: /^\s*[\)\}\]]$/,

      lineComment: "//",
      blockCommentStart: "/*",
      blockCommentEnd: "*/",
      fold: "brace",
      closeBrackets: "()[]{}''\"\"``"
    }
  })

  CodeMirror.defineMIME("text/x-mlir","mlir")
});
