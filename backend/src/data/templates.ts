const templates = [
    {
        language: "web",
        source: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>`,
        cssSource: `body {
    
}`,
        jsSource: ""
    },
    {
        language: "c",
        source: `#include <stdlib.h>
#include <stdio.h>

int main(int argc, char ** argv){
  printf("Hello World\\n");
  return 0;
}`, cssSource: "", jsSource: ""
    },
    {
        language: "cpp",
        source: `#include <iostream>

using namespace std;

int main(int argc, char ** argv){
  cout << "Hello World" << endl;
  return 0;
}`, cssSource: "", jsSource: ""
    },
];

export default templates;
