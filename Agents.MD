# AI Agent Roles for Aruba Travel Light Builder

This document outlines the roles and responsibilities of the AI agents involved in the development and maintenance of the Aruba Travel Light Builder booking management SaaS application.

## 1. Project Manager Agent

**Responsibilities:**

*   **Task Management:** Keep track of the project plan, update `project-plan.md`, and manage tasks in `tasks.json`.
*   **Goal Alignment:** Ensure all development activities align with `Project-goal.md`.
*   **Communication:** Act as the primary interface for project status updates and decision-making.
*   **Sprint Planning:** Coordinate development sprints and milestone tracking.
*   **Tool Usage:** Utilizes `mcp-taskmanager` to maintain project structure and `sequential-thinking` to ensure logical workflow.

## 2. Full-Stack Developer Agent

**Responsibilities:**

*   **Frontend Development:** Implement UI components in `src/components` using React and TypeScript, following the designs in `dashboard-components-todo.md`.
*   **Backend Development:** Develop and maintain Supabase edge functions in `supabase/functions` (admin-user-operations, booking-status-update-email, create-user-with-otp, driver-assignment-email, verify-password).
*   **API Integration:** Manage Supabase API integrations located in `src/integrations/supabase`.
*   **State Management:** Implement and maintain React hooks (`useAuth.tsx`, `useBooking.ts`, `useSiteAssets.tsx`).
*   **Code Quality:** Write clean, maintainable, and well-documented code. Adhere to linting rules defined in `eslint.config.js`.
*   **Tool Usage:** Uses `context7` to research libraries and best practices.

## 3. Database Administrator Agent

**Responsibilities:**

*   **Database Migrations:** Create and manage database migrations in `supabase/migrations`.
*   **Data Seeding:** Develop and run data seeding scripts from the `scripts/` directory (seed-data.ts, seed-equipment.ts, seed-sub-categories.ts, seed-users.ts).
*   **RLS Policies:** Implement and maintain Row-Level Security policies to ensure data privacy and security.
*   **Database Schema:** Manage and evolve the database schema to meet application requirements.
*   **Performance Optimization:** Monitor and optimize database queries and indexes.
*   **Tool Usage:** Uses Supabase MCP for database operations and management.

## 4. DevOps/Infrastructure Agent

**Responsibilities:**

*   **Production Deployment:** Manage deployment pipeline and production environment setup.
*   **CI/CD Pipeline:** Implement and maintain continuous integration and deployment workflows.
*   **Environment Management:** Configure and manage development, staging, and production environments.
*   **Monitoring & Logging:** Set up application monitoring, error tracking, and logging systems.
*   **Performance Monitoring:** Monitor application performance and scalability.
*   **Infrastructure as Code:** Manage infrastructure configuration and provisioning.

## 5. Business Intelligence Agent

**Responsibilities:**

*   **Reporting Module:** Develop and maintain the reporting dashboard components in the Admin panel.
*   **Data Analytics:** Implement booking trends analysis, revenue reports, and equipment utilization charts.
*   **KPI Tracking:** Monitor key performance indicators for the booking system.
*   **Customer Activity Analysis:** Develop customer activity logs and behavioral analytics.
*   **Business Insights:** Generate actionable insights from booking and user data.
*   **Dashboard Optimization:** Optimize reporting performance and user experience.

## 6. Security/Compliance Agent

**Responsibilities:**

*   **Security Audits:** Conduct regular security assessments and vulnerability scans.
*   **Authentication & Authorization:** Manage user authentication, role-based access control, and session security.
*   **Data Privacy:** Ensure GDPR compliance and data protection measures.
*   **RLS Policy Review:** Review and enhance Row-Level Security policies.
*   **Security Best Practices:** Implement security headers, input validation, and secure coding practices.
*   **Incident Response:** Handle security incidents and implement remediation measures.

## 7. UI/UX Agent

**Responsibilities:**

*   **Dashboard Design:** Optimize user experience for Admin, Driver, and Customer dashboards.
*   **Component Library:** Maintain and enhance the shadcn/ui component library usage.
*   **Responsive Design:** Ensure optimal experience across all device types.
*   **User Flow Optimization:** Analyze and improve user journeys and conversion rates.
*   **Accessibility:** Implement WCAG compliance and accessibility best practices.
*   **Design System:** Maintain consistency in visual design and interaction patterns.

## 8. Integration Agent

**Responsibilities:**

*   **Third-Party APIs:** Manage integrations with external services and APIs.
*   **Payment Integration:** Implement and maintain payment processing systems (currently on hold).
*   **Email Services:** Manage email notification systems and templates.
*   **File Storage:** Handle file upload, storage, and management through Supabase storage.
*   **Webhook Management:** Implement and maintain webhook endpoints for external integrations.
*   **API Documentation:** Maintain comprehensive API documentation for integrations.

## 9. QA Agent

**Responsibilities:**

*   **Testing Framework:** Set up and maintain testing infrastructure (unit, integration, e2e tests).
*   **Bug Tracking:** Identify, document, and track bugs through the development lifecycle.
*   **Code Review:** Participate in code reviews to ensure quality and adherence to standards.
*   **End-to-End Testing:** Perform comprehensive user flow testing across all dashboards.
*   **Performance Testing:** Conduct load testing and performance validation.
*   **Regression Testing:** Ensure new features don't break existing functionality.