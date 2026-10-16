package middleware

import (
	"net/http"
	"strings"
	"time"

	"admin-server/internal/config"
	"admin-server/internal/svc"
	"admin-server/pkg/ctxx"
	"admin-server/pkg/jwt"
	"admin-server/pkg/response"

	"github.com/zeromicro/go-zero/core/logx"
)

// RequestLogger writes one line per request.
func RequestLogger(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &statusRecorder{ResponseWriter: w, status: 200}
		next(rw, r)
		logx.Infof("[HTTP] %s %s -> %d in %s", r.Method, r.URL.Path, rw.status, time.Since(start))
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// JWTAuth validates the access token and writes identity into request context.
func JWTAuth(c config.Config, svcCtx *svc.ServiceContext) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			auth := r.Header.Get("Authorization")
			if !strings.HasPrefix(auth, "Bearer ") {
				response.Unauthorized(w, "missing or invalid Authorization header")
				return
			}
			tokenStr := strings.TrimPrefix(auth, "Bearer ")
			claims, err := jwt.Parse(c.Auth.AccessSecret, tokenStr)
			if err != nil {
				response.Unauthorized(w, "invalid or expired token")
				return
			}
			// load fresh perms from db (cached later via redis)
			perms, err := svcCtx.UserPermissions(r.Context(), claims.UserID)
			if err != nil {
				response.Unauthorized(w, "failed to load user permissions")
				return
			}
			ctx := ctxx.WithUID(r.Context(), claims.UserID)
			ctx = ctxx.WithUserName(ctx, claims.UserName)
			ctx = ctxx.WithRoleIDs(ctx, claims.RoleIDs)
			ctx = ctxx.WithPerms(ctx, perms)
			next(w, r.WithContext(ctx))
		}
	}
}

// Perm checks the request against a required permission code.
// Required permission may be "*" to skip check (still requires auth).
func Perm(required string) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			if required == "*" {
				next(w, r)
				return
			}
			perms := ctxx.Perms(r.Context())
			// super admin (role code "admin") always passes; we add "admin" marker
			for _, p := range perms {
				if p == "*" || p == required {
					next(w, r)
					return
				}
			}
			response.Forbidden(w, "no permission to access this resource")
		}
	}
}