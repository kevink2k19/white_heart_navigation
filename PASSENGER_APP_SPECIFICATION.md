# White Heart Passenger App - Development Specification

## Project Overview
**App Name:** White Heart  
**Package Name:** dgmm.white.heart.passenger  
**Platform:** React Native with Expo  
**Target Users:** Passengers seeking taxi/rideshare services  
**Development Status:** MVP Foundation Complete - Ready for Enhancement

---

## Current Implementation Status ✅

### Already Implemented Features:
1. ✅ Tab-based navigation (Book Ride, Trips, Profile, Settings)
2. ✅ "Pick a ride" primary CTA button
3. ✅ "Where to go" destination selection interface
4. ✅ Map placeholder with current location pin
5. ✅ Ride type selection modal (Economy, Premium, Shared, Luxury)
6. ✅ Fare estimation and breakdown display
7. ✅ Basic booking flow with animations
8. ✅ Trip history screen with completed rides
9. ✅ Driver rating system display
10. ✅ Recent destinations functionality

---

## Core Features Specification

### 1. Enhanced Map Integration 🚀
**Status:** Requires Implementation
- **Current:** Static map placeholder
- **Required:** Real-time interactive map
- **Implementation:**
  - Integrate `react-native-maps` or `expo-location`
  - Real-time GPS tracking
  - Interactive pickup location adjustment
  - Route visualization during ride
  - Driver location tracking with ETA updates

### 2. Advanced Location Services 🚀
**Status:** Requires Enhancement
- Address autocomplete with Google Places API
- Favorite locations management
- Recent destinations (partially implemented)
- Home/Work location shortcuts
- GPS-based automatic location detection

### 3. Real-time Driver Matching 🚀
**Status:** Requires Implementation
- **Features:**
  - Driver availability checking
  - Real-time matching algorithm
  - Driver profile display (photo, rating, vehicle info)
  - Live tracking during pickup and ride
  - ETA calculations and updates
  - Driver communication (call/message)

### 4. Payment System Integration 🚀
**Status:** Requires Implementation
- **Payment Methods:**
  - Credit/Debit cards (Stripe integration)
  - Digital wallets (Apple Pay, Google Pay)
  - Cash option
  - Ride credits/vouchers
- **Features:**
  - Secure payment processing
  - Automatic payment on ride completion
  - Receipt generation and email delivery
  - Payment history and management

### 5. Enhanced User Profile Management 🚀
**Status:** Requires Implementation (Profile tab exists but empty)
- Personal information management
- Profile photo upload
- Emergency contacts
- Payment method management
- Ride preferences
- Accessibility options
- Account security settings

### 6. Advanced Notifications System 🚀
**Status:** Requires Implementation
- Push notifications for:
  - Driver assigned/arrived
  - Ride status updates
  - Payment confirmations
  - Promotional offers
  - Safety alerts
- In-app notification center

### 7. Safety and Security Features 🚀
**Status:** Requires Implementation
- Emergency SOS button
- Trip sharing with contacts
- Safety center with resources
- Driver verification display
- Ride tracking for safety
- 24/7 support access

### 8. Ride Scheduling and Advanced Options 🚀
**Status:** Requires Implementation
- Schedule rides for later
- Recurring ride bookings
- Multiple stops functionality
- Group ride coordination
- Special requests (child seat, wheelchair accessibility)

---

## Technical Architecture

### Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  profile_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Locations Table
CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(20) CHECK (type IN ('home', 'work', 'favorite', 'recent')),
  name VARCHAR(100),
  address TEXT NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ride Requests Table
CREATE TABLE ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  pickup_address TEXT NOT NULL,
  pickup_latitude DECIMAL(10,8) NOT NULL,
  pickup_longitude DECIMAL(11,8) NOT NULL,
  destination_address TEXT NOT NULL,
  destination_latitude DECIMAL(10,8) NOT NULL,
  destination_longitude DECIMAL(11,8) NOT NULL,
  ride_type VARCHAR(20) NOT NULL,
  estimated_fare DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ,
  driver_id UUID,
  completed_at TIMESTAMPTZ
);

-- Payment Methods Table
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL,
  last_four VARCHAR(4),
  brand VARCHAR(20),
  is_default BOOLEAN DEFAULT FALSE,
  stripe_payment_method_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip History Table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id UUID REFERENCES ride_requests(id),
  user_id UUID REFERENCES users(id),
  driver_id UUID NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  fare DECIMAL(10,2) NOT NULL,
  distance_km DECIMAL(8,2),
  duration_minutes INTEGER,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  payment_method_id UUID REFERENCES payment_methods(id),
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### API Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh auth token

#### User Management
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `POST /user/upload-photo` - Upload profile photo
- `GET /user/locations` - Get saved locations
- `POST /user/locations` - Add new location

#### Ride Management
- `POST /rides/request` - Create ride request
- `GET /rides/estimate` - Get fare estimate
- `GET /rides/active` - Get active ride
- `PUT /rides/{id}/cancel` - Cancel ride
- `POST /rides/{id}/rating` - Rate completed ride
- `GET /rides/history` - Get ride history

#### Payment
- `GET /payment/methods` - Get payment methods
- `POST /payment/methods` - Add payment method
- `DELETE /payment/methods/{id}` - Remove payment method
- `POST /payment/process` - Process payment

#### Real-time WebSocket Events
- `driver_assigned` - Driver has been assigned
- `driver_location_update` - Driver location update
- `driver_arrived` - Driver has arrived at pickup
- `ride_started` - Ride has started
- `ride_completed` - Ride has been completed

---

## User Experience Flow

### Primary User Journey: Booking a Ride

1. **App Launch & Location**
   - User opens app → Current location detected
   - Map displays with user's position
   - Recent destinations shown

2. **Destination Selection**
   - User taps "Where to go?" → Text input appears
   - Address autocomplete suggestions → User selects destination
   - Route preview on map

3. **Ride Type Selection**
   - "Pick a ride" button → Ride options modal opens
   - User views available ride types with prices/ETAs
   - User selects preferred ride type

4. **Booking Confirmation**
   - Fare breakdown displayed → Payment method confirmed
   - "Book Ride" button → Ride request submitted
   - Loading state while matching driver

5. **Driver Assignment**
   - Driver found notification → Driver info displayed
   - Real-time tracking of driver approach
   - Communication options available

6. **During Ride**
   - Live route tracking → Trip progress updates
   - Safety features accessible
   - Estimated arrival time

7. **Ride Completion**
   - Automatic payment processing → Receipt generated
   - Rating driver prompt → Trip added to history
   - Return to home screen

---

## Integration Requirements

### Third-Party Services

1. **Maps & Location**
   - Google Maps Platform (Maps, Places, Directions)
   - Alternative: Apple Maps (iOS), OpenStreetMap

2. **Payment Processing**
   - Stripe for credit card processing
   - Apple Pay & Google Pay integration
   - PayPal integration (optional)

3. **Communication**
   - Twilio for SMS notifications
   - Firebase for push notifications
   - In-app calling system

4. **Backend Infrastructure**
   - Supabase for database and real-time features
   - WebSocket connections for live updates
   - Redis for caching and session management

5. **Analytics & Monitoring**
   - Firebase Analytics for user behavior
   - Sentry for error tracking
   - Custom analytics for business metrics

---

## Security & Authentication

### Authentication Protocol
- JWT-based authentication
- Refresh token rotation
- Biometric login support (Face ID/Touch ID)
- Two-factor authentication option

### Data Security
- End-to-end encryption for sensitive data
- PCI DSS compliance for payment data
- GDPR compliance for user data
- Regular security audits

### Privacy Features
- Location data encryption
- Trip history privacy controls
- Data retention policies
- User consent management

---

## Development Timeline & Milestones

### Phase 1: Core Enhancement (Weeks 1-4)
- ✅ **Week 1:** Profile screen implementation
- **Week 2:** Real map integration and location services
- **Week 3:** Payment system integration (Stripe)
- **Week 4:** Enhanced booking flow and validation

### Phase 2: Advanced Features (Weeks 5-8)
- **Week 5:** Real-time driver matching system
- **Week 6:** Push notifications and communication
- **Week 7:** Trip tracking and safety features
- **Week 8:** Testing and bug fixes

### Phase 3: Polish & Launch Preparation (Weeks 9-12)
- **Week 9:** UI/UX refinements and animations
- **Week 10:** Performance optimization
- **Week 11:** Security audit and compliance
- **Week 12:** Beta testing and final adjustments

### Phase 4: Advanced Features (Weeks 13-16)
- **Week 13:** Ride scheduling functionality
- **Week 14:** Advanced safety features
- **Week 15:** Analytics and business intelligence
- **Week 16:** App store submission and launch

---

## Key Performance Indicators (KPIs)

### User Experience Metrics
- Booking completion rate: >95%
- Average booking time: <60 seconds
- User retention rate: >70% after 30 days
- App crash rate: <0.1%

### Business Metrics
- Driver matching success rate: >98%
- Average wait time: <5 minutes
- Payment success rate: >99%
- User satisfaction rating: >4.5/5

---

## Next Immediate Actions

Based on the current implementation, the next priority tasks are:

1. **Complete Profile Screen** (High Priority)
   - Implement user profile management
   - Add photo upload functionality
   - Payment methods management

2. **Integrate Real Maps** (High Priority)
   - Replace map placeholder with interactive map
   - Implement location services
   - Add route visualization

3. **Payment Integration** (High Priority)
   - Set up Stripe integration
   - Implement secure payment flow
   - Add receipt generation

4. **Backend Setup** (Medium Priority)
   - Set up Supabase database with schema
   - Create API endpoints
   - Implement real-time features

5. **Push Notifications** (Medium Priority)
   - Configure Firebase messaging
   - Implement notification handling
   - Create notification center

This specification provides a comprehensive roadmap for developing the White Heart passenger app into a production-ready taxi booking platform. The current foundation is solid and can be systematically enhanced following this plan.