// Package llm is a thin, dependency-free client for OpenAI-compatible
// chat-completion APIs. Because DeepSeek / Qwen(DashScope) / Moonshot / Zhipu /
// SiliconFlow / OpenRouter / Ollama / vLLM all speak the same
// `POST {base}/chat/completions` dialect, switching vendors is only a matter of
// changing BaseURL + Model in the config file - no code change required.
//
// When no API key (or no base URL) is configured, the client transparently
// falls back to the built-in local engine so that every AI feature in this
// project stays demonstrable without any external dependency.
package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// Message is one chat turn. Role is one of: system / user / assistant.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Request is the vendor-neutral chat request.
type Request struct {
	Messages    []Message
	Model       string
	Temperature float64
	MaxTokens   int
	Stream      bool
}

// Usage reports token accounting when the vendor returns it.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// Response is the vendor-neutral chat response.
type Response struct {
	Content      string `json:"content"`
	Model        string `json:"model"`
	FinishReason string `json:"finishReason"`
	Usage        Usage  `json:"usage"`
	// Mocked is true when the answer was produced by the local fallback
	// engine instead of a real vendor. The UI surfaces it as a badge so an
	// operator never mistakes canned text for a live model answer.
	Mocked bool `json:"mocked"`
	// Vendor records which provider actually served the request.
	Vendor string `json:"vendor"`
	// Elapsed is the wall-clock duration of the call in milliseconds.
	Elapsed int64 `json:"elapsed"`
}

// StreamChunk is one incremental piece of a streamed answer.
type StreamChunk struct {
	Delta string
	Done  bool
	Err   error
}

// Client talks to a chat-completion endpoint.
type Client struct {
	baseURL string
	apiKey  string
	model   string
	http    *http.Client
	// mock forces the local engine even when a key is present (handy for tests).
	mock bool
}

// Options configures a Client.
type Options struct {
	// BaseURL is the API root, e.g. "https://api.deepseek.com/v1".
	// An empty value enables the local fallback engine.
	BaseURL string
	// APIKey is the bearer token. Empty + non-empty BaseURL still uses the
	// local engine, because a keyless call would only produce 401s.
	APIKey string
	// Model is the vendor model id. Defaults to "gpt-4o-mini" style default.
	Model string
	// Timeout bounds a single non-streaming call. Defaults to 60s.
	Timeout time.Duration
	// Mock forces the local engine.
	Mock bool
}

// New builds a Client. It never fails: an unusable configuration degrades to
// the local engine rather than breaking the whole request path.
func New(opt Options) *Client {
	baseURL := strings.TrimRight(strings.TrimSpace(opt.BaseURL), "/")
	apiKey := strings.TrimSpace(opt.APIKey)
	model := strings.TrimSpace(opt.Model)
	if model == "" {
		model = "gpt-4o-mini"
	}
	if opt.Timeout <= 0 {
		opt.Timeout = 60 * time.Second
	}
	useMock := opt.Mock || baseURL == "" || apiKey == ""
	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		model:   model,
		http:    &http.Client{Timeout: opt.Timeout},
		mock:    useMock,
	}
}

// Enabled reports whether a real vendor is wired up.
func (c *Client) Enabled() bool { return !c.mock }

// Model returns the configured model id.
func (c *Client) Model() string { return c.model }

// Vendor is a human-readable provider label used by the UI status card.
func (c *Client) Vendor() string {
	if c.mock {
		return "本地兜底引擎"
	}
	host := c.baseURL
	host = strings.TrimPrefix(host, "https://")
	host = strings.TrimPrefix(host, "http://")
	if i := strings.Index(host, "/"); i > 0 {
		host = host[:i]
	}
	if host == "" {
		return "未知"
	}
	return host
}

// ---------- wire format ----------

type wireMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type wireRequest struct {
	Model       string        `json:"model"`
	Messages    []wireMessage `json:"messages"`
	Temperature float64       `json:"temperature,omitempty"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Stream      bool          `json:"stream,omitempty"`
}

type wireUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type wireResponse struct {
	Model   string `json:"model"`
	Choices []struct {
		Index        int    `json:"index"`
		Message      struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"message"`
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage *wireUsage `json:"usage"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error"`
}

type wireStreamChunk struct {
	Choices []struct {
		Delta struct {
			Content string `json:"content"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
}

// Chat performs one blocking chat completion.
func (c *Client) Chat(ctx context.Context, req Request) (*Response, error) {
	start := time.Now()
	if c.mock {
		out, err := LocalChat(req)
		if err != nil {
			return nil, err
		}
		out.Mocked = true
		out.Vendor = c.Vendor()
		out.Elapsed = time.Since(start).Milliseconds()
		return out, nil
	}

	model := req.Model
	if model == "" {
		model = c.model
	}
	body, err := json.Marshal(wireRequest{
		Model:       model,
		Messages:    toWireMessages(req.Messages),
		Temperature: req.Temperature,
		MaxTokens:   req.MaxTokens,
		Stream:      false,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal llm request: %w", err)
	}

	var lastErr error
	// Two attempts: vendors occasionally return a transient 429/5xx on the
	// first call. A single retry absorbs most of that noise.
	for attempt := 0; attempt < 2; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(600 * time.Millisecond):
			}
		}
		resp, err := c.do(ctx, body)
		if err == nil {
			return resp, nil
		}
		lastErr = err
		if !retryable(err) {
			break
		}
	}
	return nil, lastErr
}

func (c *Client) do(ctx context.Context, body []byte) (*Response, error) {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("build llm request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Accept", "application/json")

	httpResp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("call llm: %w", err)
	}
	defer httpResp.Body.Close()

	raw, err := io.ReadAll(httpResp.Body)
	if err != nil {
		return nil, fmt.Errorf("read llm body: %w", err)
	}

	var wr wireResponse
	if err := json.Unmarshal(raw, &wr); err != nil {
		return nil, fmt.Errorf("llm http %d: %s", httpResp.StatusCode, truncate(string(raw), 240))
	}
	if wr.Error != nil && wr.Error.Message != "" {
		return nil, fmt.Errorf("llm error(http %d): %s", httpResp.StatusCode, wr.Error.Message)
	}
	if httpResp.StatusCode >= 400 {
		return nil, fmt.Errorf("llm http %d: %s", httpResp.StatusCode, truncate(string(raw), 240))
	}
	if len(wr.Choices) == 0 {
		return nil, errors.New("llm returned no choices")
	}

	out := &Response{
		Content:      wr.Choices[0].Message.Content,
		FinishReason: wr.Choices[0].FinishReason,
		Vendor:       c.Vendor(),
	}
	if out.Content == "" {
		out.Content = wr.Choices[0].Delta.Content
	}
	if wr.Model != "" {
		out.Model = wr.Model
	} else {
		out.Model = c.model
	}
	if wr.Usage != nil {
		out.Usage = Usage{
			PromptTokens:     wr.Usage.PromptTokens,
			CompletionTokens: wr.Usage.CompletionTokens,
			TotalTokens:      wr.Usage.TotalTokens,
		}
	}
	// Some vendors report only prompt+completion; derive the total.
	if out.Usage.TotalTokens == 0 {
		out.Usage.TotalTokens = out.Usage.PromptTokens + out.Usage.CompletionTokens
	}
	return out, nil
}

// ChatStream performs a streaming chat completion. It degrades to a single
// chunk when the vendor does not support SSE, and to the local engine when
// running in mock mode, so callers never need a second code path.
func (c *Client) ChatStream(ctx context.Context, req Request, sink func(StreamChunk) error) error {
	req.Stream = true
	if c.mock {
		out, err := LocalChat(req)
		if err != nil {
			return sink(StreamChunk{Err: err})
		}
		// Emit in small slices so the front-end typewriter effect still works.
		const slice = 24
		runes := []rune(out.Content)
		for i := 0; i < len(runes); i += slice {
			end := i + slice
			if end > len(runes) {
				end = len(runes)
			}
			if err := sink(StreamChunk{Delta: string(runes[i:end])}); err != nil {
				return err
			}
		}
		return sink(StreamChunk{Done: true})
	}

	model := req.Model
	if model == "" {
		model = c.model
	}
	body, err := json.Marshal(wireRequest{
		Model:       model,
		Messages:    toWireMessages(req.Messages),
		Temperature: req.Temperature,
		MaxTokens:   req.MaxTokens,
		Stream:      true,
	})
	if err != nil {
		return fmt.Errorf("marshal llm request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("build llm request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Accept", "text/event-stream")

	httpResp, err := c.http.Do(httpReq)
	if err != nil {
		return fmt.Errorf("call llm stream: %w", err)
	}
	defer httpResp.Body.Close()
	if httpResp.StatusCode >= 400 {
		raw, _ := io.ReadAll(httpResp.Body)
		return fmt.Errorf("llm http %d: %s", httpResp.StatusCode, truncate(string(raw), 240))
	}

	reader := bufio.NewReaderSize(httpResp.Body, 8*1024)
	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			trimmed := strings.TrimSpace(line)
			if strings.HasPrefix(trimmed, "data:") {
				payload := strings.TrimSpace(strings.TrimPrefix(trimmed, "data:"))
				if payload == "[DONE]" {
					return sink(StreamChunk{Done: true})
				}
				var sc wireStreamChunk
				if jerr := json.Unmarshal([]byte(payload), &sc); jerr == nil && len(sc.Choices) > 0 {
					if d := sc.Choices[0].Delta.Content; d != "" {
						if serr := sink(StreamChunk{Delta: d}); serr != nil {
							return serr
						}
					}
				}
			}
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				return sink(StreamChunk{Done: true})
			}
			return err
		}
	}
}

// ---------- helpers ----------

func toWireMessages(msgs []Message) []wireMessage {
	out := make([]wireMessage, 0, len(msgs))
	for _, m := range msgs {
		if strings.TrimSpace(m.Content) == "" {
			continue
		}
		role := m.Role
		if role == "" {
			role = "user"
		}
		out = append(out, wireMessage{Role: role, Content: m.Content})
	}
	return out
}

func retryable(err error) bool {
	if err == nil {
		return false
	}
	s := err.Error()
	// Transient conditions only: rate limit, gateway timeout, 5xx.
	return strings.Contains(s, "http 429") ||
		strings.Contains(s, "http 500") ||
		strings.Contains(s, "http 502") ||
		strings.Contains(s, "http 503") ||
		strings.Contains(s, "http 504") ||
		strings.Contains(s, "connection reset") ||
		strings.Contains(s, "timeout")
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
