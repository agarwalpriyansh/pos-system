package templates

import (
	"fmt"
	"strings"

	"pos-whatsapp-worker/types"
	"pos-whatsapp-worker/utils"
)

func BuildWhatsAppMessage(task types.QueueTask) string {
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

	return fmt.Sprintf(
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
		utils.FormatDate(task.CreatedAt),
		task.PaymentMethod,
		task.CustomerName,
		task.CustomerPhone,
		utils.FormatWhatsAppItems(task.ItemsSummary),
		task.Total,
		task.Total,
		shopName,
	)
}
