package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// GitHubAPIParams defines parameters for GitHub API calls
type GitHubAPIParams struct {
	Endpoint string            `json:"endpoint"`
	Method   string            `json:"method,omitempty"`
	Token    string            `json:"token,omitempty"`
	Body     map[string]any    `json:"body,omitempty"`
	Headers  map[string]string `json:"headers,omitempty"`
}

// SearchReposParams defines parameters for searching repositories
type SearchReposParams struct {
	Query   string `json:"query"`
	Sort    string `json:"sort,omitempty"`
	Order   string `json:"order,omitempty"`
	PerPage int    `json:"per_page,omitempty"`
	Page    int    `json:"page,omitempty"`
}

// GetUserParams defines parameters for getting user information
type GetUserParams struct {
	Username string `json:"username"`
}

const (
	defaultGitHubAPIBase = "https://api.github.com"
	userAgent            = "MCP-GitHub-Proxy/1.0"
)

var (
	githubAPIBase string
	defaultToken  string
)

// CallGitHubAPI makes a generic call to the GitHub API
func CallGitHubAPI(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[GitHubAPIParams]) (*mcp.CallToolResultFor[any], error) {
	client := &http.Client{}

	// Validate endpoint
	if params.Arguments.Endpoint == "" {
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{&mcp.TextContent{Text: "Error: endpoint is required"}},
			IsError: true,
		}, nil
	}

	// Build URL
	fullURL := params.Arguments.Endpoint
	if !strings.HasPrefix(fullURL, "http") {
		fullURL = githubAPIBase + "/" + strings.TrimPrefix(params.Arguments.Endpoint, "/")
	}

	// Validate URL
	if _, err := url.Parse(fullURL); err != nil {
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{&mcp.TextContent{Text: fmt.Sprintf("Error: invalid URL: %v", err)}},
			IsError: true,
		}, nil
	}

	// Determine method
	method := params.Arguments.Method
	if method == "" {
		method = "GET"
	}

	// Create request
	var reqBody io.Reader
	if params.Arguments.Body != nil && len(params.Arguments.Body) > 0 {
		jsonBody, err := json.Marshal(params.Arguments.Body)
		if err != nil {
			return &mcp.CallToolResultFor[any]{
				Content: []mcp.Content{&mcp.TextContent{Text: fmt.Sprintf("Error marshaling body: %v", err)}},
				IsError: true,
			}, nil
		}
		reqBody = strings.NewReader(string(jsonBody))
	}

	req, err := http.NewRequestWithContext(ctx, method, fullURL, reqBody)
	if err != nil {
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{&mcp.TextContent{Text: fmt.Sprintf("Error creating request: %v", err)}},
			IsError: true,
		}, nil
	}

	// Set headers
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	if reqBody != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	// Add authorization if token provided
	token := params.Arguments.Token
	if token == "" {
		token = defaultToken
	}
	if token != "" {
		req.Header.Set("Authorization", "token "+token)
	}

	// Add custom headers
	for k, v := range params.Arguments.Headers {
		req.Header.Set(k, v)
	}

	// Make request
	resp, err := client.Do(req)
	if err != nil {
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{&mcp.TextContent{Text: fmt.Sprintf("Error making request: %v", err)}},
			IsError: true,
		}, nil
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{&mcp.TextContent{Text: fmt.Sprintf("Error reading response: %v", err)}},
			IsError: true,
		}, nil
	}

	// Format response
	response := fmt.Sprintf("Status: %s\n\n%s", resp.Status, string(body))

	return &mcp.CallToolResultFor[any]{
		Content: []mcp.Content{&mcp.TextContent{Text: response}},
	}, nil
}

// SearchRepos searches GitHub repositories
func SearchRepos(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[SearchReposParams]) (*mcp.CallToolResultFor[any], error) {
	if params.Arguments.Query == "" {
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{&mcp.TextContent{Text: "Error: query is required"}},
			IsError: true,
		}, nil
	}

	// Build query parameters
	queryParams := url.Values{}
	queryParams.Set("q", params.Arguments.Query)
	if params.Arguments.Sort != "" {
		queryParams.Set("sort", params.Arguments.Sort)
	}
	if params.Arguments.Order != "" {
		queryParams.Set("order", params.Arguments.Order)
	}
	if params.Arguments.PerPage > 0 {
		queryParams.Set("per_page", fmt.Sprintf("%d", params.Arguments.PerPage))
	}
	if params.Arguments.Page > 0 {
		queryParams.Set("page", fmt.Sprintf("%d", params.Arguments.Page))
	}

	endpoint := fmt.Sprintf("/search/repositories?%s", queryParams.Encode())

	// Use the generic API caller
	return CallGitHubAPI(ctx, session, &mcp.CallToolParamsFor[GitHubAPIParams]{
		Arguments: GitHubAPIParams{
			Endpoint: endpoint,
		},
	})
}

// GetUser gets GitHub user information
func GetUser(ctx context.Context, session *mcp.ServerSession, params *mcp.CallToolParamsFor[GetUserParams]) (*mcp.CallToolResultFor[any], error) {
	if params.Arguments.Username == "" {
		return &mcp.CallToolResultFor[any]{
			Content: []mcp.Content{&mcp.TextContent{Text: "Error: username is required"}},
			IsError: true,
		}, nil
	}

	endpoint := fmt.Sprintf("/users/%s", url.PathEscape(params.Arguments.Username))

	// Use the generic API caller
	return CallGitHubAPI(ctx, session, &mcp.CallToolParamsFor[GitHubAPIParams]{
		Arguments: GitHubAPIParams{
			Endpoint: endpoint,
		},
	})
}

func main() {
	// Initialize configuration from environment
	githubAPIBase = os.Getenv("GITHUB_API_BASE")
	if githubAPIBase == "" {
		githubAPIBase = defaultGitHubAPIBase
	}
	defaultToken = os.Getenv("GITHUB_TOKEN")

	// Log configuration (without sensitive data)
	log.Printf("Starting MCP GitHub Proxy Server...")
	log.Printf("GitHub API Base: %s", githubAPIBase)
	if defaultToken != "" {
		log.Printf("Default GitHub token configured")
	}

	// Create server
	server := mcp.NewServer("mcp-github-proxy", "v1.0.0", nil)

	// Add tools
	server.AddTools(
		mcp.NewServerTool("github_api", "Make a generic GitHub API call", CallGitHubAPI,
			mcp.Input(
				mcp.Property("endpoint", mcp.Description("API endpoint (e.g., /users/octocat or full URL)")),
				mcp.Property("method", mcp.Description("HTTP method (GET, POST, PUT, DELETE, PATCH)")),
				mcp.Property("token", mcp.Description("GitHub personal access token (optional)")),
				mcp.Property("body", mcp.Description("Request body for POST/PUT/PATCH requests")),
				mcp.Property("headers", mcp.Description("Additional headers to include")),
			),
		),
		mcp.NewServerTool("search_repos", "Search GitHub repositories", SearchRepos,
			mcp.Input(
				mcp.Property("query", mcp.Description("Search query (e.g., 'language:go stars:>1000')")),
				mcp.Property("sort", mcp.Description("Sort by: stars, forks, help-wanted-issues, updated")),
				mcp.Property("order", mcp.Description("Order: asc or desc")),
				mcp.Property("per_page", mcp.Description("Results per page (max 100)")),
				mcp.Property("page", mcp.Description("Page number")),
			),
		),
		mcp.NewServerTool("get_user", "Get GitHub user information", GetUser,
			mcp.Input(
				mcp.Property("username", mcp.Description("GitHub username")),
			),
		),
	)

	// Add resources
	server.AddResources(
		&mcp.ServerResource{
			Resource: &mcp.Resource{
				URI:         "github://api-docs",
				Name:        "GitHub API Documentation",
				Description: "Information about using the GitHub proxy server",
			},
			Handler: func(ctx context.Context, session *mcp.ServerSession, params *mcp.ReadResourceParams) (*mcp.ReadResourceResult, error) {
				docs := fmt.Sprintf(`GitHub Proxy MCP Server
=======================

This server provides a proxy to the GitHub API with the following tools:

1. github_api - Make generic GitHub API calls
   - endpoint: API endpoint path or full URL
   - method: HTTP method (default: GET)
   - token: GitHub personal access token (optional, uses GITHUB_TOKEN env if not provided)
   - body: Request body for POST/PUT/PATCH
   - headers: Additional headers

2. search_repos - Search GitHub repositories
   - query: Search query (required)
   - sort: Sort by (stars, forks, help-wanted-issues, updated)
   - order: Order (asc, desc)
   - per_page: Results per page
   - page: Page number

3. get_user - Get GitHub user information
   - username: GitHub username (required)

Configuration:
- API Base: %s
- Default Token: %s

Environment Variables:
- GITHUB_TOKEN: Default GitHub personal access token
- GITHUB_API_BASE: Custom GitHub API base URL (for GitHub Enterprise)

Rate Limiting:
- Unauthenticated: 60 requests/hour
- Authenticated: 5,000 requests/hour`, githubAPIBase, func() string {
					if defaultToken != "" {
						return "Configured"
					}
					return "Not configured"
				}())

				return &mcp.ReadResourceResult{
					Contents: []*mcp.ResourceContents{
						{
							URI:      "github://api-docs",
							MIMEType: "text/plain",
							Text:     docs,
						},
					},
				}, nil
			},
		},
	)

	// Run server
	if err := server.Run(context.Background(), mcp.NewStdioTransport()); err != nil {
		log.Fatal(err)
	}
}
