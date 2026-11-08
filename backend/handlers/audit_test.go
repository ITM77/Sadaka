package handlers

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestSom(t *testing.T) {
	cases := map[string]string{
		"0":        "0 с.",
		"500":      "500 с.",
		"30000":    "30 000 с.",
		"1234567":  "1 234 567 с.",
		"29400.40": "29 400 с.",
		"-1500":    "-1 500 с.",
	}
	for in, want := range cases {
		if got := som(decimal.RequireFromString(in)); got != want {
			t.Errorf("som(%s) = %q, want %q", in, got, want)
		}
	}
}

func TestCsvSafe(t *testing.T) {
	cases := map[string]string{
		"":                     "",
		"Масҷиди Нур":          "Масҷиди Нур",
		"=HYPERLINK(\"x\")":    "'=HYPERLINK(\"x\")",
		"+992900000000":        "'+992900000000",
		"-1":                   "'-1",
		"@SUM(A1)":             "'@SUM(A1)",
		"Причина: =не формула": "Причина: =не формула",
	}
	for in, want := range cases {
		if got := csvSafe(in); got != want {
			t.Errorf("csvSafe(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestHashTokenStable(t *testing.T) {
	tok, hash, err := newInviteToken()
	if err != nil {
		t.Fatal(err)
	}
	if len(tok) != 64 || hashToken(tok) != hash || hash == tok {
		t.Fatalf("token %q hash %q", tok, hash)
	}
}
