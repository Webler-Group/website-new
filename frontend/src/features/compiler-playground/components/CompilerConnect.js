const connect = async (sourceCode, language, consoleOut, consoleErr, consoleIn) => {
   const ws = new WebSocket(`ws://localhost:8080`);
   ws.onerror = (e) =>{
      console.error(e.message) ;
   };
   ws.onopen = () => {
     console.log('connected') ;
   };
   ws.onmessage = async (event) => {
     const data = event.data ;
     const json = JSON.parse(data) ;
     switch(json.command){
       //server requests identification
       case 'identify': console.log('server requesting identification') ;
                        await ws.send(JSON.stringify({command:'identify', type:'emitter'}));
                        console.log('sending identification to server') ;
                        break;
       //server validated identification and awaits a job order
       case 'proceed':  console.log('identification succeeded') ;
                        console.log('sending code for compilation') ;
                        await ws.send(JSON.stringify({command: 'compile', source: sourceCode, language: language }));
                        console.log('source code sent') ;
                        break;
       //server returns the output of the sourceCode execution
       case 'compile':  const {stdout, stderr} = json ;
                        consoleOut(stdout) ;
                        consoleErr(stderr) ;
                        break;
     }
   };
   ws.onclose = (event) => {
      console.log('connection closed');
   };
}

export default connect ; 
