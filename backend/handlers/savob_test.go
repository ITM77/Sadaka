package handlers

import (
	"testing"
	"time"

	"sadaka.tj/backend/models"
)

func TestSavobModeActive(t *testing.T) {
	now := time.Date(2027, 3, 10, 12, 0, 0, 0, Dushanbe)
	day := func(d int) *time.Time { v := time.Date(2027, 3, d, 0, 0, 0, 0, Dushanbe); return &v }
	cases := []struct {
		name string
		mode *models.SavobMode
		want bool
	}{
		{"nil", nil, false},
		{"regular", &models.SavobMode{Event: models.SavobEventRegular, Multiplier: 2}, false},
		{"x1", &models.SavobMode{Event: models.SavobEventRamadan, Multiplier: 1}, false},
		{"open", &models.SavobMode{Event: models.SavobEventRamadan, Multiplier: 2}, true},
		{"inside", &models.SavobMode{Event: models.SavobEventRamadan, Multiplier: 2, StartsAt: day(1), EndsAt: day(31)}, true},
		{"not yet", &models.SavobMode{Event: models.SavobEventRamadan, Multiplier: 2, StartsAt: day(11)}, false},
		{"ended", &models.SavobMode{Event: models.SavobEventRamadan, Multiplier: 2, EndsAt: day(10)}, false},
	}
	for _, tc := range cases {
		if got := tc.mode.Active(now); got != tc.want {
			t.Errorf("%s: Active = %v, want %v", tc.name, got, tc.want)
		}
	}
}

func TestSavobSummary(t *testing.T) {
	from := time.Date(2027, 3, 1, 0, 0, 0, 0, Dushanbe)
	to := time.Date(2027, 3, 31, 0, 0, 0, 0, Dushanbe) // не включительно
	m := &models.SavobMode{Event: models.SavobEventRamadan, Multiplier: 2.5, StartsAt: &from, EndsAt: &to}
	if got, want := savobSummary(m), "Рамадан ×2,5, 01.03.2027 – 30.03.2027"; got != want {
		t.Errorf("savobSummary = %q, want %q", got, want)
	}
	if got := savobSummary(&models.SavobMode{Event: models.SavobEventRegular}); got != "Обычный режим, ×1" {
		t.Errorf("regular: %q", got)
	}
}
