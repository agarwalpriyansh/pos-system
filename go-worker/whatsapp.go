package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

// Formats receipt layout & executes WhatsApp API
func sendWhatsAppMessage(cfg Config, client *http.Client, task QueueTask) bool {
	// Fallback to defaults if shop metadata is missing
	shopName := task.ShopName
	if shopName == "" {
		shopName = "DS DRYFRUITS"
	}
	shopDesc := task.ShopDescription
	if shopDesc == "" {
		shopDesc = "A PREMIUM DRYFRUITS STORE"
	}
	shopContact := task.ShopContact
	if shopContact == "" {
		shopContact = "ds.dryfruits@gmail.com"
	}

	// 1. Format Beautiful UTF receipt summary matching the POS Receipt style
	messageText := fmt.Sprintf(
		"🏢 *%s*\n"+
		"*%s*\n"+
		"Contact: %s\n"+
		"------------------------------------------\n"+
		"*Invoice Number:* %s\n"+
		"*Date & Time:* %s\n"+
		"*Payment Method:* %s\n"+
		"*Customer Name:* %s\n"+
		"*WhatsApp Number:* %s\n"+
		"------------------------------------------\n"+
		"*ITEMIZED BREAKDOWN*\n\n"+
		"%s\n"+
		"------------------------------------------\n"+
		"*Subtotal Amount:* ₹%.2f\n"+
		"*Grand Total:* *₹%.2f*\n"+
		"------------------------------------------\n"+
		"Thank you for shopping with %s! Reply to this message if you have any questions.",
		strings.ToUpper(shopName),
		strings.ToUpper(shopDesc),
		shopContact,
		task.InvoiceNumber,
		formatDate(task.CreatedAt),
		task.PaymentMethod,
		task.CustomerName,
		task.CustomerPhone,
		formatWhatsAppItems(task.ItemsSummary),
		task.Total,
		task.Total,
		shopName,
	)

	// 2. Prepare HTTP Payload matching WhatsApp Cloud API Specification
	// (Using Custom Text Template message request format)
	// Sanitize phone number (Meta API expects digits only, e.g. 916376643123)
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

	if cfg.MockWhatsApp {
		// Log detailed receipt visualization to standard output
		log.Printf("\n--- [MOCK WHATSAPP DISPATCH] ---\n"+
			"To: %s\n"+
			"URL: %s/%s/messages\n"+
			"Authorization: Bearer [REDACTED]\n"+
			"Message Body:\n%s\n"+
			"--------------------------------",
			task.CustomerPhone, cfg.WhatsAppAPIURL, cfg.WhatsAppPhoneID, messageText)
		return true
	}

	// Make HTTP request to actual Meta endpoints
	url := fmt.Sprintf("%s/%s/messages", cfg.WhatsAppAPIURL, cfg.WhatsAppPhoneID)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("[WhatsApp Handler] Failed to create HTTP request: %v", err)
		return false
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+cfg.WhatsAppToken)

	resp, err := client.Do(req)
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
