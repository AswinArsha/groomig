# Grooming - Pet Grooming Management System

A modern web application for managing pet grooming appointments and services. Built with React and Supabase for real-time booking management.

## Features

### 🐕 Booking Management
- Create and manage pet grooming appointments
- Real-time booking updates
- Detailed booking information tracking:
  - Customer details
  - Pet information (name, breed)
  - Service selection
  - Time slot management
  - Booking status tracking

### 💅 Service Management
- Customizable grooming services
- Service type categorization
- Price management
- Special service input options

### ⏰ Time Slot Management
- Flexible scheduling system
- Sub-time slots for better time management
- Real-time availability updates

### 💳 Billing
- Automated bill calculation
- Service-based pricing
- Detailed billing summaries
- Print options for both customer and groomer copies

### 📱 User Interface
- Modern, responsive design
- Intuitive navigation with sidebar
- Progress tracking for bookings
- Real-time status updates
- Interactive calendar for date selection

### 🔐 Authentication & Security
- Secure user authentication
- Protected routes
- Role-based access control

## Tech Stack

- **Frontend**: React.js
- **State Management**: React Hooks
- **Database & Backend**: Supabase
- **UI Components**: 
  - Radix UI
  - Framer Motion for animations
  - Shadcn UI components
- **Date/Time**: Date-fns
- **Notifications**: Toast notifications

## Key Components

### Booking System
- Complete booking lifecycle management
- Status tracking (check-in, progressing, completed)
- Service selection and customization
- Real-time updates through Supabase subscriptions

### Service Management
- Add and manage grooming services
- Customize service types and pricing
- Input-based service options

### Billing System
- Automatic total calculation
- Service itemization
- Printable bills (customer and groomer copies)

## Getting Started

1. Clone the repository
```bash
git clone https://github.com/AswinArsha/groomig.git
```

2. Install dependencies
```bash
cd groomig
npm install
```

3. Set up Supabase
   - Create a Supabase project
   - Configure environment variables
   - Set up authentication and database tables

4. Start the development server
```bash
npm run dev
```
