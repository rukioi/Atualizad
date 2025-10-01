# Overview

This is a comprehensive SaaS legal practice management system built as a full-stack application. The system provides complete case management, financial control, client relationship management, and billing automation for law firms. It features a multi-tenant architecture with role-based access control supporting three account types: Simple (basic), Composite (intermediate), and Management (full access). The system integrates with external services like Stripe for payments, email automation for billing, and provides advanced features like automated invoice collection and legal publication monitoring.

**Recent Major Update (August 2025)**: Complete admin authentication system implementation with dual authentication flows for regular users and system administrators.

# Recent Changes

## October 1, 2025 - Complete Replit Setup & Import
- **Database Setup**: Created PostgreSQL database using Replit's built-in Neon database service
- **Environment Configuration**: Created `.env` file with database URL and JWT secrets
- **Prisma Setup**: Generated Prisma Client and deployed migrations (migration `20250910190139_init`)
- **Vite Configuration**: Updated HMR settings with `clientPort: 443` for Replit's HTTPS proxy
- **Workflow**: Configured Frontend workflow on port 5000 with `npm run dev`
- **Deployment**: Configured autoscale deployment with `build:full` and production Node server
- **Status**: Application successfully running with login page accessible

## September 30, 2025 - Replit Environment Setup (Historical)
- **Database Configuration**: Configured PostgreSQL (Neon) database with Replit's built-in database service
- **Prisma Migrations**: Successfully applied database migrations (migration `20250910190139_init`)
- **Workflow Configuration**: Removed separate Backend workflow; integrated Express backend into Vite dev server via expressPlugin
- **Production Build Fix**: Fixed `server/node-build.ts` to use `createApp()` with all API routes instead of minimal `createServer()`
- **Port Configuration**: Updated production server to use port 5000 and bind to 0.0.0.0 for Replit compatibility
- **Host Configuration**: Vite already configured with `allowedHosts: ['*']` for Replit proxy support
- **Deployment Setup**: Configured autoscale deployment with `build:full` and production server command

## August 29, 2025 - Admin System Enhancement
- **Admin Authentication Routes**: Implemented complete `/api/admin/auth/*` endpoints (login, logout, refresh, profile)
- **Database Schema Updates**: Added AdminUser and AdminRefreshToken models to Prisma schema
- **Frontend API Integration**: Updated login/registration pages to use real APIs instead of mock data
- **Registration Key System**: Converted user registration from manual fields to secure registration key system
- **Initialization Scripts**: Created `scripts/create-admin.cjs` and `scripts/create-test-registration-key.cjs` for system setup
- **Type Safety**: Added proper TypeScript definitions for admin authentication flows
- **Middleware Enhancement**: Enhanced authentication middleware to support both user and admin tokens

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: React Router 6 in SPA mode for client-side navigation
- **Styling**: TailwindCSS 3 with custom design system and shadcn/ui components
- **Forms**: React Hook Form with Zod validation for robust form handling
- **State Management**: React Query for server state and local React state for UI
- **UI Components**: Radix UI primitives with custom styling via TailwindCSS

## Backend Architecture
- **Runtime**: Node.js 20+ with Express.js framework
- **Database**: PostgreSQL with multi-tenant schema isolation
- **ORM**: Prisma for database operations and migrations
- **Authentication**: JWT access tokens (15min) + rotating refresh tokens (7 days)
- **Security**: bcrypt for password hashing, helmet for security headers, rate limiting
- **API Design**: RESTful endpoints with standardized error handling

## Multi-Tenant Data Isolation
- **Schema-based isolation**: Each tenant gets a dedicated PostgreSQL schema
- **Cross-tenant validation**: Middleware ensures data access is restricted to tenant scope
- **Account types**: Simple accounts have limited financial features, Composite/Management have full access
- **Dynamic schema creation**: New tenants automatically get isolated database schemas

## Authentication & Authorization
- **Dual Authentication System**: Separate authentication flows for regular users and system administrators
- **Admin Authentication**: Complete admin panel with `/api/admin/auth/*` endpoints for admin-specific operations
- **Registration keys**: Secure invitation system for new accounts using registration keys instead of open signup
- **Role-based permissions**: Different feature access based on account type (SIMPLES/COMPOSTA/GERENCIAL for users, superadmin for admins)
- **Token rotation**: Refresh tokens are rotated on each use for enhanced security
- **Session management**: Automatic token refresh with graceful fallback to login
- **AdminUser Model**: Separate database schema for administrator accounts with role-based access control

## Module Architecture
The system follows a modular design with specialized modules:
- **Dashboard**: Real-time metrics with account-type-specific data visibility
- **CRM**: Client management with sales pipeline and deal tracking
- **Projects**: Case management with progress tracking and file attachments
- **Tasks**: Assignment system with Kanban boards and deadline management
- **Billing**: Invoice and estimate generation with PDF export
- **Cash Flow**: Financial management restricted to Composite/Management accounts
- **Receivables**: Automated billing collection with external payment integration
- **Publications**: Legal publication monitoring with task assignment workflow

# External Dependencies

## Core Infrastructure
- **Database**: PostgreSQL (Supabase recommended) for primary data storage
- **File Storage**: AWS S3 integration for document and attachment storage
- **Email Service**: Resend API for transactional emails and billing communications

## Payment Processing
- **Stripe**: Complete payment processing for subscription billing and invoice payments
- **Webhook handling**: Automated payment status updates and subscription management

## Automation & Notifications
- **n8n**: Workflow automation for billing reminders and collection processes
- **WhatsApp Business API**: Automated payment reminders via messaging
- **Legal APIs**: Integration with Brazilian legal publication databases (TJSP, TJRJ, etc.)

## Development & Deployment
- **Docker**: Multi-stage containerization for production deployment
- **Redis**: Optional caching layer for performance optimization
- **Prisma**: Database schema management and migration system

## Frontend Libraries
- **@radix-ui/***: Accessible UI component primitives
- **lucide-react**: Consistent icon system
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Zod integration for form validation
- **@tanstack/react-query**: Server state management
- **date-fns**: Date manipulation and formatting
- **clsx + tailwind-merge**: Dynamic className composition

## Security & Monitoring
- **jsonwebtoken**: JWT token generation and validation
- **express-rate-limit**: API rate limiting protection
- **helmet**: Security headers middleware
- **CORS**: Cross-origin request handling with specific allowed origins