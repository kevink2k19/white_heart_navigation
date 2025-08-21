# Order Management System - Technical Specification

## Overview
This document outlines the implementation of two critical features for the ride-sharing application:
1. **Multiple Active Orders Prevention**
2. **Order Cancellation System**

---

## Feature 1: Prevent Multiple Active Orders

### Business Requirements
- Drivers can only have ONE active order at any given time
- Active orders include statuses: `accepted`, `in_progress`, `en_route`
- Users must complete current orders before accepting new ones
- Clear messaging when attempting to accept multiple orders

### Technical Implementation

#### 1. Order Status Management
```typescript
type OrderStatus = 'pending' | 'accepted' | 'in_progress' | 'en_route' | 'completed' | 'cancelled' | 'declined' | 'sent_to_group';

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['accepted', 'in_progress', 'en_route'];
```

#### 2. Active Order Tracking
```typescript
const [activeOrders, setActiveOrders] = useState<PassengerOrder[]>([]);
const [hasActiveOrder, setHasActiveOrder] = useState(false);

const checkActiveOrders = () => {
  const activeOrdersList = orders.filter(order => ACTIVE_ORDER_STATUSES.includes(order.status));
  setActiveOrders(activeOrdersList);
  setHasActiveOrder(activeOrdersList.length > 0);
};
```

#### 3. Accept Button Logic
- **Disabled State**: Accept button becomes disabled when user has active order
- **Visual Feedback**: Button shows "(Active Order)" text and gray color
- **Warning Message**: Yellow warning banner appears on pending orders

#### 4. User Experience Flow
1. User accepts first order → Status becomes "accepted"
2. All other "Accept" buttons become disabled
3. Warning message appears: "Complete your current order before accepting new ones"
4. Header shows active order count indicator
5. User must complete/cancel current order to accept new ones

---

## Feature 2: Order Cancellation System

### Business Requirements
- Cancel button appears ONLY for orders with "accepted" status
- Button disappears once trip starts (status changes to "in_progress")
- Confirmation dialog prevents accidental cancellations
- Order status updates to "cancelled" upon confirmation
- Appropriate notifications for all parties

### Technical Implementation

#### 1. Cancel Button Visibility Logic
```typescript
const isAccepted = order.status === 'accepted';
const showCancelButton = isAccepted && !isLoading;
```

#### 2. Cancellation Flow
```typescript
const handleCancelOrder = (orderId: string) => {
  Alert.alert(
    'Cancel Order',
    'Are you sure you want to cancel this order? This action cannot be undone.',
    [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel Order', style: 'destructive', onPress: () => confirmCancelOrder(orderId) }
    ]
  );
};
```

#### 3. Order Status Update
- Updates order status from "accepted" → "cancelled"
- Clears visibility timers
- Shows success confirmation
- Updates UI to reflect cancelled state

#### 4. Navigation Page Integration
- Cancel button appears before trip start
- Enhanced confirmation with rating warning
- Cancelled banner appears after cancellation
- Automatic redirect to orders list

---

## Database Schema Updates

### Orders Table Modifications
```sql
-- Add cancelled status to existing enum
ALTER TYPE order_status ADD VALUE 'cancelled';

-- Add cancellation tracking fields
ALTER TABLE ride_requests ADD COLUMN cancelled_at TIMESTAMPTZ;
ALTER TABLE ride_requests ADD COLUMN cancelled_by UUID REFERENCES users(id);
ALTER TABLE ride_requests ADD COLUMN cancellation_reason TEXT;

-- Add index for active orders query optimization
CREATE INDEX idx_ride_requests_active_status ON ride_requests(status) 
WHERE status IN ('accepted', 'in_progress', 'en_route');
```

### Driver Status Table (New)
```sql
CREATE TABLE driver_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES users(id) UNIQUE,
  current_order_id UUID REFERENCES ride_requests(id),
  status VARCHAR(20) DEFAULT 'available',
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

### 1. Check Active Orders
```typescript
GET /api/orders/active
Response: {
  hasActiveOrder: boolean,
  activeOrders: Order[],
  count: number
}
```

### 2. Accept Order (Enhanced)
```typescript
POST /api/orders/{orderId}/accept
Validation: Check for existing active orders
Response: {
  success: boolean,
  message: string,
  activeOrderConflict?: boolean
}
```

### 3. Cancel Order
```typescript
POST /api/orders/{orderId}/cancel
Body: {
  reason?: string,
  cancelledBy: string
}
Response: {
  success: boolean,
  message: string,
  updatedOrder: Order
}
```

---

## Error Handling

### Frontend Validation
```typescript
// Network connectivity check
const handleNetworkError = (error: Error) => {
  if (error.message.includes('Network')) {
    Alert.alert('Connection Issue', 'Please check your internet connection and try again.');
  }
};

// Order state validation
const validateOrderAction = (orderId: string, action: string) => {
  const order = orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');
  if (action === 'accept' && hasActiveOrder) throw new Error('Active order exists');
};
```

### Backend Validation
```typescript
// Prevent race conditions
const acceptOrder = async (orderId: string, driverId: string) => {
  const transaction = await db.beginTransaction();
  try {
    // Check for existing active orders
    const activeOrders = await db.query(
      'SELECT id FROM ride_requests WHERE driver_id = $1 AND status IN ($2, $3, $4)',
      [driverId, 'accepted', 'in_progress', 'en_route']
    );
    
    if (activeOrders.length > 0) {
      throw new Error('Driver already has active order');
    }
    
    // Update order status
    await db.query('UPDATE ride_requests SET status = $1, driver_id = $2 WHERE id = $3', 
      ['accepted', driverId, orderId]);
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

---

## Testing Strategy

### Unit Tests
- Order status validation logic
- Active order detection
- Cancel button visibility rules
- Confirmation dialog behavior

### Integration Tests
- Accept order with existing active order
- Cancel order flow end-to-end
- Database consistency after cancellation
- Network failure scenarios

### Edge Cases
- Multiple rapid accept attempts
- Network disconnection during cancellation
- Order status changes during user interaction
- Concurrent order modifications

---

## Performance Considerations

### Frontend Optimizations
- Memoized active order calculations
- Debounced status updates
- Efficient re-rendering with React.memo
- Optimistic UI updates

### Backend Optimizations
- Database indexes on status fields
- Connection pooling for high concurrency
- Caching of active order counts
- Batch status updates

---

## Security Measures

### Authorization
- Verify driver ownership of orders
- Validate order status transitions
- Rate limiting on cancel actions
- Audit logging for cancellations

### Data Integrity
- Transaction-based status updates
- Optimistic locking for order modifications
- Validation of business rules
- Rollback mechanisms for failures

---

## Monitoring & Analytics

### Key Metrics
- Active order acceptance rate
- Order cancellation frequency
- Time between accept and trip start
- Multiple accept attempt frequency

### Alerts
- High cancellation rates
- Multiple active order violations
- Failed order status updates
- Network connectivity issues

This implementation provides a robust, user-friendly system for managing multiple orders and cancellations while maintaining data integrity and optimal user experience.