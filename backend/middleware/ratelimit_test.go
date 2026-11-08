package middleware

import (
	"testing"
	"time"
)

func TestLimiterWindow(t *testing.T) {
	now := time.Date(2026, 11, 9, 10, 0, 0, 0, time.UTC)
	l := &limiter{max: 3, window: time.Minute, hits: map[string]*bucket{}, now: func() time.Time { return now }}
	for i := 0; i < 3; i++ {
		if ok, _ := l.allow("ip /login"); !ok {
			t.Fatalf("attempt %d blocked", i+1)
		}
	}
	ok, wait := l.allow("ip /login")
	if ok || wait <= 0 || wait > time.Minute {
		t.Fatalf("4th attempt: ok=%v wait=%v", ok, wait)
	}
	if ok, _ := l.allow("other /login"); !ok {
		t.Fatal("other key must not be limited")
	}
	now = now.Add(time.Minute)
	if ok, _ := l.allow("ip /login"); !ok {
		t.Fatal("new window must allow again")
	}
}
