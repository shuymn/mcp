package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// GreetParams defines the parameters for the greet tool
type GreetParams struct {
	Name string `json:"name"`
}

// CalculateParams defines the parameters for the calculate tool
type CalculateParams struct {
	A         float64 `json:"a"`
	B         float64 `json:"b"`
	Operation string  `json:"operation"`
}

// SayHi handles the greet tool invocation
func SayHi(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[GreetParams]) (*mcp.CallToolResultFor[any], error) {
	greeting := fmt.Sprintf("Hello, %s! Welcome to the MCP Example Server!", params.Arguments.Name)
	return &mcp.CallToolResultFor[any]{
		Content: []mcp.Content{&mcp.TextContent{Text: greeting}},
	}, nil
}

// Calculate handles basic math operations
func Calculate(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[CalculateParams]) (*mcp.CallToolResultFor[any], error) {
	var result float64
	var operation string

	switch params.Arguments.Operation {
	case "add":
		result = params.Arguments.A + params.Arguments.B
		operation = "+"
	case "subtract":
		result = params.Arguments.A - params.Arguments.B
		operation = "-"
	case "multiply":
		result = params.Arguments.A * params.Arguments.B
		operation = "*"
	case "divide":
		if params.Arguments.B == 0 {
			return &mcp.CallToolResultFor[any]{
				Content: []mcp.Content{&mcp.TextContent{Text: "Error: Division by zero"}},
				IsError: true,
			}, nil
		}
		result = params.Arguments.A / params.Arguments.B
		operation = "/"
	default:
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{&mcp.TextContent{Text: fmt.Sprintf("Error: Unknown operation '%s'", params.Arguments.Operation)}},
			IsError: true,
		}, nil
	}

	response := fmt.Sprintf("%.2f %s %.2f = %.2f", params.Arguments.A, operation, params.Arguments.B, result)
	return &mcp.CallToolResultFor[any]{
		Content: []mcp.Content{&mcp.TextContent{Text: response}},
	}, nil
}

// GetTime returns the current time
func GetTime(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[struct{}]) (*mcp.CallToolResultFor[any], error) {
	currentTime := time.Now().Format(time.RFC3339)
	return &mcp.CallToolResultFor[any]{
		Content: []mcp.Content{&mcp.TextContent{Text: fmt.Sprintf("Current time: %s", currentTime)}},
	}, nil
}

func main() {
	// Create server with tools
	server := mcp.NewServer("mcp-example-server", "v1.0.0", nil)

	// Add tools
	server.AddTools(
		mcp.NewServerTool("greet", "Say hello to someone", SayHi,
			mcp.Input(
				mcp.Property("name", mcp.Description("The name of the person to greet")),
			),
		),
		mcp.NewServerTool("calculate", "Perform basic math operations", Calculate,
			mcp.Input(
				mcp.Property("a", mcp.Description("First number")),
				mcp.Property("b", mcp.Description("Second number")),
				mcp.Property("operation", mcp.Description("Operation to perform: add, subtract, multiply, or divide")),
			),
		),
		mcp.NewServerTool("get_time", "Get the current time", GetTime),
	)

	// Add a simple resource
	server.AddResources(&mcp.ServerResource{
		Resource: &mcp.Resource{
			URI:         "example://info",
			Name:        "Server Information",
			Description: "Basic information about this MCP example server",
		},
		Handler: func(ctx context.Context, session *mcp.ServerSession, params *mcp.ReadResourceParams) (*mcp.ReadResourceResult, error) {
			info := `MCP Example Server
==================
Version: v1.0.0
Author: Shu YAMANI
Description: A simple example MCP server demonstrating basic tool functionality

Available Tools:
- greet: Say hello to someone
- calculate: Perform basic math operations (add, subtract, multiply, divide)
- get_time: Get the current time

This server demonstrates the basic capabilities of the MCP Go SDK.`

			return &mcp.ReadResourceResult{
				Contents: []*mcp.ResourceContents{
					{
						URI:      "example://info",
						MIMEType: "text/plain",
						Text:     info,
					},
				},
			}, nil
		},
	})

	// Run the server
	log.Println("Starting MCP Example Server...")
	if err := server.Run(context.Background(), mcp.NewStdioTransport()); err != nil {
		log.Fatal(err)
	}
}
