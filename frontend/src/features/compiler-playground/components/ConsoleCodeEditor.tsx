import React from 'react' ;
import {createComponent} from '@lit/react' ;
import {ConsoleCodeEditor as ConsoleCodeEditorWC} from './ConsoleCodeEditor.js' ;


const ConsoleCodeEditor: any = createComponent({
  react: React,
  tagName: 'console-code-editor',
  elementClass: ConsoleCodeEditorWC,
});


export {
   ConsoleCodeEditor ,
}
