package utils

import (
	"fmt"
	"strings"
)

type ValidationError struct {
	Field   string
	Message string
}

func ValidatePhoneNumber(phone string) error {
	// Таджикский номер: +992 или 0
	phone = strings.TrimSpace(phone)
	if !strings.HasPrefix(phone, "+992") && !strings.HasPrefix(phone, "0") {
		return fmt.Errorf("неверный формат номера телефона")
	}

	if len(phone) < 10 {
		return fmt.Errorf("номер телефона слишком короткий")
	}

	return nil
}

func ValidateEmail(email string) error {
	email = strings.TrimSpace(email)
	if !strings.Contains(email, "@") || !strings.Contains(email, ".") {
		return fmt.Errorf("неверный формат email")
	}
	return nil
}

func ValidatePassword(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("пароль должен быть минимум 8 символов")
	}
	if !strings.ContainsAny(password, "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
		return fmt.Errorf("пароль должен содержать хотя бы одну заглавную букву")
	}
	if !strings.ContainsAny(password, "0123456789") {
		return fmt.Errorf("пароль должен содержать хотя бы одну цифру")
	}
	return nil
}

func ValidateCampaignAmount(amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("сумма должна быть больше нуля")
	}
	if amount > 1000000 {
		return fmt.Errorf("сумма слишком большая")
	}
	return nil
}

func ValidateTransactionAmount(amount float64) error {
	if amount < 1 {
		return fmt.Errorf("минимальная сумма пожертвования: 1 TJS")
	}
	if amount > 100000 {
		return fmt.Errorf("максимальная сумма: 100000 TJS")
	}
	return nil
}
