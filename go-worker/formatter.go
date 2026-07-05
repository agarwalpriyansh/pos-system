package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Clean list delimiters to beautiful bold bulletins for WhatsApp formatting
func formatWhatsAppItems(summary string) string {
	if summary == "" {
		return ""
	}
	items := strings.Split(summary, ", ")
	var rows strings.Builder
	for _, item := range items {
		parts := strings.SplitN(item, " ", 2)
		if len(parts) < 2 {
			continue
		}
		qty := parts[0]
		rest := parts[1]
		
		var name string
		var price string
		
		idxOpen := strings.LastIndex(rest, "(")
		idxClose := strings.LastIndex(rest, ")")
		if idxOpen != -1 && idxClose != -1 && idxClose > idxOpen {
			name = strings.TrimSpace(rest[:idxOpen])
			price = rest[idxOpen+1 : idxClose]
		} else {
			name = rest
			price = ""
		}

		// Calculate total cost for the customer
		qtyStr := strings.TrimSuffix(qty, "x")
		qtyVal, err1 := strconv.ParseFloat(qtyStr, 64)

		priceStr := price
		priceStr = strings.ReplaceAll(priceStr, "₹", "")
		priceStr = strings.ReplaceAll(priceStr, " ", "")
		priceVal, err2 := strconv.ParseFloat(priceStr, 64)

		totalStr := price
		if err1 == nil && err2 == nil {
			totalStr = fmt.Sprintf("₹%.2f", qtyVal * priceVal)
		}
		
		rows.WriteString(fmt.Sprintf("*%s*                                   *%s*\n%s @ %s\n\n", name, totalStr, qty, price))
	}
	return strings.TrimSpace(rows.String())
}

// Clean list delimiters to beautiful bold bulletins for HTML layout
func formatHTMLItems(summary string) string {
	if summary == "" {
		return ""
	}
	items := strings.Split(summary, ", ")
	var rows strings.Builder
	for _, item := range items {
		parts := strings.SplitN(item, " ", 2)
		if len(parts) < 2 {
			continue
		}
		qty := parts[0]
		rest := parts[1]
		
		var name string
		var price string
		
		idxOpen := strings.LastIndex(rest, "(")
		idxClose := strings.LastIndex(rest, ")")
		if idxOpen != -1 && idxClose != -1 && idxClose > idxOpen {
			name = strings.TrimSpace(rest[:idxOpen])
			price = rest[idxOpen+1 : idxClose]
		} else {
			name = rest
			price = ""
		}

		// Calculate total cost for the customer
		qtyStr := strings.TrimSuffix(qty, "x")
		qtyVal, err1 := strconv.ParseFloat(qtyStr, 64)

		priceStr := price
		priceStr = strings.ReplaceAll(priceStr, "₹", "")
		priceStr = strings.ReplaceAll(priceStr, " ", "")
		priceVal, err2 := strconv.ParseFloat(priceStr, 64)

		totalStr := price
		if err1 == nil && err2 == nil {
			totalStr = fmt.Sprintf("₹%.2f", qtyVal * priceVal)
		}
		
		rows.WriteString(fmt.Sprintf(`
			<tr style="vertical-align: top;">
				<td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
					<span style="font-weight: 700; color: #1e293b; display: block; font-size: 13px;">%s</span>
					<span style="font-size: 10px; color: #64748b; font-weight: 600; display: block; margin-top: 2px;">%s @ %s</span>
				</td>
				<td style="text-align: right; padding: 10px 0; font-weight: 800; color: #1e293b; font-family: monospace; font-size: 13px; border-bottom: 1px solid #f1f5f9; white-space: nowrap; vertical-align: middle;">
					%s
				</td>
			</tr>`, name, qty, price, totalStr))
	}
	return rows.String()
}

// Formats UTC ISO-8601 string to beautiful IST format e.g. "01 Jun 2026, 12:27 am"
func formatDate(isoStr string) string {
	if isoStr == "" {
		return time.Now().Format("02 Jan 2006, 03:04 pm")
	}
	t, err := time.Parse(time.RFC3339, isoStr)
	if err != nil {
		return time.Now().Format("02 Jan 2006, 03:04 pm")
	}
	// Shift to IST (UTC +5:30)
	loc := time.FixedZone("IST", 5.5*60*60)
	tIST := t.In(loc)
	return tIST.Format("02 Jan 2006, 03:04 pm")
}
