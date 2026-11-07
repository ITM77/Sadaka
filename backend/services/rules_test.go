package services

import (
	"errors"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"sadaka.tj/backend/models"
)

func TestSavobPoints(t *testing.T) {
	cases := []struct {
		amount     string
		multiplier float64
		want       int
	}{
		{"500", 1, 50},
		{"500", 2, 100}, // Рамадан
		{"500", 3, 150}, // Курбан
		{"5", 1, 1},     // меньше 10 TJS — всё равно 1 балл
		{"19.99", 1, 1},
		{"25.50", 2, 5},
		{"0", 1, 0},
		{"100", 0.5, 10}, // множитель меньше 1 не уменьшает баллы
	}
	for _, tc := range cases {
		got := SavobPoints(decimal.RequireFromString(tc.amount), tc.multiplier)
		if got != tc.want {
			t.Errorf("SavobPoints(%s, %v) = %d, want %d", tc.amount, tc.multiplier, got, tc.want)
		}
	}
}

func TestCanSubmitCampaign(t *testing.T) {
	approved, draft := models.MosqueStatusApproved, models.CampaignStatusDraft

	if err := CanSubmitCampaign(draft, approved, 0); err != nil {
		t.Fatalf("ожидали разрешение, получили %v", err)
	}
	if err := CanSubmitCampaign(draft, approved, 1); !errors.Is(err, ErrReportMissing) {
		t.Errorf("без отчёта по прошлой кампании: ожидали ErrReportMissing, получили %v", err)
	}
	for _, st := range []string{models.MosqueStatusPending, models.MosqueStatusBlocked, models.MosqueStatusRejected} {
		if err := CanSubmitCampaign(draft, st, 0); !errors.Is(err, ErrMosqueNotApproved) {
			t.Errorf("мечеть %s: ожидали ErrMosqueNotApproved, получили %v", st, err)
		}
	}
	if err := CanSubmitCampaign(models.CampaignStatusActive, approved, 0); !errors.Is(err, ErrWrongCampaignState) {
		t.Errorf("активную кампанию нельзя отправить повторно, получили %v", err)
	}
}

func TestCanDonate(t *testing.T) {
	now := time.Date(2026, 11, 6, 12, 0, 0, 0, time.UTC)
	c := &models.Campaign{
		Status:    models.CampaignStatusActive,
		StartDate: now.Add(-24 * time.Hour),
		EndDate:   now.Add(24 * time.Hour),
	}
	if err := CanDonate(c, models.MosqueStatusApproved, now); err != nil {
		t.Fatalf("ожидали разрешение, получили %v", err)
	}
	if err := CanDonate(c, models.MosqueStatusBlocked, now); !errors.Is(err, ErrMosqueNotApproved) {
		t.Errorf("заблокированная мечеть: получили %v", err)
	}
	if err := CanDonate(c, models.MosqueStatusApproved, c.EndDate); !errors.Is(err, ErrCampaignNotOpen) {
		t.Errorf("после окончания: получили %v", err)
	}
	if err := CanDonate(c, models.MosqueStatusApproved, c.StartDate.Add(-time.Second)); !errors.Is(err, ErrCampaignNotOpen) {
		t.Errorf("до начала: получили %v", err)
	}
	c.Status = models.CampaignStatusPendingApproval
	if err := CanDonate(c, models.MosqueStatusApproved, now); !errors.Is(err, ErrCampaignNotOpen) {
		t.Errorf("неодобренная кампания: получили %v", err)
	}
}
