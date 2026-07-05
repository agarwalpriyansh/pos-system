package workers

import (
	"context"
	"fmt"
	"log"
	"net/smtp"

	"pos-whatsapp-worker/config"
	"pos-whatsapp-worker/templates"
	"pos-whatsapp-worker/types"
)

type EmailNotifier struct {
	cfg config.Config
}

func NewEmailNotifier(cfg config.Config) *EmailNotifier {
	return &EmailNotifier{
		cfg: cfg,
	}
}

func (e *EmailNotifier) Name() string {
	return "Email"
}

func (e *EmailNotifier) Send(ctx context.Context, task types.QueueTask) bool {
	// Skip if no email provided
	if task.CustomerEmail == "" {
		log.Printf("[Email Handler] No email provided for customer %s. Skipping email dispatch.", task.CustomerName)
		return true
	}

	shopName := task.ShopName
	if shopName == "" {
		shopName = "DS DRYFRUITS"
	}

	subject := fmt.Sprintf("Invoice %s from %s", task.InvoiceNumber, shopName)
	fromHeader := fmt.Sprintf("\"%s\" <%s>", shopName, e.cfg.SMTPFromEmail)
	
	htmlBody := templates.BuildEmailHTML(task)

	if e.cfg.MockEmail {
		log.Printf("\n--- [MOCK EMAIL DISPATCH] ---\n"+
			"To: %s\n"+
			"Subject: %s\n"+
			"From: %s\n"+
			"HTML Body Preview:\n%s\n"+
			"--------------------------------",
			task.CustomerEmail, subject, fromHeader, htmlBody)
		return true
	}

	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	message := []byte(fmt.Sprintf("To: %s\nFrom: %s\nSubject: %s\n%s%s", 
		task.CustomerEmail, fromHeader, subject, mime, htmlBody))

	auth := smtp.PlainAuth("", e.cfg.SMTPUsername, e.cfg.SMTPPassword, e.cfg.SMTPHost)
	addr := fmt.Sprintf("%s:%d", e.cfg.SMTPHost, e.cfg.SMTPPort)

	// In production check if context is canceled
	if err := ctx.Err(); err != nil {
		log.Printf("[Email Handler] Context canceled before email dispatch.")
		return false
	}

	err := smtp.SendMail(addr, auth, e.cfg.SMTPFromEmail, []string{task.CustomerEmail}, message)
	if err != nil {
		log.Printf("[Email Handler] Failed to send email using smtp.SendMail: %v", err)
		return false
	}

	log.Printf("[Email Handler] Success: Invoice %s transmitted to email SMTP gateway.", task.InvoiceNumber)
	return true
}
