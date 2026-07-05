package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

// Notify backend of final delivery status of WhatsApp and Email
func updateBillStatus(cfg Config, client *http.Client, billID string, successWhatsApp bool, hasEmail bool, successEmail bool) {
	statusPayload := map[string]string{}
	
	if successWhatsApp {
		statusPayload["whatsappStatus"] = "Sent"
	} else {
		statusPayload["whatsappStatus"] = "Failed"
	}

	if hasEmail {
		if successEmail {
			statusPayload["emailStatus"] = "Sent"
		} else {
			statusPayload["emailStatus"] = "Failed"
		}
	}

	payloadBytes, err := json.Marshal(statusPayload)
	if err != nil {
		log.Printf("[Status Updater] Failed to marshal status payload: %v", err)
		return
	}

	url := fmt.Sprintf("%s/api/bills/%s/status", cfg.BackendURL, billID)
	req, err := http.NewRequest("PATCH", url, bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("[Status Updater] Failed to create PATCH request: %v", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Status Updater] Failed to execute PATCH request: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("[Status Updater] Backend rejected status update. Status: %d. Response: %s", resp.StatusCode, string(respBody))
		return
	}

	log.Printf("[Status Updater] Successfully updated DB status for Bill ID %s in backend.", billID)
}
