package types

// QueueTask represents the structural schema pushed by Node.js
type QueueTask struct {
	BillID          string  `json:"billId"`
	InvoiceNumber   string  `json:"invoiceNumber"`
	CustomerPhone   string  `json:"customerPhone"`
	CustomerName    string  `json:"customerName"`
	CustomerEmail   string  `json:"customerEmail"`
	Total           float64 `json:"total"`
	ItemsSummary    string  `json:"itemsSummary"`
	PaymentMethod   string  `json:"paymentMethod"`
	CreatedAt       string  `json:"createdAt"`
	ShopName        string  `json:"shopName"`
	ShopDescription string  `json:"shopDescription"`
	ShopContact     string  `json:"shopContact"`
	RetryCount      int     `json:"retryCount,omitempty"`
}
