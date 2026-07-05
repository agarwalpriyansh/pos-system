package workers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"pos-whatsapp-worker/config"
	"pos-whatsapp-worker/templates"
	"pos-whatsapp-worker/types"
)

type WhatsAppNotifier struct {
	cfg    config.Config
	client *http.Client
}

func NewWhatsAppNotifier(cfg config.Config) *WhatsAppNotifier {
	return &WhatsAppNotifier{
		cfg:    cfg,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

func (w *WhatsAppNotifier) Name() string {
	return "WhatsApp"
}

func (w *WhatsAppNotifier) Send(ctx context.Context, task types.QueueTask) bool {
	messageText := templates.BuildWhatsAppMessage(task)

	toPhone := strings.TrimPrefix(task.CustomerPhone, "+")
	toPhone = strings.ReplaceAll(toPhone, " ", "")
	toPhone = strings.ReplaceAll(toPhone, "-", "")

	whatsappPayload := map[string]interface{}{
		"messaging_product": "whatsapp",
		"recipient_type":    "individual",
		"to":                toPhone,
		"type":              "text",
		"text": map[string]interface{}{
			"preview_url": false,
			"body":         messageText,
		},
	}

	payloadBytes, err := json.Marshal(whatsappPayload)
	if err != nil {
		log.Printf("[WhatsApp Handler] Marshalling JSON failed: %v", err)
		return false
	}

	if w.cfg.MockWhatsApp {
		log.Printf("\n--- [MOCK WHATSAPP DISPATCH] ---\n"+
			"To: %s\n"+
			"URL: %s/%s/messages\n"+
			"Authorization: Bearer [REDACTED]\n"+
			"Message Body:\n%s\n"+
			"--------------------------------",
			task.CustomerPhone, w.cfg.WhatsAppAPIURL, w.cfg.WhatsAppPhoneID, messageText)
		return true
	}

	url := fmt.Sprintf("%s/%s/messages", w.cfg.WhatsAppAPIURL, w.cfg.WhatsAppPhoneID)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("[WhatsApp Handler] Failed to create HTTP request: %v", err)
		return false
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+w.cfg.WhatsAppToken)

	resp, err := w.client.Do(req)
	if err != nil {
		log.Printf("[WhatsApp Handler] API Connection Error: %v", err)
		return false
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		log.Printf("[WhatsApp Handler] Meta API rejected request. Status: %d. Response: %s", 
			resp.StatusCode, string(respBody))
		return false
	}

	log.Printf("[WhatsApp Handler] Success: Invoice %s transmitted to Meta networks.", task.InvoiceNumber)
	return true
}
