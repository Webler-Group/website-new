package main

import (
	"bufio"
	"fmt"
	"os"
	"runtime"
)

func main() {
	name, _ := bufio.NewReader(os.Stdin).ReadString('\n')
	fmt.Printf("hello %s %s\n", name[:len(name)-1], runtime.Version())
}
