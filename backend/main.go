package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"sadaka.tj/backend/config"
	"sadaka.tj/backend/database"
	"sadaka.tj/backend/handlers"
	"sadaka.tj/backend/payments"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("конфигурация: %v", err)
	}
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("база данных: %v", err)
	}
	if err := database.BootstrapAdmin(db, cfg); err != nil {
		log.Fatalf("создание админа: %v", err)
	}
	provider, err := payments.New(cfg.PaymentProvider)
	if err != nil {
		log.Fatalf("платежи: %v", err)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handlers.New(db, cfg, provider).Router(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go func() {
		log.Printf("🚀 Садака API: http://localhost:%s (env=%s, payments=%s)", cfg.Port, cfg.Env, provider.Name())
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("сервер: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Остановка сервера…")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("остановка: %v", err)
	}
	if sqlDB, err := db.DB(); err == nil {
		_ = sqlDB.Close()
	}
}
