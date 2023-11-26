



import React from 'react' '
import {createComponent} from '@lit/react' ;
import {ConsoleCodeEditor as LitConsoleCodeEditor} from './ConsoleCodeEditor.ts' ;



const ConsoleCodeEditor = createComponent({
  react: React ,
  tagName: 'console-code-editor',
  elementClass: LitConsoleCodeEditor,
}) ;

export ConsoleCodeEditor ;



