package main

import (
	"embed"
	"fmt"
	"os"
)

//go:embed ppfront/dist
var frontendFS embed.FS

func main() {
	_ = frontendFS
	fmt.Println("pockerplan server")
	os.Exit(0)
}
