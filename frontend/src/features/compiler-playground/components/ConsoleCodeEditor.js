import Prism from 'prismjs' ;
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-clojure';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';

import {html, css, LitElement, unsafeCSS} from 'lit';
import codeEditorCSS from './ConsoleCodeEditor.css?inline' ;
import Connect from './CompilerConnect.js' ;

export class ConsoleCodeEditor extends LitElement {
  static styles = unsafeCSS(codeEditorCSS);
  static properties = {
    language: {},
    text: {},  //source
    setText: {}, //setSource
    code: {}, //state
    scrollTop: {}, //state
    scrollLeft: {}, //state
    lineNumbersContent: {}, //state
    stdout: {}, //state
    stderr: {}, //state
  } ;

  constructor(){
    super() ;
    this.language = 'c' ;
    this.scrollTop = 0 ;
    this.scrollLeft = 0 ;
    this.lineNumbersContent = '1' ;
    this.text = '' ;
    this.code = '' ;
    this.stdout = '' ;
    this.stderr = '' ;
  }

  get _code() {
    return this.renderRoot?.querySelector('#code') ?? null;
  }
  get _text() {
    return this.renderRoot?.querySelector('#text') ?? null;
  }
  get _lineNumbers() {
    return this.renderRoot?.querySelector('#lineNumbers') ?? null;
  }
  get _io() {
    return this.renderRoot?.querySelector('#io') ?? null;
  }
  get _stdin() {
    return this.renderRoot?.querySelector('#stdin') ?? null;
  }
  get _stdout() {
    return this.renderRoot?.querySelector('#stdout') ?? null;
  }
  get _stderr() {
    return this.renderRoot?.querySelector('#stderr') ?? null;
  }

  consoleOut(content){
    this.stdout = content ;
  }

  consoleErr(content){
    this.stderr = content ;
  }

  consoleIn(){
    return '' ; //todo
  }

  firstUpdated() {
    this._text.value = this.text ;
    this.updateCode() ;
  }

  updateCode(){
    let text = this._text.value ;
    this.setText(text) ;
    if(text[text.length - 1] === '\n') text += ' ' ;
    const linesCount = text.split('\n').length ;
    let lineNumbersContent = '' ;
    for(let i = 1 ; i <= linesCount ; i ++) lineNumbersContent += i + '\n' ;
    this.code = Prism.highlight(text, Prism.languages[this.language], this.language) ;
    this._code.innerHTML = this.code ;
    this.text = text ;
    this.lineNumbersContent = lineNumbersContent ;
  }

  textInput(event){
    this.updateCode();
  }

  scroll(event){
    const scrollTop = event.target.scrollTop ;
    const scrollLeft = event.target.scrollLeft ;
    this._code.scrollTop = scrollTop ;
    this._code.scrollLeft = scrollLeft ;
    this._lineNumbers.scrollTop = scrollTop ;
    this.scrollTop = scrollTop ;
    this.scrollLeft = scrollLeft ;
  }

  languageSelect(event){
    this.language = event.target.value ;
  }

  run(){
    Connect(this.text, this.language, this.consoleOut.bind(this), this.consoleErr.bind(this), this.consoleIn.bind(this));
  }

  showIO(){
    this._io.style.visibility = 'visible' ;
  }

  hideIO(){
    this._io.style.visibility = 'hidden' ;
  }

  textAreaTemplate(){
    return html`<textarea id="text" class='textEditing' spellcheck='false' @input=${this.textInput} @scroll=${this.scroll} > </textArea>` ;
  }

  codeTemplate(){
    return html`<pre class='codeHighlighting language-${this.language}'><code class='language-${this.language}' id='code' ></code></pre>` ;
  }

  lineNumbersTemplate(){
    return html`<pre id='lineNumbers' class='lineNumbers'>${this.lineNumbersContent}</pre>` ;
  }

  IOButton(){
    return html`<button id='ioButton' @click=${this.showIO} >IO</button>` ;
  }

  IO(){
    return html`<div id='io' style='visibility: hidden' >
                <button id='x' @click=${this.hideIO} >&times;</button>
                <h2>TERMINAL</h2>
                <hr />
                <button id='run' @click=${this.run} >RUN</button>
                <hr />
                <p>STDIN</p>
                <textarea id='stdin' rows='5'></textarea>
                <hr />
                <p>STDOUT</p>
                <textarea id='stdout' rows='5' .value=${this.stdout}></textarea>
                <hr />
                <p>STDERR</p>
                <textarea id='stderr' rows='5' .value=${this.stderr}></textarea>
                </div>` ;
  }

  render() {
    return html`<div class='codeEditor'>
                  ${this.textAreaTemplate()}
                  ${this.codeTemplate()}
                  ${this.lineNumbersTemplate()}
                  ${this.IO()}
                  ${this.IOButton()}
                </div>`;
  }

}

customElements.define('console-code-editor', ConsoleCodeEditor) ;
