package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"sadaka.tj/backend/utils"
)

// RateLimit — не больше max запросов с одного IP к одному маршруту за окно window.
// Хранится в памяти процесса: для одного экземпляра API этого достаточно;
// при нескольких экземплярах лимит нужно перенести в общий стор (Redis).
func RateLimit(max int, window time.Duration) gin.HandlerFunc {
	l := &limiter{max: max, window: window, hits: map[string]*bucket{}, now: time.Now}
	return l.handle
}

type bucket struct {
	start time.Time
	count int
}

type limiter struct {
	mu        sync.Mutex
	max       int
	window    time.Duration
	hits      map[string]*bucket
	lastSweep time.Time
	now       func() time.Time
}

// allow засчитывает попытку; при превышении возвращает, через сколько можно снова.
func (l *limiter) allow(key string) (bool, time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	if now.Sub(l.lastSweep) > l.window { // чистим старые окна, чтобы карта не росла
		for k, b := range l.hits {
			if now.Sub(b.start) >= l.window {
				delete(l.hits, k)
			}
		}
		l.lastSweep = now
	}
	b, ok := l.hits[key]
	if !ok || now.Sub(b.start) >= l.window {
		l.hits[key] = &bucket{start: now, count: 1}
		return true, 0
	}
	if b.count >= l.max {
		return false, b.start.Add(l.window).Sub(now)
	}
	b.count++
	return true, 0
}

func (l *limiter) handle(c *gin.Context) {
	ok, wait := l.allow(c.ClientIP() + " " + c.FullPath())
	if !ok {
		secs := int(wait.Seconds()) + 1
		c.Header("Retry-After", strconv.Itoa(secs))
		utils.Fail(c, http.StatusTooManyRequests, "RATE_LIMIT",
			"слишком много попыток — попробуйте через "+strconv.Itoa((secs+59)/60)+" мин.")
		return
	}
	c.Next()
}
