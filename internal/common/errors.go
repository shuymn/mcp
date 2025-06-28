// Copyright 2025 Shu YAMANI. All rights reserved.
// Use of this source code is governed by an MIT-style
// license that can be found in the LICENSE file.

package common

import "fmt"

// MCPError represents a common error type for MCP servers
type MCPError struct {
	Code    string
	Message string
	Details interface{}
}

// Error implements the error interface
func (e *MCPError) Error() string {
	if e.Details != nil {
		return fmt.Sprintf("%s: %s (details: %v)", e.Code, e.Message, e.Details)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Common error codes
const (
	ErrCodeInvalidParams    = "INVALID_PARAMS"
	ErrCodeResourceNotFound = "RESOURCE_NOT_FOUND"
	ErrCodeInternalError    = "INTERNAL_ERROR"
	ErrCodeUnauthorized     = "UNAUTHORIZED"
	ErrCodeRateLimited      = "RATE_LIMITED"
)

// NewMCPError creates a new MCPError
func NewMCPError(code, message string, details interface{}) *MCPError {
	return &MCPError{
		Code:    code,
		Message: message,
		Details: details,
	}
}
