import fs from 'fs';

function convertWasmToString(filePath: string){
  try{
    var fd = fs.openSync(filePath, 'r');
    var buffer = Buffer.alloc(1);
    var wasmString = '[';
    while (true)
    {   
      var num = fs.readSync(fd, buffer, 0, 1, null);
      if (num === 0)
        break;
      wasmString = wasmString + buffer[0] + ',';
    }
    const result = (wasmString.length > 1) ? wasmString.substring(0, wasmString.length - 1) + ']' : '[]';
    return result;
  }
  catch(e){
    return '[]';
  }
}

function convertJsToString(filePath: string){
  const defaultResult = '<script></script>'
  try{
    let content = fs.readFileSync(filePath, {encoding: 'utf8'});
    return '<script>' + content + '</script>';
  }
  catch(e){
    return defaultResult;
  }
}

function getHTMLTemplateString(filePath: string){
  const defaultResult = '<!DOCTYPE html><html></html>'
  try{
    let content = fs.readFileSync(filePath, {encoding: 'utf8'});
    return content.trim();
  }
  catch(e){
    return defaultResult;
  }  
}

function bundle(htmlPath: string, jsPath: string, wasmPath: string): string{
  const wasmString = convertWasmToString(wasmPath);
  const jsString = convertJsToString(jsPath);
  const htmlTemplateString = getHTMLTemplateString(htmlPath);
  const splitted1 = htmlTemplateString.split("{{{ WASMBIN }}}");
  const joined1 = splitted1.join(wasmString);
  const splitted2 = joined1.split("{{{ SCRIPT }}}");
  const joined2 = splitted2.join(jsString);
  return joined2;
}

export {
  bundle
};



