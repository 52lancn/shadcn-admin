package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims is our custom JWT claim set.
type Claims struct {
	UserID   int64   `json:"uid"`
	UserName string  `json:"username"`
	RoleIDs  []int64 `json:"role_ids"`
	jwt.RegisteredClaims
}

// Token returns the signed JWT string.
func Sign(secret string, expire int64, c Claims) (string, error) {
	c.ExpiresAt = jwt.NewNumericDate(time.Now().Add(time.Duration(expire) * time.Second))
	c.IssuedAt = jwt.NewNumericDate(time.Now())
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	return t.SignedString([]byte(secret))
}

// Parse validates the token and returns claims.
func Parse(secret, tokenStr string) (*Claims, error) {
	c := &Claims{}
	tok, err := jwt.ParseWithClaims(tokenStr, c, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if !tok.Valid {
		return nil, errors.New("invalid token")
	}
	return c, nil
}