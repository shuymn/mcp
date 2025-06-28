# MCP Go Monorepo Makefile
PROJECT_NAME := mcp
BIN_DIR := bin

# Get all server directories
SERVERS := $(notdir $(wildcard cmd/*))
BINARIES := $(addprefix $(BIN_DIR)/,$(SERVERS))

# Go build flags
GOFLAGS := -ldflags="-w -s"

# Go tool flags
GO_TOOL_FLAGS := -modfile=go.tool.mod

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Create bin directory
$(BIN_DIR):
	@mkdir -p $(BIN_DIR)

# Build all servers
.PHONY: build
build: $(BIN_DIR) $(BINARIES) ## Build all MCP servers
	@echo "$(GREEN)✓ All servers built successfully!$(NC)"
	@echo "Binaries are in: $(BIN_DIR)/"
	@ls -la $(BIN_DIR)/

# Build individual server
$(BIN_DIR)/%: cmd/%/main.go | $(BIN_DIR)
	@echo "$(YELLOW)Building $*...$(NC)"
	@go build $(GOFLAGS) -o $@ ./cmd/$*
	@echo "$(GREEN)✓ Built $* successfully$(NC)"

# Build specific server
.PHONY: build-%
build-%: $(BIN_DIR)/% ## Build specific server (e.g., make build-mcp-example-server)
	@echo "$(GREEN)✓ Built $* successfully$(NC)"

# Run tests with race detection and shuffle
.PHONY: test
test: ## Run tests with race detection and shuffle
	@echo "$(YELLOW)Running tests...$(NC)"
	@go test -v -race -shuffle=on ./...
	@echo "$(GREEN)✓ All tests passed$(NC)"

# Format code
.PHONY: fmt
fmt: ## Format code using gofmt
	@echo "$(YELLOW)Formatting code...$(NC)"
	@go tool $(GO_TOOL_FLAGS) golangci-lint fmt
	@echo "$(GREEN)✓ Code formatted successfully$(NC)"

# Run linter
.PHONY: lint
lint: ## Run golangci-lint
	@echo "$(YELLOW)Running golangci-lint...$(NC)"
	@go tool $(GO_TOOL_FLAGS) golangci-lint run
	@echo "$(GREEN)✓ Linting passed$(NC)"

# Run specific server
.PHONY: run-%
run-%: build-% ## Run specific server (e.g., make run-mcp-example-server)
	@echo "$(BLUE)Running $*...$(NC)"
	@$(BIN_DIR)/$*

# Clean build artifacts
.PHONY: clean
clean: ## Remove build artifacts and coverage files
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	@rm -rf $(BIN_DIR)
	@go clean
	@echo "$(GREEN)✓ Clean complete$(NC)"

# Check for dependency updates
.PHONY: deps-check
deps-check: ## Check for dependency updates
	@echo "$(YELLOW)Checking for dependency updates...$(NC)"
	@go list -u -m all

# Update dependencies
.PHONY: deps-update
deps-update: ## Update all dependencies
	@echo "$(YELLOW)Updating dependencies...$(NC)"
	@go get -u ./...
	@go mod tidy
	@echo "$(GREEN)✓ Dependencies updated$(NC)"

# Verify dependencies
.PHONY: deps-verify
deps-verify: ## Verify dependencies are correct
	@echo "$(YELLOW)Verifying dependencies...$(NC)"
	@go mod verify
	@echo "$(GREEN)✓ Dependencies verified$(NC)"

# Download dependencies
.PHONY: deps
deps: ## Download dependencies
	@echo "$(YELLOW)Downloading dependencies...$(NC)"
	@go mod download
	@echo "$(GREEN)✓ Dependencies downloaded$(NC)"

# Install all servers to GOPATH/bin
.PHONY: install
install: ## Install all servers to GOPATH/bin
	@echo "$(YELLOW)Installing servers to GOPATH/bin...$(NC)"
	@for server in $(SERVERS); do \
		echo "Installing $$server..."; \
		go install ./cmd/$$server; \
	done
	@echo "$(GREEN)✓ All servers installed$(NC)"

# List available servers
.PHONY: list
list: ## List all available servers
	@echo "Available servers:"
	@for server in $(SERVERS); do \
		echo "  - $$server"; \
	done

# Install git hooks
.PHONY: hooks
hooks: ## Install git hooks using lefthook
	@echo "$(YELLOW)Installing git hooks...$(NC)"
	@go tool $(GO_TOOL_FLAGS) lefthook install
	@echo "$(GREEN)✓ Git hooks installed$(NC)"

# Show help
.PHONY: help
help: ## Show this help message
	@echo "MCP Go Monorepo - Available targets:"
	@echo ""
	@grep -E '^[a-zA-Z_%-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(BLUE)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "Examples:"
	@echo "  make build              # Build all servers"
	@echo "  make build-mcp-example-server  # Build specific server"
	@echo "  make run-mcp-github-proxy      # Run specific server"
	@echo "  make test               # Run tests"
	@echo "  make fmt                # Format code"
	@echo "  make lint               # Run linter"
	@echo "  make hooks              # Install git hooks"
