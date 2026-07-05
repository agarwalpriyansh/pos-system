package main

import (
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

// Formats HTML email receipt layout & executes SMTP transmission
func sendEmailMessage(cfg Config, task QueueTask) bool {
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

	subject := fmt.Sprintf("Invoice %s from %s", task.InvoiceNumber, shopName)
	fromHeader := fmt.Sprintf("\"%s\" <%s>", shopName, cfg.SMTPFromEmail)
	
	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s Invoice</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 550px; margin: 20px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; padding: 24px;">
        
        <!-- Header -->
        <div style="text-align: center; padding-bottom: 16px; border-bottom: 1px dashed #cbd5e1; margin-bottom: 16px;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 950; color: #1e293b; letter-spacing: 0.1em; text-transform: uppercase;">%s</h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">%s</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #94a3b8;">Contact: %s</p>
        </div>
        
        <!-- Metadata -->
        <div style="padding-bottom: 16px; border-bottom: 1px dashed #cbd5e1; margin-bottom: 16px; font-size: 13px; line-height: 1.8; color: #475569;">
            <table style="width: 100%%; border-collapse: collapse;">
                <tr>
                    <td style="color: #64748b; font-weight: 600;">Invoice Number:</td>
                    <td style="text-align: right; font-weight: 800; color: #0f172a; font-family: monospace;">%s</td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-weight: 600;">Date & Time:</td>
                    <td style="text-align: right; font-weight: 700; color: #0f172a; white-space: nowrap;">%s</td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-weight: 600;">Payment Method:</td>
                    <td style="text-align: right; font-weight: 700; color: #0f172a;">%s</td>
                </tr>
                <tr style="height: 8px;"><td></td><td></td></tr>
                <tr>
                    <td style="color: #64748b; font-weight: 600;">Customer Name:</td>
                    <td style="text-align: right; font-weight: 700; color: #0f172a;">%s</td>
                </tr>
                <tr>
                    <td style="color: #64748b; font-weight: 600;">WhatsApp Number:</td>
                    <td style="text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">%s</td>
                </tr>
            </table>
        </div>
        
        <!-- Itemized Breakdown -->
        <div style="padding-bottom: 16px; border-bottom: 1px dashed #cbd5e1; margin-bottom: 16px;">
            <h3 style="margin: 0 0 12px 0; font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">ITEMIZED BREAKDOWN</h3>
            <table style="width: 100%%; border-collapse: collapse;">
                %s
            </table>
        </div>
        
        <!-- Totals -->
        <div style="font-size: 13px; line-height: 1.8; color: #475569;">
            <table style="width: 100%%; border-collapse: collapse;">
                <tr>
                    <td style="color: #64748b; font-weight: 600;">Subtotal Amount:</td>
                    <td style="text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">₹%.2f</td>
                </tr>
                <tr style="height: 8px;"><td></td><td></td></tr>
                <tr style="border-top: 1px solid #f1f5f9; padding-top: 8px;">
                    <td style="font-size: 15px; font-weight: 900; color: #0f172a; padding-top: 8px;">Grand Total:</td>
                    <td style="text-align: right; font-size: 18px; font-weight: 900; color: #10b981; font-family: monospace; padding-top: 8px;">₹%.2f</td>
                </tr>
            </table>
        </div>
 
        <!-- Footer -->
        <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8; font-weight: 600;">Thank you for shopping with %s!</p>
        </div>
    </div>
</body>
</html>`,
		shopName,
		strings.ToUpper(shopName),
		strings.ToUpper(shopDesc),
		shopContact,
		task.InvoiceNumber,
		formatDate(task.CreatedAt),
		task.PaymentMethod,
		task.CustomerName,
		task.CustomerPhone,
		formatHTMLItems(task.ItemsSummary),
		task.Total,
		task.Total,
		shopName,
	)

	if cfg.MockEmail {
		// Log detailed receipt visualization to standard output
		log.Printf("\n--- [MOCK EMAIL DISPATCH] ---\n"+
			"To: %s\n"+
			"Subject: %s\n"+
			"From: %s\n"+
			"HTML Body Preview:\n%s\n"+
			"--------------------------------",
			task.CustomerEmail, subject, fromHeader, htmlBody)
		return true
	}

	// Build MIME message for HTML email
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	message := []byte(fmt.Sprintf("To: %s\nFrom: %s\nSubject: %s\n%s%s", 
		task.CustomerEmail, fromHeader, subject, mime, htmlBody))

	// Connect and send using SMTP
	auth := smtp.PlainAuth("", cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPHost)
	addr := fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort)

	// Since Go's smtp.SendMail handles STARTTLS automatically when port 587 is used
	err := smtp.SendMail(addr, auth, cfg.SMTPFromEmail, []string{task.CustomerEmail}, message)
	if err != nil {
		log.Printf("[Email Handler] Failed to send email using smtp.SendMail: %v", err)
		return false
	}

	log.Printf("[Email Handler] Success: Invoice %s transmitted to email SMTP gateway.", task.InvoiceNumber)
	return true
}
