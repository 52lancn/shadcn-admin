package main

import (
	"flag"
	"fmt"
	"net/http"

	"admin-server/internal/config"
	"admin-server/internal/handler"
	"admin-server/internal/middleware"
	"admin-server/internal/svc"

	"github.com/zeromicro/go-zero/core/conf"
	"github.com/zeromicro/go-zero/rest"
)

var configFile = flag.String("f", "cmd/api/etc/admin-api.yaml", "the config file")

func main() {
	var c config.Config
	conf.MustLoad(*configFile, &c)

	server := rest.MustNewServer(c.RestConf, rest.WithCors())
	defer server.Stop()

	// CORS - allow all origins explicitly here as a global middleware
	server.Use(func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" && originAllowed(origin, c.CORS.AllowOrigins) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				if c.CORS.AllowCredentials {
					w.Header().Set("Access-Control-Allow-Credentials", "true")
				}
				w.Header().Set("Access-Control-Allow-Methods", joinMethods(c.CORS.AllowMethods))
				w.Header().Set("Access-Control-Allow-Headers", joinMethods(c.CORS.AllowHeaders))
				if r.Method == http.MethodOptions {
					w.WriteHeader(http.StatusNoContent)
					return
				}
			}
			next(w, r)
		}
	})

	ctx := svc.NewServiceContext(c)
	server.Use(middleware.RequestLogger)
	handler.RegisterHandlers(server, ctx)

	fmt.Printf("Admin API server listening on %s:%d ...\n", c.Host, c.Port)
	server.Start()
}

func originAllowed(origin string, allowed []string) bool {
	for _, o := range allowed {
		if o == "*" || o == origin {
			return true
		}
	}
	return false
}

func joinMethods(s []string) string {
	out := ""
	for i, v := range s {
		if i > 0 {
			out += ", "
		}
		out += v
	}
	return out
}