package utils

import (
	"errors"
	"net/mail"
	"strings"
	"unicode"

	"github.com/shopspring/decimal"
)

// NormalizePhone приводит таджикский номер к виду +992XXXXXXXXX.
// Принимает «+992 90 123 45 67», «992901234567», «901234567».
func NormalizePhone(raw string) (string, error) {
	var digits strings.Builder
	for _, r := range raw {
		if unicode.IsDigit(r) {
			digits.WriteRune(r)
		}
	}
	d := digits.String()
	switch {
	case len(d) == 12 && strings.HasPrefix(d, "992"):
		d = d[3:]
	case len(d) == 9:
	default:
		return "", errors.New("номер телефона должен быть в формате +992XXXXXXXXX")
	}
	return "+992" + d, nil
}

func ValidateEmail(email string) error {
	addr, err := mail.ParseAddress(strings.TrimSpace(email))
	if err != nil || addr.Address != strings.TrimSpace(email) {
		return errors.New("неверный формат email")
	}
	return nil
}

func ValidatePassword(password string) error {
	if len(password) < 8 {
		return errors.New("пароль должен быть не короче 8 символов")
	}
	if len(password) > 72 {
		return errors.New("пароль слишком длинный (максимум 72 байта)")
	}
	var hasLetter, hasDigit bool
	for _, r := range password {
		if unicode.IsLetter(r) {
			hasLetter = true
		}
		if unicode.IsDigit(r) {
			hasDigit = true
		}
	}
	if !hasLetter || !hasDigit {
		return errors.New("пароль должен содержать буквы и цифры")
	}
	return nil
}

var (
	minDonation = decimal.NewFromInt(1)
	maxDonation = decimal.NewFromInt(100_000)
	maxGoal     = decimal.NewFromInt(100_000_000)
)

// ValidateMoney: сумма положительна и не больше 2 знаков после запятой (дирамы).
func ValidateMoney(amount decimal.Decimal) error {
	if !amount.IsPositive() {
		return errors.New("сумма должна быть больше нуля")
	}
	if !amount.Equal(amount.Round(2)) {
		return errors.New("сумма может содержать не больше 2 знаков после запятой")
	}
	return nil
}

func ValidateDonationAmount(amount decimal.Decimal) error {
	if err := ValidateMoney(amount); err != nil {
		return err
	}
	if amount.LessThan(minDonation) {
		return errors.New("минимальная сумма пожертвования — 1 TJS")
	}
	if amount.GreaterThan(maxDonation) {
		return errors.New("максимальная сумма пожертвования — 100 000 TJS")
	}
	return nil
}

func ValidateGoalAmount(amount decimal.Decimal) error {
	if err := ValidateMoney(amount); err != nil {
		return err
	}
	if amount.GreaterThan(maxGoal) {
		return errors.New("целевая сумма слишком большая")
	}
	return nil
}
