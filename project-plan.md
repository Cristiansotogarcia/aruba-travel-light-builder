# Project Plan

## Phase 1: Core Booking System (MVP)

### User Authentication & Authorization
- [x] **Login/Signup:** Implement user registration and login functionality using Supabase Auth.
- [x] **Role-based Access Control:** Define and implement roles (Customer, Driver, Booker/Admin) with appropriate permissions.

### Equipment Management
- [x] **View Equipment:** Allow users to browse available equipment with details and images.
- [x] **Filter & Sort Equipment:** Implement filtering (by category, availability) and sorting (by price, popularity).
- [x] **Admin - Add/Edit/Delete Equipment:** CRUD operations for equipment in an admin interface.
- [x] **Sub-category Management:** Added new sub-categories for Beach and Baby equipment.

### Booking Flow
- [x] **Create Booking:** Allow customers to select equipment, dates, and create a booking.
- [x] **Booking Confirmation:** Display a confirmation page and send a confirmation email (basic, no fancy template yet).
- [x] **View Bookings (Customer):** Customers can see their current and past bookings.
- [x] **Admin - Manage Bookings:** Admins can view all bookings, update status (e.g., confirmed, out_for_delivery, completed, cancelled).

### Database & UI Integration
- [x] **Supabase Setup:** Ensure all necessary tables (users, equipment, bookings, booking_items) are correctly set up in Supabase.
- [x] **Type Safety:** Unify `Booking` and `BookingItem` types across the application.
- [x] **Form Submissions:** Ensure all forms (login, signup, booking, profile updates) submit data correctly to Supabase.
- [x] **Data Display:** Bookings and equipment data are correctly fetched and displayed in the UI.

## Phase 2: Dashboards & Operational Features

### Dashboards
- [x] **Driver Dashboard:** Develop a dashboard for drivers to view their assigned deliveries, update delivery statuses, and manage their schedule. (Ref: `old-dashboards.md` for DriverToday component)
- [x] **Booker Dashboard:** Create a dashboard for bookers/admins to manage bookings, view equipment availability, and oversee operations. (Ref: `old-dashboards.md` for BookerDashboard component)
- [x] **Customer Dashboard:** Implement a dashboard for customers to view their booking history, manage their profile, and track current rentals.

### Delivery Management (Driver)
- [x] **View Assigned Deliveries:** Drivers see a list of deliveries for the day/week.
- [x] **Update Delivery Status:** Mark deliveries as 'Out for Delivery', 'Delivered', 'Issue Reported'.
- [ ] **Route Optimization (Future):** Basic map integration to show delivery locations.

### Notifications (Basic)
- [x] **Booking Status Updates:** Email notifications for customers when booking status changes.
- [x] **New Delivery Assignment (Driver):** Email/In-app notification for drivers. (Note: Edge Function created; requires manual Supabase DB Trigger/Webhook setup by user for full functionality)

## Phase 3: Enhancements & Polish

### UI/UX Improvements
- [x] **Responsive Design:** Ensure the application is fully responsive across devices.
- [ ] **Improved Styling:** Enhance the visual appeal and user experience.
- [ ] **Loading States & Error Handling:** Implement comprehensive loading indicators and user-friendly error messages.

### Advanced Features
- [ ] **Payment Integration (Future):** Integrate a payment gateway.
- [ ] **Real-time Tracking (Future):** GPS tracking for deliveries.
- [ ] **Reviews & Ratings (Future):** Allow customers to rate equipment and service.

### Testing & Deployment
- [ ] **End-to-End Testing:** Thoroughly test all user flows.
- [ ] **Unit/Integration Tests:** Write tests for critical components and functions.
- [ ] **Deployment:** Prepare for deployment to a hosting platform.

## Known Issues / To-Do
- [ ] Review and unify all `TODO` comments in the codebase.
- [ ] Ensure consistent error handling and logging across the application.
- [ ] Optimize Supabase queries for performance.