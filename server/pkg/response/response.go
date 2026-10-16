package response

import (
	"net/http"

	"github.com/zeromicro/go-zero/rest/httpx"
)

// Body is the unified JSON envelope returned by every API call.
type Body struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// PageData is the shape of any paginated list response.
type PageData struct {
	List    interface{} `json:"list"`
	Total   int64       `json:"total"`
	Page    int         `json:"page"`
	PerPage int         `json:"perPage"`
}

const (
	CodeOK        = 0
	CodeFail      = 1
	CodeUnauth    = 401
	CodeForbidden = 403
)

// OK writes a successful payload response.
func OK(w http.ResponseWriter, data interface{}) {
	httpx.OkJson(w, &Body{Code: CodeOK, Message: "success", Data: data})
}

// OKMsg writes a no-payload success response.
func OKMsg(w http.ResponseWriter, msg string) {
	httpx.OkJson(w, &Body{Code: CodeOK, Message: msg})
}

// Fail writes a generic failure response, HTTP 200 + payload (front-end renders by code).
func Fail(w http.ResponseWriter, err error) {
	httpx.OkJson(w, &Body{Code: CodeFail, Message: err.Error()})
}

// FailMsg writes a generic failure response with a custom message.
func FailMsg(w http.ResponseWriter, msg string) {
	httpx.OkJson(w, &Body{Code: CodeFail, Message: msg})
}

// Unauthorized writes 401.
func Unauthorized(w http.ResponseWriter, msg string) {
	w.WriteHeader(http.StatusUnauthorized)
	httpx.OkJson(w, &Body{Code: CodeUnauth, Message: msg})
}

// Forbidden writes 403.
func Forbidden(w http.ResponseWriter, msg string) {
	w.WriteHeader(http.StatusForbidden)
	httpx.OkJson(w, &Body{Code: CodeForbidden, Message: msg})
}