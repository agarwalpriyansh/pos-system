package templates

import (
	"fmt"
	"strings"

	"pos-whatsapp-worker/types"
	"pos-whatsapp-worker/utils"
)

func BuildEmailHTML(task types.QueueTask) string {
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

	return fmt.Sprintf(`<!DOCTYPE html>
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
		utils.FormatDate(task.CreatedAt),
		task.PaymentMethod,
		task.CustomerName,
		task.CustomerPhone,
		utils.FormatHTMLItems(task.ItemsSummary),
		task.Total,
		task.Total,
		shopName,
	)
}
