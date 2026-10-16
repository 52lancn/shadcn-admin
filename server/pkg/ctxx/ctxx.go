package ctxx

import (
	"context"
	"errors"
	"strconv"
)

type key int

const (
	userIDKey key = iota
	userNameKey
	roleIDsKey
	permsKey
)

// WithUID puts user id into context
func WithUID(ctx context.Context, uid int64) context.Context {
	return context.WithValue(ctx, userIDKey, uid)
}

// UID retrieves user id from context; returns 0 if absent
func UID(ctx context.Context) int64 {
	if v, ok := ctx.Value(userIDKey).(int64); ok {
		return v
	}
	return 0
}

func WithUserName(ctx context.Context, name string) context.Context {
	return context.WithValue(ctx, userNameKey, name)
}

func UserName(ctx context.Context) string {
	if v, ok := ctx.Value(userNameKey).(string); ok {
		return v
	}
	return ""
}

func WithRoleIDs(ctx context.Context, ids []int64) context.Context {
	return context.WithValue(ctx, roleIDsKey, ids)
}

func RoleIDs(ctx context.Context) []int64 {
	if v, ok := ctx.Value(roleIDsKey).([]int64); ok {
		return v
	}
	return nil
}

func WithPerms(ctx context.Context, perms []string) context.Context {
	return context.WithValue(ctx, permsKey, perms)
}

func Perms(ctx context.Context) []string {
	if v, ok := ctx.Value(permsKey).([]string); ok {
		return v
	}
	return nil
}

// parseID helper
func ParseID(s string) (int64, error) {
	id, err := strconv.ParseInt(s, 10, 64)
	if err != nil {
		return 0, errors.New("invalid id")
	}
	return id, nil
}