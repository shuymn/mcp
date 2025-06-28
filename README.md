# MCP Go Monorepo

This monorepo contains multiple Model Context Protocol (MCP) servers written in
Go using the official
[modelcontextprotocol/go-sdk](https://github.com/modelcontextprotocol/go-sdk).

## Structure

```
.
├── cmd/                      # Server applications
│   ├── mcp-example-server/   # Basic example server
│   └── mcp-github-proxy/     # GitHub API proxy server
├── internal/                 # Shared internal packages
│   ├── common/               # Common utilities and error types
│   └── mcp/                  # MCP-specific shared code
├── pkg/                      # Public packages (if any)
└── test/                     # Shared test utilities and data
    ├── testdata/             # Test data files
    └── testutil/             # Test helper functions
```

## Servers

### mcp-example-server

A simple MCP server demonstrating basic functionality:

- **Tools**: `greet`, `calculate`, `get_time`
- **Resources**: Server information
- **Purpose**: Template and learning example

### mcp-github-proxy

A GitHub API proxy server:

- **Tools**: `github_api`, `search_repos`, `get_user`
- **Resources**: API documentation
- **Purpose**: Proxy GitHub API calls through MCP

#### Environment Variables

- `GITHUB_TOKEN`: Default GitHub personal access token (optional)
- `GITHUB_API_BASE`: Custom GitHub API base URL (default:
  https://api.github.com)

## Getting Started

### Prerequisites

- Go 1.24 or later
- Git

### Installation

1. Clone the repository:

```bash
git clone https://github.com/shuymn/mcp.git
cd mcp
```

2. Download dependencies:

```bash
go mod download
```

3. Install git hooks (optional but recommended):

```bash
make hooks
```

### Building

Build servers using Make:

```bash
# Build all servers
make build

# Build specific server
make build-mcp-example-server

# List available servers
make list
```

### Running

Servers communicate via stdio (standard input/output):

```bash
# Run servers directly
./bin/mcp-example-server
./bin/mcp-github-proxy

# Run with environment variables
GITHUB_TOKEN=your-token ./bin/mcp-github-proxy
GITHUB_API_BASE=https://github.enterprise.com/api/v3 ./bin/mcp-github-proxy

# Or use Make targets
make run-mcp-example-server
make run-mcp-github-proxy
```

### Testing with MCP Client

You can test the servers using any MCP-compatible client. Example using the MCP
CLI:

```bash
# Connect to example server
mcp connect stdio ./bin/mcp-example-server

# List available tools
mcp tools list

# Call a tool
mcp tools call greet '{"name": "World"}'
```

## Development

### Adding a New Server

1. Create a new directory under `cmd/`:

```bash
mkdir cmd/mcp-new-server
```

2. Create `main.go` with your server implementation:

```go
package main

import (
    "context"
    "log"
    "github.com/modelcontextprotocol/go-sdk/mcp"
)

func main() {
    server := mcp.NewServer("mcp-new-server", "v1.0.0", nil)
    // Add tools, resources, etc.
    if err := server.Run(context.Background(), mcp.NewStdioTransport()); err != nil {
        log.Fatal(err)
    }
}
```

3. Build and test your server

### Shared Code

Place shared code in `internal/` packages:

- `internal/common/` - Generic utilities
- `internal/mcp/` - MCP-specific shared code

### Testing

Run tests using Make:

```bash
# Run all tests
make test

# Check code formatting
make fmt

# Run linter
make lint
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file
for details.

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/) by Anthropic
- [modelcontextprotocol/go-sdk](https://github.com/modelcontextprotocol/go-sdk) -
  Official Go SDK
