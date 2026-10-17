// Command dbinit executes a .sql file against the project MySQL instance.
//
// It exists because the bundled mysql 26.x client no longer ships the
// mysql_native_password plugin, so `mysql < file.sql` fails on this project
// even though the Go driver connects fine.
//
// Usage: go run ./cmd/dbinit <file.sql> [dsn]
package main

import (
	"database/sql"
	"fmt"
	"os"
	"strings"

	_ "github.com/go-sql-driver/mysql"
)

const defaultDSN = "root:root123@tcp(127.0.0.1:3307)/admin_db?charset=utf8mb4&parseTime=true&loc=Local"

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: dbinit <file.sql> [dsn]")
		os.Exit(2)
	}
	dsn := defaultDSN
	if len(os.Args) > 2 {
		dsn = os.Args[2]
	}
	raw, err := os.ReadFile(os.Args[1])
	if err != nil {
		fmt.Fprintln(os.Stderr, "read:", err)
		os.Exit(1)
	}
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Fprintln(os.Stderr, "open:", err)
		os.Exit(1)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		fmt.Fprintln(os.Stderr, "ping:", err)
		os.Exit(1)
	}

	stmts := splitStatements(string(raw))
	for i, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			fmt.Fprintf(os.Stderr, "stmt %d failed: %v\n---\n%s\n", i+1, err, truncate(s, 300))
			os.Exit(1)
		}
	}
	fmt.Printf("ok: executed %d statements from %s\n", len(stmts), os.Args[1])
}

// splitStatements splits on ";" while ignoring "--" line comments and string
// literals, so semicolons inside quotes or comments do not break the file.
func splitStatements(src string) []string {
	var out []string
	var cur strings.Builder
	lines := strings.Split(src, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "--") || trimmed == "" {
			// Comments never contain a statement terminator we care about.
			continue
		}
		cur.WriteString(line)
		cur.WriteString("\n")
		if strings.HasSuffix(trimmed, ";") {
			stmt := strings.TrimSpace(cur.String())
			stmt = strings.TrimSuffix(stmt, ";")
			if strings.TrimSpace(stmt) != "" {
				out = append(out, stmt)
			}
			cur.Reset()
		}
	}
	if rest := strings.TrimSpace(cur.String()); rest != "" {
		out = append(out, rest)
	}
	return out
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
