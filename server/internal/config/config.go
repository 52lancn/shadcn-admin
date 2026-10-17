package config

import (
	"github.com/zeromicro/go-zero/core/stores/redis"
	"github.com/zeromicro/go-zero/core/stores/sqlx"
	"github.com/zeromicro/go-zero/rest"
)

type Config struct {
	rest.RestConf

	Mysql struct {
		DataSource string
	}

	Redis redis.RedisConf

	Auth struct {
		AccessSecret string
		AccessExpire int64
	}

	CORS struct {
		AllowOrigins     []string
		AllowMethods     []string
		AllowHeaders     []string
		AllowCredentials bool
	}

	// AI configures the OpenAI-compatible chat-completion endpoint used by all
	// AI features (AIGC copy, translation, sentiment analysis).
	// Leave BaseURL / APIKey empty to run on the built-in local fallback engine.
	AI struct {
		BaseURL     string
		APIKey      string
		Model       string
		Timeout     int64  // seconds
		Temperature float64
		MaxTokens   int
		// Record keeps every generation/translation/analysis in ai_chat_record.
		Record bool
	}
}

// helpers to construct components from config
func (c *Config) SqlxConn() sqlx.SqlConn {
	return sqlx.NewMysql(c.Mysql.DataSource)
}

func (c *Config) RedisClient() *redis.Redis {
	return redis.MustNewRedis(c.Redis)
}