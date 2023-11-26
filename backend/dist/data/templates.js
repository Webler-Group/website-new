"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    {
        language: "python",
        source: `print("Hello World")`, cssSource: "", jsSource: ""
    },
    {
        language: "clojure",
        source: `(defn main [] (println "hello world"))(main)`, cssSource: "", jsSource: ""
    },
    {
        language: "java",
        source: `class Main
{
    public static void main(String []args)
    {
        System.out.println("My First Java Program.");
    }
};`, cssSource: "", jsSource: ""
    },
    {
        language: "rust",
        source: `fn main(){
  println!("Hello World") ;
}`, cssSource: "", jsSource: ""
    },
];
exports.default = templates;
