package utils

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestNormalizePhone(t *testing.T) {
	ok := map[string]string{
		"+992901234567":     "+992901234567",
		"+992 90 123 45 67": "+992901234567",
		"992901234567":      "+992901234567",
		"901234567":         "+992901234567",
		"(90) 123-45-67":    "+992901234567",
	}
	for in, want := range ok {
		got, err := NormalizePhone(in)
		if err != nil || got != want {
			t.Errorf("NormalizePhone(%q) = %q, %v; want %q", in, got, err, want)
		}
	}
	for _, bad := range []string{"", "12345", "+7 900 123 45 67", "+9929012345678", "0901234567"} {
		if _, err := NormalizePhone(bad); err == nil {
			t.Errorf("NormalizePhone(%q): ожидали ошибку", bad)
		}
	}
}

func TestValidatePassword(t *testing.T) {
	if err := ValidatePassword("Salom2026"); err != nil {
		t.Errorf("хороший пароль отклонён: %v", err)
	}
	for _, bad := range []string{"short1", "onlyletters", "12345678"} {
		if ValidatePassword(bad) == nil {
			t.Errorf("ValidatePassword(%q): ожидали ошибку", bad)
		}
	}
}

func TestValidateDonationAmount(t *testing.T) {
	for _, s := range []string{"1", "50", "99.99", "100000"} {
		if err := ValidateDonationAmount(decimal.RequireFromString(s)); err != nil {
			t.Errorf("%s: %v", s, err)
		}
	}
	for _, s := range []string{"0", "-5", "0.5", "100000.01", "10.001"} {
		if ValidateDonationAmount(decimal.RequireFromString(s)) == nil {
			t.Errorf("%s: ожидали ошибку", s)
		}
	}
}
