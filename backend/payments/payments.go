// Package payments — абстракция платёжного шлюза. Сейчас есть только
// тестовый провайдер "mock"; Alif, IMON и банковский эквайринг
// подключаются как отдельные реализации Provider.
package payments

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

type ChargeRequest struct {
	TransactionID uuid.UUID
	Amount        decimal.Decimal
	Currency      string
	Method        string
}

type ChargeResult struct {
	Reference string // идентификатор платежа у провайдера
	Completed bool   // true — деньги списаны сразу
}

type Provider interface {
	Name() string
	Charge(ctx context.Context, req ChargeRequest) (ChargeResult, error)
}

func New(name string) (Provider, error) {
	switch name {
	case "mock":
		return mockProvider{}, nil
	default:
		return nil, fmt.Errorf("неизвестный платёжный провайдер %q", name)
	}
}

// mockProvider мгновенно «проводит» платёж. Только для разработки:
// config запрещает его в production.
type mockProvider struct{}

func (mockProvider) Name() string { return "mock" }

func (mockProvider) Charge(_ context.Context, req ChargeRequest) (ChargeResult, error) {
	return ChargeResult{Reference: "mock-" + req.TransactionID.String(), Completed: true}, nil
}
