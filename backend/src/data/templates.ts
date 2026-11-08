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
    <h1>Hello world</h1>
</body>
</html>
`,
        cssSource: `body {
    
}
`,
        jsSource: ""
    },
    {
        language: "c",
        source: `#include <stdlib.h>
#include <stdio.h>

int main(int argc, char ** argv){
  printf("Hello World\\n");
  return 0;
}
`, 
        cssSource: "", jsSource: ""
    },
    {
        language: "cpp",
        source: `#include <iostream>

using namespace std;

int main(int argc, char ** argv){
  cout << "Hello World" << endl;
  return 0;
}
`, 
        cssSource: "", jsSource: ""
    },
    {
        language: "python",
        source: `print("Hello World")
`, 
        cssSource: "", jsSource: ""
    },
    {
        language: "nodejs",
        source: `console.log("Hello world");
`, 
        cssSource: "", jsSource: ""
    },
    {
        language: "ruby",
        source: `puts "Hello world"
`, 
        cssSource: "", jsSource: ""
    },
    {
        language: "lua",
        source: `print("Hello world")
`,
        cssSource: "", jsSource: ""
    },
    {
        language: "csharp",
        source: `Console.WriteLine("Hello World");
`,
        cssSource: "", jsSource: ""
    },
    {
        language: "go",
        source: `package main

import "fmt"

func main() {
    fmt.Println("Hello World")
}
`,
        cssSource: "", jsSource: ""
    },
    {
        language: "rust",
        source: `fn main() {
    println!("Hello World");
}
`,
        cssSource: "", jsSource: ""
    },
    {
        language: "kotlin",
        source: `fun main() {
    println("Hello World")
}
`,
        cssSource: "", jsSource: ""
    },
    {
        language: "typescript",
        source: `const message: string = "Hello World";
console.log(message);
`,
        cssSource: "", jsSource: ""
    },
    {
        language: "java",
        source: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
        cssSource: "", jsSource: ""
    }
];

export default templates;
