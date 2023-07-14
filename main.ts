import './styles.scss'
import { MarkdownView, Plugin } from 'obsidian'

import './mode/mlir/mlir'

export default class MLIRSyntaxHighlightPlugin extends Plugin {

  // these are the CodeMirror modes that Obsidian uses by default
  modesToKeep = ["hypermd", "markdown", "null", "xml"];

  async onload() {
    // wait for layout to be ready to perform the rest
    this.app.workspace.layoutReady ? this.layoutReady() : this.app.workspace.on('layout-ready', this.layoutReady);
  }

  layoutReady = () => {
    // don't need the event handler anymore, get rid of it
    this.app.workspace.off('layout-ready', this.layoutReady);
    this.refreshLeaves();
  }

  onunload() {
    // Delete all the codemirror modes, to disable the syntax highlighting
    // except the default ones, obviously
    for (const key in CodeMirror.modes) {
      if (CodeMirror.modes.hasOwnProperty(key) && !this.modesToKeep.includes(key)) {
        delete CodeMirror.modes[key];
      }
    }

    this.refreshLeaves();
  }

  refreshLeaves = () => {
    // re-set the editor mode to refresh the syntax highlighting
    this.app.workspace.iterateCodeMirrors(cm => cm.setOption("mode", cm.getOption("mode")))
  }
}