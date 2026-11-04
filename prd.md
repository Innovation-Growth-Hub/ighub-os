# IGHUB OS - Product Requirements Document (PRD)

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [Core Features](#core-features)
6. [User Roles & Permissions](#user-roles--permissions)
7. [Module Breakdown](#module-breakdown)
8. [Database Schema](#database-schema)
9. [UI/UX Guidelines](#uiux-guidelines)
10. [Development Setup](#development-setup)
11. [API Documentation](#api-documentation)
12. [Deployment](#deployment)
13. [Contributing Guidelines](#contributing-guidelines)
14. [Roadmap](#roadmap)

---

## 1. Executive Summary

**Product Name:** IGHUB OS  
**Version:** 1.0.0  
**Organization:** Innovation Growth Hub Abia (IGHub)  
**Location:** Abia State, Nigeria  
**Type:** Enterprise Resource Planning (ERP) System

IGHUB OS is a comprehensive management system designed specifically for tech hubs, innovation centers, and co-working spaces. It streamlines operations including staff management, attendance tracking, project management, client relationships, learning management, and financial operations.

### Key Objectives
- Centralize all operations in one platform
- Automate attendance tracking with QR code system
- Provide role-based access control for different user types
- Enable data-driven decision making through analytics
- Facilitate project and client management
- Support training programs and educational initiatives

---

## 2. Product Overview

### 2.1 Problem Statement
It's challenging managing multiple operational aspects including:
- Staff attendance and productivity tracking
- Client and project management
- Financial operations and reporting
- Training program coordination
- Social media presence
- Document management

### 2.2 Solution
IGHUB OS provides a unified platform that addresses these challenges through:
- Automated attendance system using QR codes
- Comprehensive dashboard with real-time insights
- Role-based access for different stakeholders
- Integrated financial tracking
- Client relationship management (CRM)
- Learning Management System (LMS)
- AI-powered insights and recommendations

### 2.3 Target Users
1. **Super Admin** - Full system access
2. **Admin** - Operational management
3. **Staff** - Team members and employees
4. **Trainers** - Training program instructors
5. **Students** - Program participants
6. **Clients** - Business partners and customers
7. **Project Managers** - Project coordinators
8. **Social Media Managers** - Content managers

---

## 3. Tech Stack

### 3.1 Backend
- **Framework:** Laravel 12.x (PHP 8.2+)
- **Database:** MySQL/PostgreSQL
- **Authentication:** Laravel Sanctum
- **Authorization:** Spatie Laravel Permission
- **API:** RESTful with Inertia.js

### 3.2 Frontend
- **Framework:** Vue.js 3.5
- **Routing:** Vue Router 4.0
- **State Management:** Composition API
- **UI Library:** Tailwind CSS 4.0
- **Components:** 
  - Headless UI
  - Heroicons
  - Flowbite Vue
- **Charts:** ApexCharts + Vue3-ApexCharts
- **Forms:** VeeValidate + Yup
- **Notifications:** Vue Toastification

### 3.3 Development Tools
- **Build Tool:** Vite 6.0
- **Server-Side Rendering:** Inertia.js 2.0
- **Package Manager:** npm/Composer
- **Version Control:** Git
- **Code Quality:** Laravel Pint

### 3.4 Additional Libraries
- **QR Code:** SimpleSoftwareIO/simple-qrcode, qrcode.vue
- **Real-time:** Laravel Echo + Pusher
- **HTTP Client:** Axios
- **Routing Helper:** Ziggy (Laravel routes in JavaScript)

---

## 4. System Architecture

### 4.1 Architecture Pattern
- **Backend:** MVC (Model-View-Controller)
- **Frontend:** Component-based SPA (Single Page Application)
- **Communication:** Inertia.js (eliminates need for separate API layer)

### 4.2 Directory Structure
```
ighubstart/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Admin/          # Admin-specific controllers
│   │   │   ├── Auth/           # Authentication
│   │   │   ├── Client/         # Client portal
│   │   │   └── Staff/          # Staff features
│   │   └── Middleware/
│   ├── Models/                 # Eloquent models
│   └── Providers/
├── database/
│   ├── migrations/             # Database schema
│   ├── seeders/                # Sample data
│   └── factories/
├── resources/
│   ├── js/
│   │   ├── Components/         # Reusable Vue components
│   │   ├── Layouts/            # Page layouts
│   │   ├── Pages/              # Page components
│   │   │   ├── Admin/
│   │   │   ├── Auth/
│   │   │   ├── Client/
│   │   │   └── Staff/
│   │   └── app.js
│   └── css/
├── routes/
│   └── web.php                 # Route definitions
└── public/                     # Public assets
```

---

## 5. Core Features

### 5.1 Authentication & Authorization
- User registration and login
- Role-based access control (RBAC)
- Permission management
- Session management
- Logout functionality with profile dropdown

### 5.2 Dashboard
- Role-specific dashboards
- Real-time metrics and KPIs
- Calendar with event management
- Schedule overview
- Recent activity feed
- Time-based greetings (Morning/Afternoon/Evening)

### 5.3 Staff Management
- Employee CRUD operations
- Staff types: Core Team, Corper, Intern
- Profile management
- Performance tracking
- Penalty system

### 5.4 Attendance System
- QR code-based clock in/out
- Office location tracking
- Attendance status (On-time, Late, Absent)
- Late request submission and approval
- Weekly attendance reports
- Automated penalty calculation (₦5,000 for 3+ late days)

### 5.5 Task Management
- Task creation and assignment
- Status tracking (Pending, In Progress, Complete)
- Task board view
- Due date management
- Priority levels

### 5.6 Project Management
- Project CRUD operations
- Milestone tracking
- Budget management
- Client assignment
- Team member assignment
- Project timeline

### 5.7 CRM (Client Relationship Management)
- Contact management
- Pipeline stages
- Deal tracking
- Communication history
- Client portal access

### 5.8 Learning Management System (LMS)
- Course creation and management
- Lesson organization
- Student enrollment
- Progress tracking
- Trainer assignment

### 5.9 Financial Management
- Income tracking (₦8.4M revenue example)
- Expense recording (₦3.2M expenses example)
- Revenue sources breakdown
- Invoice generation
- Payment tracking
- Financial reports and analytics

### 5.10 Document Management
- Document upload and categorization
- Categories: Contracts, Proposals, Reports, Training
- Version control
- Sharing and permissions
- Search functionality

### 5.11 Meeting Management
- Meeting scheduling
- Participant management
- Agenda setting
- Status tracking
- Calendar integration

### 5.12 Social Media Management
- Multi-account support
- Post scheduling
- Content calendar
- Analytics tracking

### 5.13 Analytics & Reporting
- Attendance reports
- Team performance metrics
- Financial analytics
- Custom report generation
- Data export

### 5.14 AI Insights
- Growth recommendations
- Predictive analytics
- Training document analysis
- Performance insights

---

## 6. User Roles & Permissions

### 6.1 Super Admin
**Permissions:**
- Full system access
- All CRUD operations
- System configuration
- User role management
- Data backup and restore

### 6.2 Admin
**Permissions:**
- View/manage users
- View/manage attendance
- Approve late requests
- View/create/edit/delete tasks
- View/manage reports
- View/create/edit projects
- View project financials
- View/manage income and expenses

### 6.3 Staff
**Permissions:**
- Clock in/out
- Create late requests
- View own tasks
- Update task status
- Create daily reports
- View assigned projects

### 6.4 Client
**Permissions:**
- View own projects
- View project progress
- Access client portal

### 6.5 Trainer
**Permissions:**
- Manage courses
- Track student progress
- Grade assessments

### 6.6 Student
**Permissions:**
- Access enrolled courses
- Submit assignments
- View grades

---

## 7. Module Breakdown

### 7.1 Dashboard Module
**Location:** `resources/js/Pages/Dashboard.vue`, `Admin/Dashboard.vue`

**Features:**
- Metrics cards 
- Interactive calendar 
- Schedule management 
- Task list with tags
- Recent activities timeline
- Team performance charts
- Employee satisfaction gauge (73%)
- Attendance heatmap
- Employee attendance table

**Data Displayed:**
- Real-time date/time 
- IGHub staff
- Recent activities with timestamps
- Satisfaction metrics 

### 7.2 Staff Management Module
**Location:** `Admin/Staff/`

**Features:**
- Staff listing with filters
- Add new staff member
- Edit staff details
- View staff profile
- Delete staff
- Filter by staff type
- Search functionality

**Staff Types:**
- Core Team
- Corper (NYSC)
- Intern

### 7.3 Attendance Module
**Location:** `AttendanceController.php`

**Features:**
- QR code generation for offices
- Clock in with QR scan
- Clock out functionality
- Attendance history
- Status tracking
- Location verification

**Penalties:**
- 3+ late days in a week = ₦5,000 penalty

### 7.4 Projects Module
**Location:** `Admin/Projects/`

**Features:**
- Project creation
- Milestone management
- Budget tracking
- Team assignment
- Client linking
- Progress monitoring
- Financial summary

### 7.5 CRM Module
**Location:** `Admin/Crm/`

**Features:**
- Contact database
- Pipeline management
- Deal stages
- Communication logs
- Client segmentation

### 7.6 LMS Module
**Location:** `Admin/Lms/`

**Features:**
- Course builder
- Lesson management
- Student enrollment
- Progress tracking
- Assignments and grading

### 7.7 Finance Module
**Location:** `Admin/Finance.vue`

**Features:**
- Revenue dashboard (₦8.4M)
- Expense tracking (₦3.2M)
- Net profit calculation (₦5.2M, 62% margin)
- Revenue sources:
  - Training Programs: 38%
  - Web Development: 33%
  - Consulting: 19%
  - Other Services: 10%
- Transaction history
- Invoice management
- Payment tracking

### 7.8 Documents Module
**Location:** `Admin/Documents.vue`

**Features:**
- Document categories (Contracts, Proposals, Reports, Training)
- Upload interface
- Search and filter
- Sharing controls
- Recent documents view
- Sample documents:
  - VFD Bank API Agreement
  - Kids Code Camp Curriculum
  - Q1 2026 Financial Report
  - Tech Hub Expansion Proposal

### 7.9 Meetings Module
**Location:** `Admin/Meetings/`

**Features:**
- Meeting scheduler
- Participant invitation
- Agenda builder
- Status updates
- Calendar view
- Reminder notifications

### 7.10 Social Media Module
**Location:** `Admin/Social/`

**Features:**
- Multi-platform support
- Content scheduling
- Post analytics
- Account management

---

## 8. Database Schema

### 8.1 Core Tables

#### users
- id, name, email, password
- office_location
- is_active
- roles (via Spatie)
- timestamps

#### attendances
- id, user_id
- date
- clock_in_time, clock_out_time
- office_location
- status (on_time, late, absent)
- timestamps

#### penalties
- id, user_id
- amount (default: 5000.00)
- reason
- week_start_date, week_end_date
- late_count
- timestamps

#### late_requests
- id, user_id
- date, reason
- status (pending, approved, rejected)
- timestamps

#### tasks
- id, title, description
- assigned_to, created_by
- due_date, priority
- status
- timestamps

#### projects
- id, name, description
- client_id
- start_date, end_date
- budget, status
- timestamps

#### crm_contacts
- id, name, email, phone
- company, position
- timestamps

#### crm_pipelines
- id, name, stage
- value, probability
- timestamps

#### courses
- id, title, description
- instructor_id
- start_date, end_date
- timestamps

#### enrollments
- id, user_id, course_id
- enrolled_at
- timestamps

#### income_records
- id, amount, source
- date, description
- timestamps

#### expense_records
- id, amount, category
- date, description
- timestamps

#### meetings
- id, title, description
- start_time, end_time
- location, status
- timestamps

#### social_posts
- id, account_id
- content, platform
- scheduled_at, published_at
- timestamps

---

## 9. UI/UX Guidelines

### 9.1 Design System

**Color Palette:**
- Primary: `#89BE2B` (Green)
- Secondary: Various shades for different modules
- Gray Scale: For text and backgrounds
- Status Colors:
  - Success: Green
  - Warning: Yellow/Orange
  - Error: Red
  - Info: Blue

**Typography:**
- Heading Font: `font-heading` (Bold, tracking-tight)
- Body Font: `font-body`
- Font Sizes: Responsive (text-sm to text-4xl)

**Components:**
- Rounded corners: `rounded-xl`, `rounded-2xl`
- Shadows: `shadow-sm`, `shadow-md`
- Transitions: `transition-all duration-200`
- Hover states on all interactive elements

### 9.2 Layout Structure

**Sidebar Navigation:**
- Fixed width: 256px (w-64)
- Sticky positioning
- Collapsed on mobile
- Active state highlighting
- Logout button at bottom

**Header:**
- Height: 80px (h-20)
- Sticky positioning
- User greeting with time-based message
- Search bar
- Notification bell
- Settings icon
- Profile dropdown (Edit Profile, Account Settings, Logout)

**Content Area:**
- Padding: p-4 sm:p-8
- Background: bg-gray-50
- Responsive grid layouts

### 9.3 Key UI Patterns

**Cards:**
```vue
<div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
  <!-- Content -->
</div>
```

**Buttons:**
- Primary: `bg-primary-500 hover:bg-primary-600 text-white`
- Secondary: `border border-gray-200 hover:bg-gray-50`
- Danger: `text-red-600 hover:bg-red-50`

**Status Badges:**
```vue
<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
  On-Time
</span>
```

**Data Tables:**
- Striped rows on hover
- Rounded headers
- Responsive overflow
- Action buttons in last column

---

## 10. Development Setup

### 10.1 Prerequisites
- PHP 8.2 or higher
- Composer
- Node.js 18+ and npm
- MySQL 8.0+ or PostgreSQL
- Git

### 10.2 Installation Steps

1. **Clone the repository:**
```bash
git clone <repository-url>
cd ighubstart
```

2. **Install PHP dependencies:**
```bash
composer install
```

3. **Install Node dependencies:**
```bash
npm install
```

4. **Environment setup:**
```bash
cp .env.example .env
php artisan key:generate
```

5. **Configure database in `.env`:**
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ighub_os
DB_USERNAME=root
DB_PASSWORD=
```

6. **Run migrations:**
```bash
php artisan migrate
```

7. **Seed database with sample data:**
```bash
php artisan db:seed --class=RolesAndPermissionsSeeder
php artisan db:seed --class=StaffDemoSeeder
```

8. **Build frontend assets:**
```bash
npm run dev
```

9. **Start development server:**
```bash
php artisan serve
```

The application will be available at: `http://localhost:8001`

### 10.3 Default Login Credentials

**Super Admin:**
- Email: `superadmin@ighub.com`
- Password: `password`

**Admin:**
- Email: `admin@ighub.com`
- Password: `password`

**Staff:**
- Email: `staff@ighub.com`
- Password: `password`

**Client:**
- Email: `client@partner.com`
- Password: `password`

---

## 11. API Documentation

### 11.1 Authentication Endpoints

**Login:**
```
POST /login
Body: { email, password, remember }
Response: { user, redirect }
```

**Logout:**
```
POST /logout
Response: { redirect: '/login' }
```

### 11.2 Staff Endpoints

**List Staff:**
```
GET /admin/staff
Response: { staff: [], roles: [] }
```

**Create Staff:**
```
POST /admin/staff
Body: { name, email, password, staff_type, roles[] }
```

**Update Staff:**
```
PUT /admin/staff/{id}
Body: { name, email, staff_type, roles[] }
```

**Delete Staff:**
```
DELETE /admin/staff/{id}
```

### 11.3 Attendance Endpoints

**Clock In:**
```
POST /staff/attendance/clock-in
Body: { qr_code }
```

**Clock Out:**
```
POST /staff/attendance/clock-out
```

**Generate QR:**
```
POST /admin/attendance/qr-code
Body: { office_location }
```

### 11.4 Task Endpoints

**List Tasks:**
```
GET /admin/tasks/board
Response: { tasks: [] }
```

**Create Task:**
```
POST /admin/tasks
Body: { title, description, assigned_to, due_date, priority }
```

**Update Task:**
```
PUT /admin/tasks/{id}
Body: { title, description, status }
```

---

## 12. Deployment

### 12.1 Production Checklist
- [ ] Set `APP_ENV=production` in `.env`
- [ ] Set `APP_DEBUG=false`
- [ ] Configure production database
- [ ] Set up SSL certificate
- [ ] Configure mail service
- [ ] Set up queue worker
- [ ] Enable caching
- [ ] Run `php artisan optimize`
- [ ] Run `npm run build`

### 12.2 Server Requirements
- PHP 8.2+
- MySQL 8.0+ or PostgreSQL 13+
- Nginx or Apache
- SSL Certificate
- Composer
- Node.js (for build process)

### 12.3 Environment Variables
```env
APP_NAME="IGHUB OS"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=your-db-host
DB_DATABASE=your-db-name
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password

MAIL_MAILER=smtp
MAIL_HOST=your-mail-host
MAIL_PORT=587
```

---

## 13. Contributing Guidelines

### 13.1 Code Style
- Follow Laravel coding standards
- Use PSR-12 for PHP
- Use Vue 3 Composition API
- Write descriptive commit messages
- Add comments for complex logic

### 13.2 Git Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add some feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Submit pull request

### 13.3 Pull Request Guidelines
- Provide clear description of changes
- Link related issues
- Ensure all tests pass
- Update documentation if needed
- Add screenshots for UI changes

### 13.4 Testing
```bash
# Run PHP tests
php artisan test

# Run specific test
php artisan test --filter TestName
```

### 13.5 Code Review Process
- At least one approval required
- All checks must pass
- No merge conflicts
- Documentation updated

---

## 14. Roadmap

### Phase 1: Core Features (Current)
- [x] Authentication & Authorization
- [x] Dashboard
- [x] Staff Management
- [x] Attendance System
- [x] Task Management
- [x] Basic Project Management
- [x] Finance Overview
- [x] Document Management

### Phase 2: Enhanced Features (Q1 2026)
- [ ] Mobile app (Flutter/React Native)
- [ ] Advanced analytics
- [ ] AI-powered insights implementation
- [ ] Automated report generation
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Calendar integrations (Google, Outlook)

### Phase 3: Advanced Features (Q2 2026)
- [ ] Video conferencing integration
- [ ] E-learning platform (full LMS)
- [ ] Payroll management
- [ ] Inventory management
- [ ] API for third-party integrations
- [ ] Mobile attendance app
- [ ] Advanced CRM features

### Phase 4: Scale & Optimize (Q3 2026)
- [ ] Multi-tenant support
- [ ] White-label solution
- [ ] Performance optimization
- [ ] Advanced security features
- [ ] Compliance features (GDPR, etc.)
- [ ] Multi-language support

---

## 15. Support & Contact

**Project Maintainer:** IGHub Development Team  
**Location:** Abia State, Nigeria  
**Email:** support@ighub.com  
**Website:** https://ighub.ng

---

## 16. License

This project is proprietary software owned by Innovation Hub Abia.

---

**Document Version:** 1.0.0  
**Last Updated:** January 8, 2026  
**Status:** Active Development

4. Design System & Frontend Guidelines

Visual Style ("Minimalist Duolingo")





Hard Constraints:





Zero borders (border: none !important): Clean planar separation only.



Zero drop shadows (box-shadow: none !important): Completely flat modern aesthetic.



Zero 3D button ledges: Modernized pill buttons without faux-3D skeuomorphic bevels.



Zero dividing hair lines (<hr>, border lines): Visual grouping achieved entirely through padding rhythm (p-6 to p-8) and background color contrast.

Palette Tokens





Canvas: Pure White (#FFFFFF)



Surface / Cards / Inactive Controls: Warm Gray (#F7F7F7 / #F3F3F3)



Primary Accent / CTA: Duolingo Green (#58CC02)



Active Tint / Selection Pills: Soft Mint (#D7FFB8)



Typography Primary: Deep Charcoal (#1F2937)



Typography Secondary / Muted: Neutral Gray (#6B7280)

Typography & Component Shapes





Font Family: Plus Jakarta Sans / Nunito (Clean, geometric, friendly sans-serif).



Border Radii:





Buttons & Badges: rounded-full (9999px)



Cards & Containers: rounded-3xl (24px - 32px)



Checkboxes & Micro-tags: rounded-xl (12px)



5. Technical Requirements & Stack





Frontend Framework: React 18+ (SPA / Next.js compatible)



Styling Engine: Tailwind CSS 3.4+



Iconography: Lucide React (stroke width 2px)



State Management: Zustand or React Context for local mock persistence (tasks, streak, learning logs).



Export Engine: Client-side markdown zip generation + GitHub GraphQL API integration for syncing commits/PR notes.



Device Support: Responsive mobile-first app layout (~390px viewport baseline) scaling smoothly to wide tablet/desktop viewports.