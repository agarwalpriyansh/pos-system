package workers

import (
	"context"
	"pos-whatsapp-worker/types"
)

// Notifier represents an abstract receipt dispatch channel (DIP/OCP compliant)
type Notifier interface {
	Send(ctx context.Context, task types.QueueTask) bool
	Name() string
}
