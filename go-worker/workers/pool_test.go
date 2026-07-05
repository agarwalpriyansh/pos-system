package workers

import (
	"context"
	"testing"

	"pos-whatsapp-worker/types"
)

type MockNotifier struct {
	Called bool
	NameVal string
}

func (m *MockNotifier) Send(ctx context.Context, task types.QueueTask) bool {
	m.Called = true
	return true
}

func (m *MockNotifier) Name() string {
	return m.NameVal
}

func TestNotifierMock(t *testing.T) {
	task := types.QueueTask{
		BillID:        "bill-123",
		CustomerName:  "John Doe",
		CustomerPhone: "+1234567890",
		Total:         150.75,
	}

	notifier := &MockNotifier{Called: false, NameVal: "MockNotifier"}
	
	ctx := context.TODO()
	success := notifier.Send(ctx, task)

	if !success {
		t.Errorf("Expected notifier Send to return true")
	}

	if !notifier.Called {
		t.Errorf("Expected notifier Send to have been called")
	}

	if notifier.Name() != "MockNotifier" {
		t.Errorf("Expected name to be MockNotifier, got %s", notifier.Name())
	}
}
