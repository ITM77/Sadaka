package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Субъекты токена.
const (
	SubjectUser  = "user"  // жертвователь / представитель мечети
	SubjectAdmin = "admin" // сотрудник Комитета улемов
)

const tokenTTL = 7 * 24 * time.Hour

// AdminTokenTTL — сессия сотрудника Комитета короче: рабочий день, потом вход заново.
const AdminTokenTTL = 12 * time.Hour

type Claims struct {
	Kind      string `json:"kind"`                 // SubjectUser | SubjectAdmin
	AdminRole string `json:"admin_role,omitempty"` // только для админов
	jwt.RegisteredClaims
}

func (c *Claims) AccountID() (uuid.UUID, error) { return uuid.Parse(c.Subject) }

func IssueToken(secret string, id uuid.UUID, kind, adminRole string) (string, error) {
	now := time.Now()
	ttl := tokenTTL
	if kind == SubjectAdmin {
		ttl = AdminTokenTTL
	}
	claims := Claims{
		Kind:      kind,
		AdminRole: adminRole,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   id.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    "sadaka",
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}

func ParseToken(secret, token string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(token, claims, func(*jwt.Token) (any, error) {
		return []byte(secret), nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithIssuer("sadaka"))
	if err != nil {
		return nil, err
	}
	if claims.Kind != SubjectUser && claims.Kind != SubjectAdmin {
		return nil, errors.New("неизвестный тип токена")
	}
	return claims, nil
}
