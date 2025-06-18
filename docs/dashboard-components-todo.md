# Dashboard Components To-Do

This document outlines the necessary components and features to be implemented for each user dashboard.

## 1. Admin Dashboard - Reports Section (`src/components/admin/ReportsDashboard.tsx`)

- [x] **Booking Trends Analysis Chart:** Visualize booking frequency, peak times, popular items (using Recharts). (Status: Done - Implemented in ReportsDashboard.tsx)
- [x] **Revenue Reports Chart:** Display total revenue, revenue by period, revenue by product (using Recharts). (Status: Done - Implemented in ReportsDashboard.tsx)
- [x] **Equipment Utilization Chart:** Show usage rates for equipment, identify underutilized/overutilized items (using Recharts). (Status: Done - basic chart with real-time updates)
- [x] Customer Activity Logs Table (Status: Done - Implemented in ReportsDashboard.tsx, shows booking creation and status changes):** Display a log of significant customer actions (e.g., new bookings, cancellations, profile updates).
- [x] **Data Filters:** Allow filtering reports by date range, product, customer, etc. (Status: Done - Implemented in ReportsDashboard.tsx)

## 2. Driver Dashboard (`src/pages/DriverDashboard.tsx`)

- [x] **Assigned Tasks List:** (Status: Done - Implemented in DriverDashboard.tsx)
    - Display a list of current delivery/pickup tasks.
    - Each task should show: Booking ID, Customer Name, Address, Time Slot, Status (e.g., Pending, In Progress, Completed, Failed).
    - Ability to update task status.
- [x] **Route Optimization/Map Display:** (Status: Map display implemented in DriverDashboard.tsx; Route optimization is a future consideration)
    - Show task locations on a map (e.g., using Leaflet or Google Maps API via an iframe or direct integration if feasible).
    - Potentially offer route optimization for multiple stops.
- [x] **Task Details View:** (Status: Done - Implemented in DriverDashboard.tsx)
    - Clickable tasks to show more details: contact info, specific items, delivery notes.
- [ ] **Communication Log (Optional - Future):**
    - Simple interface to log communication with customers or admin regarding a task.

## 3. Customer Dashboard (`src/pages/CustomerDashboard.tsx`)

- [x] **My Bookings Section:** (Status: Active/Past bookings list and basic details display implemented in CustomerDashboard.tsx)
    - **Active Bookings List:** Display current and upcoming bookings with details (Booking ID, Dates, Items, Status, Total Price).
    - **Past Bookings List:** Display completed or cancelled bookings.
    - **Booking Details View:** Allow viewing full details of a selected booking.
    - **Cancel Booking Functionality:** (If applicable, with appropriate RLS and logic).
- [x] **Profile Settings Section:** (Status: Done - Implemented in CustomerDashboard.tsx. Users can view and edit their profile (full name, phone, address) and request a password reset.)
    - **View Profile Form:** Display current user profile information (Name, Email, Phone, Address - if stored).
    - **Edit Profile Form:** Allow users to update their editable profile information.
    - **Password Change Option:** (If not handled by a global Supabase UI).
- [ ] **Quick Re-book (Optional - Future):**
    - Option to quickly re-book items from a past booking.