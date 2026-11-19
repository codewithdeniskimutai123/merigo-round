# Merigo Round

### A Digital Merry-Go-Round and Group Savings Management Platform

**Merigo Round** is a web-based group savings and rotating payout management platform designed to help women organize, manage, contribute to, and benefit from collective savings groups (commonly known as merry-go-rounds or chamas).

The platform digitizes the traditional merry-go-round model by providing tools for group creation, member management, contribution tracking, rotating payout arrangements, payment processing, and financial activity monitoring.

Instead of relying entirely on manual record keeping, spreadsheets, WhatsApp messages, and physical meetings, Merigo Round provides a centralized platform where members can participate in organized savings cycles and monitor group activities.

The project is being developed with a focus on transparency, accountability, accessibility, and reliable financial record management.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Problem Merigo Round Solves](#2-the-problem-merigo-round-solves)
3. [Project Development Journey](#3-project-development-journey)
4. [Project Objectives](#4-project-objectives)
5. [Technology Stack](#5-technology-stack)
6. [System Architecture](#6-system-architecture)
7. [Docker and Containerization](#7-docker-and-containerization)
8. [Application Features](#8-application-features)
   - Authentication and User Accounts
   - Profile Management
   - Group Management
   - Membership and Roles
   - Savings Cycles
   - Draw and Payout Order
   - Position Swaps
   - Rounds
   - Contributions and Payments
   - Payout Management
   - Group Activity Timeline
   - Email and Notifications
9. [Step-by-Step User Workflows](#9-step-by-step-user-workflows)
10. [Payment Integration](#10-payment-integration)
11. [Background Processing with Celery and Redis](#11-background-processing-with-celery-and-redis)
12. [Backend Architecture](#12-backend-architecture)
13. [Frontend Architecture](#13-frontend-architecture)
14. [Database and Data Management](#14-database-and-data-management)
15. [Local Development Setup](#15-local-development-setup)
16. [Environment Configuration](#16-environment-configuration)
17. [Running the Application](#17-running-the-application)
18. [Testing and Quality Assurance](#18-testing-and-quality-assurance)
19. [Deployment Strategy: Render](#19-deployment-strategy-render)
20. [Current Deployment Limitations](#20-current-deployment-limitations)
21. [Security Considerations](#21-security-considerations)
22. [Current Development Status](#22-current-development-status)
23. [Features Still Under Development](#23-features-still-under-development)
24. [Known Limitations](#24-known-limitations)
25. [Future Improvements](#25-future-improvements)
26. [Project Structure](#26-project-structure)
27. [Contributing](#27-contributing)
28. [Author](#28-author)

---

# 1. Project Overview

Merigo Round is a full-stack web application that brings the traditional rotating savings group model into a digital environment.

A merry-go-round is a savings arrangement in which a group of people agree to contribute a fixed amount of money at regular intervals. Each member takes turns receiving the accumulated contributions until every participating member has received their turn.

For example, a group of five members contributing KSh 1,000 every week generates KSh 5,000 per round. One member receives the KSh 5,000 for that round, and the payout rotates among the members until the cycle is completed.

Merigo Round is designed to manage this process digitally.

The platform provides:

- User registration and authentication.
- User profile management.
- Creation and management of savings groups.
- Invitations and membership requests.
- Group roles and permissions.
- Savings cycle creation.
- Randomized draw options for determining payout positions.
- Member-selected payout positions.
- Position swap requests and approvals.
- Round generation and activation.
- Contribution and payment management.
- M-Pesa integration.
- Payout management.
- Transaction status monitoring and reconciliation.
- Group activity history.
- Background task processing.
- Email configuration and notification capabilities.

The application is being developed using a modern frontend and backend architecture, with containerized infrastructure to support consistent local development and eventual cloud deployment.

## 2. The Problem Merigo Round Solves

Traditional merry-go-round groups are often managed manually.

Common challenges include:

- Difficulty tracking contributions from multiple members.
- Uncertainty about who has paid and who has outstanding balances.
- Disputes concerning payout order.
- Poor documentation of group decisions.
- Difficulty managing members who join or leave groups.
- Lack of a centralized transaction history.
- Manual follow-up for outstanding contributions.
- Limited visibility into the overall progress of a savings cycle.
- Difficulty reconciling payment confirmations with group records.

Merigo Round addresses these problems by providing a structured system for managing the entire group savings process.

Its central objective is to make group savings easier to organize, monitor, and administer while ensuring that members can see relevant information about their groups.

---

# 3. Project Development Journey

Development of Merigo Round began on **September 1, 2026**.

The project has evolved through several stages, moving from initial application development into backend business logic, frontend integration, payment processing, background task configuration, and containerization.

By November 19, 2026, approximately eleven weeks of development had been invested in the project.

The development journey has involved:

### Phase 1: Project Foundation

- Establishing the React frontend and Django backend.
- Configuring the development environment.
- Creating the initial database structure.
- Implementing the first API endpoints.
- Establishing communication between the frontend and backend.
- Setting up authentication and user management.

### Phase 2: Authentication and User Management

- Implementing user registration and login.
- Adding JWT authentication.
- Integrating Google authentication.
- Implementing profile management.
- Introducing profile completion requirements.
- Implementing password change and password reset functionality.

### Phase 3: Group Management

- Creating savings groups.
- Implementing group membership.
- Introducing group roles.
- Managing pending membership requests.
- Adding approval and rejection processes.
- Implementing group management permissions.
- Developing the group workspace.

### Phase 4: Savings Cycles and Rounds

- Introducing savings cycles.
- Implementing draw options.
- Allowing members to select their payout positions.
- Introducing position swap requests.
- Implementing swap approval and rejection.
- Finalizing payout order.
- Generating rounds from finalized cycles.
- Introducing round activation and progression.

### Phase 5: Payment Integration

- Integrating Safaricom Daraja APIs.
- Implementing M-Pesa STK Push functionality.
- Supporting partial contributions.
- Handling payment callbacks.
- Introducing B2C payout functionality.
- Implementing transaction status queries.
- Developing payment reconciliation services.

### Phase 6: Workspace and Activity Management

- Expanding the group workspace.
- Introducing group activity tracking.
- Adding payout management interfaces.
- Improving frontend API integration.
- Organizing reusable React hooks and components.

### Phase 7: Docker and Background Processing

- Containerizing the Django backend.
- Configuring PostgreSQL using Docker.
- Configuring Redis.
- Adding Celery workers.
- Adding Celery Beat scheduling.
- Testing scheduled transaction reconciliation.
- Configuring Gunicorn.
- Preparing production-oriented Django settings.

### Phase 8: Deployment Preparation

- Preparing the application for GitHub-based deployment.
- Adding Docker build configuration.
- Updating environment-based settings.
- Preparing the frontend for static hosting.
- Preparing the backend for Render deployment.

**Current milestone:** Local containerized infrastructure is running, and the latest changes have been pushed to the GitHub `main` branch. Cloud deployment to Render is the next stage.

---

# 4. Project Objectives

Merigo Round aims to:

1. Digitize traditional merry-go-round savings arrangements.
2. Simplify the creation and administration of savings groups.
3. Provide transparent payout-order management.
4. Automate the generation and progression of savings rounds.
5. Integrate mobile money payments.
6. Maintain reliable financial transaction records.
7. Reduce manual administrative work.
8. Improve accountability among group members.
9. Provide members with visibility into their savings activities.
10. Establish an extensible platform for future financial and group-management features.

---

# 5. Technology Stack

Merigo Round uses a full-stack architecture.

## Frontend

| Technology | Purpose |
|---|---|
| React | Component-based user interface |
| Vite | Frontend development server and production build tool |
| JavaScript | Frontend application logic |
| Tailwind CSS v4 | Styling and responsive layouts |
| React Router | Client-side navigation |
| Axios | HTTP communication with the backend |
| TanStack Query | API data fetching, caching, and mutations |
| Sonner | User notifications and feedback |
| Google OAuth integration | Google authentication |

## Backend

| Technology | Purpose |
|---|---|
| Python | Backend programming language |
| Django | Backend web framework |
| Django REST Framework | REST API development |
| PostgreSQL | Relational database |
| Simple JWT | Token-based authentication |
| Google Auth | Google token verification |
| Gunicorn | Production WSGI application server |
| WhiteNoise | Serving Django static files |
| Celery | Background task processing |
| Celery Beat | Periodic task scheduling |
| Redis | Celery message broker and supporting infrastructure |
| Resend | Email delivery integration |

## Payment Integration

| Technology | Purpose |
|---|---|
| Safaricom Daraja API | M-Pesa integration |
| M-Pesa STK Push | Requesting member payments |
| M-Pesa C2B | Processing customer-to-business payment notifications |
| M-Pesa B2C | Supporting business-to-customer payouts |
| B2C transaction status API | Checking payout transaction status |
| Payment callbacks | Receiving asynchronous payment results |

## Infrastructure and Development Tools

| Technology | Purpose |
|---|---|
| Docker | Containerization |
| Docker Compose | Running multiple containers together |
| Git | Version control |
| GitHub | Source code hosting |
| Render | Planned cloud hosting and deployment |
| ngrok | Exposing local callback endpoints during development |

---

# 6. System Architecture

Merigo Round separates the user interface, business logic, database, payment integration, and background processing.

The frontend communicates with the backend through REST APIs.

The backend handles authentication, permissions, business rules, database operations, payment processing, and transaction management.

PostgreSQL stores application data, while Redis supports background task communication.

Celery workers execute asynchronous tasks, and Celery Beat schedules periodic tasks.

### High-level architecture

```text
                  USERS
                    |
                    |
             REACT FRONTEND
             Vite + Tailwind
                    |
                    |
               REST API
                    |
                    |
             DJANGO BACKEND
          Django REST Framework
                    |
          +---------+----------+
          |         |          |
          |         |          |
      PostgreSQL  Redis    Daraja API
          |         |          |
          |      Celery        |
          |      Worker        |
          |         |          |
          |      Celery Beat   |
          |                    |
          +--------------------+
                    |
              GROUP SERVICES
                    |
          CYCLES, ROUNDS, PAYMENTS
```

### Main architectural responsibilities

**Frontend**

- Displays application pages.
- Collects user input.
- Communicates with REST APIs.
- Displays group, cycle, round, and payment information.
- Handles navigation and user interactions.

**Backend**

- Validates requests.
- Enforces authorization and business rules.
- Manages users and groups.
- Generates cycles and rounds.
- Processes payment-related operations.
- Stores transaction records.
- Exposes API endpoints.

**PostgreSQL**

- Stores users.
- Stores groups and memberships.
- Stores cycles and rounds.
- Stores contributions and transactions.
- Stores payouts and activity records.

**Redis and Celery**

- Support background task execution.
- Handle scheduled reconciliation.
- Separate periodic processing from normal HTTP requests.

**Safaricom Daraja**

- Handles M-Pesa payment operations.
- Sends asynchronous payment results to backend callback endpoints.

---

# 7. Docker and Containerization

Docker is used to create a consistent environment for running Merigo Round's backend infrastructure.

Instead of manually installing and managing every backend dependency on the host machine, Docker Compose runs the main services as separate containers.

The project currently has five main services.

## 7.1 PostgreSQL Container

PostgreSQL is the primary relational database.

The current local Docker configuration uses:

- Image: `postgres:17`
- Database: `merigo`
- Persistent Docker volume: `postgres_data`
- Internal container port: `5432`

The database stores the application's persistent records.

The named Docker volume ensures that local database data survives normal container restarts and recreation.

**Important:** Avoid running `docker compose down -v` unless you intentionally want to delete the local database volume and its data.

## 7.2 Redis Container

Redis is used as the message broker for Celery.

Current local configuration:

- Image: `redis:7-alpine`
- Container service: `redis`
- Internal port: `6379`
- Broker URL: `redis://redis:6379/0`

Redis allows the backend to submit tasks for background execution.

## 7.3 Django Backend Container

The backend is built from:

```text
backend/Dockerfile
```

The Dockerfile:

1. Uses Python 3.13 slim.
2. Sets Python environment variables.
3. Copies the requirements file.
4. Installs Python dependencies.
5. Copies the backend source code.
6. Creates a non-root application user.
7. Exposes port 8000.
8. Runs database migrations.
9. Collects static files.
10. Starts Gunicorn.

The backend listens on:

```text
0.0.0.0:8000
```

Gunicorn is used instead of Django's development server for the containerized application.

## 7.4 Celery Worker Container

The Celery worker processes background tasks.

Its current responsibilities include executing:

```python
groups.tasks.reconcile_pending_transactions
```

The worker connects to Redis and receives tasks scheduled by Celery Beat or submitted by the backend.

## 7.5 Celery Beat Container

Celery Beat is responsible for scheduling periodic tasks.

The existing schedule includes transaction reconciliation every five minutes.

The scheduler uses Celery's persistent scheduler.

The project does not currently use Celery Beat to automatically activate savings cycles or rounds.

### Docker Compose services

| Service | Responsibility |
|---|---|
| `postgres` | Database |
| `redis` | Task broker |
| `backend` | Django REST API |
| `celery_worker` | Background task execution |
| `celery_beat` | Periodic task scheduling |

### Useful Docker commands

Start all services:

```bash
docker compose up -d
```

View running containers:

```bash
docker compose ps
```

View backend logs:

```bash
docker compose logs -f backend
```

View PostgreSQL logs:

```bash
docker compose logs -f postgres
```

View Redis logs:

```bash
docker compose logs -f redis
```

View Celery worker and Beat logs:

```bash
docker compose logs -f celery_worker celery_beat
```

Rebuild the backend image:

```bash
docker compose build backend
```

Restart the backend:

```bash
docker compose restart backend
```

Stop containers without deleting the database volume:

```bash
docker compose down
```

Start only the background processing services:

```bash
docker compose up -d celery_worker celery_beat
```

---

# 8. Application Features

## 8.1 Authentication and User Accounts

Merigo Round implements authentication to ensure that users can securely access their accounts.

Implemented authentication capabilities include:

- User registration.
- User login.
- JWT access and refresh tokens.
- Token refresh.
- Authenticated user information.
- Google OAuth authentication.
- Password change.
- Password reset functionality.

JWT authentication allows the frontend to authenticate API requests without relying on traditional server-rendered sessions.

### Google authentication

Users can authenticate using their Google account.

The frontend obtains a Google authentication token and sends it to the backend.

The backend verifies the token using Google's authentication library before establishing the user's application session.

### Password reset

Password reset functionality is implemented through the backend and email delivery configuration.

However, the password reset experience has an important deployment dependency.

The reset process requires a publicly accessible frontend URL to construct a valid password reset link. The current development environment uses local URLs, which are not suitable for users accessing the application over the internet.

The reset-link workflow is therefore subject to the production domain and email-sender configuration.

A properly configured public domain and verified email-sending domain are required for the intended production experience. The current project plan is to complete this setup when the paid/custom domain arrangement is available.

Until then, password reset emails and links should not be considered fully operational for public users.

## 8.2 Profile Management

Users can manage their personal information.

Profile information includes:

- First name.
- Last name.
- Username.
- Email address.
- Phone number.
- Profile photo.

Profile completion is important because some group operations require complete member information.

The application exposes profile completion status so that users can understand whether their accounts meet the required profile conditions.

A user who has not completed their profile may still access permitted account functionality, but group creation and joining operations enforce profile completion.

The profile photo is optional.

## 8.3 Group Management

Groups are the central organizational unit in Merigo Round.

Users can create savings groups and manage their membership.

Group information includes:

- Group name.
- Description.
- Contribution amount.
- Contribution frequency.
- Maximum number of members.
- Group status.
- Group membership information.

Group creation starts the group in a draft state.

The creator becomes the group's administrator.

Group management operations include:

- Creating a group.
- Viewing available groups.
- Viewing group details.
- Updating draft group information.
- Managing membership requests.
- Approving members.
- Rejecting membership requests.
- Viewing group activity.

Group archival and deletion workflows remain part of the outstanding development plan.

## 8.4 Group Membership and Roles

Merigo Round supports role-based group management.

The implemented roles include:

| Role | Responsibility |
|---|---|
| ADMIN | Main group administrator |
| TREASURER | Financial administration |
| SECRETARY | Group administration and records |
| MEMBER | Participating group member |

Membership statuses include:

- PENDING
- ACTIVE
- LEAVE_REQUESTED
- LEFT
- REMOVED
- SUSPENDED
- CANCELLED
- REJECTED

Membership requests can be approved or rejected.

The administrator can manage pending membership requests.

When a request is rejected, the system supports recording a rejection reason.

Group members have access to information and operations according to their membership status and permissions.

## 8.5 Group Workspace

Each group has a dedicated workspace.

The workspace is the main interface for managing group activities.

It is organized into sections covering:

- Overview.
- Members.
- Contributions.
- Payments.
- Payouts.
- Cycles.
- Activity.

The workspace provides a centralized place for members and administrators to interact with their group.

Access to workspace functionality depends on the user's membership and permissions.

Public visitors can access permitted overview information, while active members have access to member-specific functionality.

## 8.6 Savings Cycles

A savings cycle represents a complete rotation in which each active member receives an opportunity to receive the group's accumulated contributions.

A cycle contains:

- The group it belongs to.
- Start date.
- Swap deadline.
- Cycle status.
- Draw-order information.
- Membership participation.
- Associated rounds.

Creating a cycle requires:

- An active group.
- At least two active members.
- A valid cycle start date.
- A valid swap deadline.

A newly created cycle begins in draft status.

The cycle's payout order must be established before the cycle is activated.

## 8.7 Draw Options and Payout Position Selection

Merigo Round uses a member-selected draw-number process to determine payout positions.

Rather than assigning the payout order silently, the system provides draw options for members.

The general process is:

1. The system generates available draw options.
2. Members view the available options.
3. Each member selects a number.
4. The system records the selected number.
5. The selected numbers form the initial payout order.
6. Members may request position swaps before the applicable deadline.
7. The final order is locked after the process is completed.

Each draw option is associated with a unique token.

The selected position is recorded against the corresponding cycle membership.

The database also enforces uniqueness of selected positions within a cycle.

This prevents multiple members from selecting the same final number.

## 8.8 Position Swaps

Members may request changes to their payout positions before the swap deadline.

The system supports:

- Requesting a position swap.
- Identifying the target member.
- Receiving swap requests.
- Accepting swap requests.
- Rejecting swap requests.
- Tracking incoming and outgoing requests.

Accepted swaps become part of the final payout order.

The order must be finalized before rounds are generated.

After finalization, the payout order is locked.

This helps establish a clear and agreed-upon payout sequence.

## 8.9 Payout Order Finalization

Once members have selected their numbers and eligible swaps have been resolved, the cycle administrator can finalize the order.

Finalization changes the order from a pending state to a locked state.

The locked order becomes the basis for generating the cycle's rounds.

This is an important control because rounds should not be generated from an incomplete or changing payout order.

## 8.10 Rounds

A round represents one scheduled contribution and payout opportunity within a cycle.

For example, if a group has ten active members, a complete cycle will normally contain ten rounds.

Each round is associated with:

- Its cycle.
- Its sequence number.
- Its scheduled date.
- Its payout recipient.
- Its expected payout amount.
- Its status.
- Its contribution and payment records.

Round generation takes place after the payout order has been finalized.

The expected payout is calculated using:

```text
Expected Payout = Contribution Amount × Number of Active Members
```

For example:

```text
Contribution per member = KSh 1,000
Active members = 10

Expected payout = KSh 1,000 × 10

Expected payout = KSh 10,000
```

The round schedule is calculated according to the group's contribution frequency.

Supported scheduling intervals include:

- Weekly.
- Biweekly.
- Monthly.

The first round is activated as part of the cycle activation process.

Subsequent rounds can be activated when the previous round has been completed and the next scheduled date has arrived.

The current activation logic uses date and round-status checks to prevent premature progression.

## 8.11 Contributions

Contributions represent the amounts members are expected to pay into a round.

The contribution system is designed to track:

- Amount due.
- Amount paid.
- Outstanding balance.
- Contribution status.
- Related transactions.
- Payment history.

The payment model supports partial contributions.

For example, if a member owes KSh 1,000, they may make multiple payments that together settle the required amount.

The contribution balance is based on the amount due and the amount already paid.

The system also supports waived amounts in payout-related accounting.

A contribution can be considered settled when the total of the paid and waived amounts covers the amount due.

## 8.12 Payout Management

The payout functionality manages the distribution of the accumulated contributions to the member assigned to a round.

Payout management is connected to:

- The cycle's finalized payout order.
- The active round.
- The designated recipient.
- Member contribution records.
- Payment settlement status.
- Payout transaction status.

The frontend includes a group payouts workspace.

The backend contains payout services and M-Pesa B2C integration components.

Actual payout processing depends on the correct Daraja configuration, successful transaction submission, callbacks, and reconciliation.

The presence of the payout interface does not by itself mean that every live payout scenario has been fully verified.

## 8.13 Group Activity Timeline

Merigo Round includes a group activity timeline.

The activity system records relevant group events and provides a historical view of group operations.

This gives members and administrators better visibility into what has happened within their group.

The activity timeline is integrated into the group workspace.

It is intended to improve transparency and reduce misunderstandings about group decisions and changes.

## 8.14 Email and Notifications

Email delivery is being integrated into the platform using Resend.

Email-related configuration is part of the Django backend environment.

Email capabilities are intended to support important account and group events, including:

- Account-related messages.
- Password reset messages.
- Membership-related notifications.
- Group activity notifications.
- Payment-related notifications.
- Important cycle and round updates.

Email infrastructure and configuration should be distinguished from a complete notification system.

Not every possible group, cycle, payment, and administrative event should be assumed to have a finished notification workflow.

The notification system remains an area for further development.

The intended direction is to provide timely communication to members when important events occur rather than requiring members to repeatedly check the application.

---

# 9. Step-by-Step User Workflows

This section describes how the main application operations are intended to be performed.

## 9.1 Registering an Account

1. Open the Merigo Round frontend.
2. Navigate to the registration page.
3. Enter the required registration details.
4. Submit the registration form.
5. The frontend sends the registration request to the Django API.
6. The backend validates the submitted information.
7. The account is created.
8. The user can proceed to login.

Google authentication is also supported through the configured OAuth integration.

## 9.2 Logging In

1. Open the login page.
2. Enter the account credentials.
3. Submit the login form.
4. The backend validates the credentials.
5. JWT tokens are issued.
6. The frontend establishes the authenticated application state.
7. The user can access authorized pages.

## 9.3 Completing a Profile

1. Log in to the application.
2. Navigate to the profile page.
3. Review the profile completion status.
4. Enter missing required information.
5. Update the profile.
6. Submit the changes.
7. The backend validates the information.
8. The application updates the profile completion status.

Required profile information includes first name, last name, username, email, and phone number.

## 9.4 Creating a Savings Group

1. Log in.
2. Ensure the profile is complete.
3. Navigate to the group creation page.
4. Enter the group name.
5. Enter the group description.
6. Specify the contribution amount.
7. Select the contribution frequency.
8. Specify the maximum number of members.
9. Submit the group creation form.
10. The backend validates the request.
11. A draft group is created.
12. The creator becomes the group administrator.

## 9.5 Joining a Group

1. Log in.
2. Complete the required profile information.
3. Browse available groups.
4. Open the group you want to join.
5. Submit a membership request.
6. The group administrator receives the pending request.
7. The administrator reviews the request.
8. The administrator approves or rejects it.
9. The membership status is updated.

An approved member can access the functionality permitted by their membership status and role.

## 9.6 Managing Group Members

1. Open the group workspace.
2. Navigate to the Members section.
3. Review the current members.
4. Review pending membership requests.
5. Select a pending request.
6. Approve or reject the request.
7. If rejecting, provide the rejection reason where applicable.
8. The backend records the decision.
9. The membership status is updated.

## 9.7 Creating a Savings Cycle

1. Open an active group.
2. Navigate to the Cycles section.
3. Select the option to create a cycle.
4. Enter the cycle start date.
5. Enter the swap deadline.
6. Submit the form.
7. The backend verifies that the group is active.
8. The backend checks that at least two active members exist.
9. A draft cycle is created.
10. The cycle becomes available for draw-order management.

## 9.8 Selecting a Draw Number

1. Open the draft cycle.
2. Navigate to the draw section.
3. View the available draw numbers.
4. Select an available number.
5. Submit the selection.
6. The backend validates the selected option.
7. The selected position is associated with the member's cycle membership.
8. The system records the selection.

Each member participates in selecting their payout position.

## 9.9 Requesting a Position Swap

1. Open the cycle's position-management section.
2. View the available members and their selected positions.
3. Select the member whose position you want to swap with.
4. Submit a swap request.
5. The target member receives the request.
6. The target member accepts or rejects it.
7. If accepted, the swap is applied to the payout order.
8. The cycle administrator can finalize the order when the required conditions are met.

Swap requests are subject to the cycle's swap deadline.

## 9.10 Finalizing the Payout Order

1. Open the relevant draft cycle.
2. Confirm that the draw process is complete.
3. Review the selected numbers.
4. Review pending swap requests.
5. Ensure the final order is correct.
6. Finalize the order.
7. The backend locks the payout order.
8. The cycle becomes eligible for round generation.

## 9.11 Generating Rounds

1. Open the finalized cycle.
2. Select the round-generation operation.
3. The backend reads the locked payout order.
4. It calculates the number of rounds.
5. It determines the scheduled dates using the contribution frequency.
6. It assigns recipients according to the finalized order.
7. It calculates the expected payout for each round.
8. The rounds are stored in the database.

## 9.12 Activating a Cycle

1. Open the cycle.
2. Ensure its payout order is locked.
3. Ensure its rounds have been generated.
4. Confirm that the start date has arrived.
5. Trigger cycle activation.
6. The backend validates the cycle state.
7. The cycle becomes active.
8. The first round is activated.

Cycle activation is currently controlled through an administrative operation rather than an automatic scheduled cycle-activation task.

## 9.13 Activating the Next Round

1. Open the active cycle.
2. Review the current round.
3. Confirm that the previous round has been completed.
4. Confirm that the next round's scheduled date has arrived.
5. Trigger the next-round activation operation.
6. The backend validates the round sequence.
7. The next round becomes active.

The system prevents activating the next round while the previous round remains incomplete.

## 9.14 Making Contributions

1. Open the group workspace.
2. Navigate to the Contributions or Payments section.
3. Review the active round.
4. Check the contribution amount due.
5. Initiate the available payment operation.
6. Follow the M-Pesa payment instructions.
7. Complete the payment using the phone.
8. The backend receives the payment result through the configured integration.
9. The transaction record is updated.
10. The contribution balance is recalculated.

Partial payments are supported by the contribution accounting logic.

## 9.15 Reviewing Payouts

1. Open the group workspace.
2. Navigate to Payouts.
3. Review the relevant cycle and round.
4. Identify the designated payout recipient.
5. Review the expected payout amount.
6. Review the payout status.
7. Where supported and configured, initiate the payout operation.
8. Monitor the transaction status and subsequent reconciliation.

Actual payout execution depends on the availability and correct configuration of the Daraja B2C service.

---

# 10. Payment Integration

Payment integration is one of the major technical components of Merigo Round.

The platform integrates with Safaricom Daraja to support mobile money operations.

## 10.1 M-Pesa STK Push

STK Push allows the application to request payment from a member's phone.

The general process is:

1. A member initiates a payment.
2. The backend prepares the Daraja request.
3. The backend submits the STK Push request.
4. Safaricom sends a payment prompt to the member's phone.
5. The member enters their M-Pesa PIN.
6. Safaricom processes the transaction.
7. Safaricom sends a callback to the backend.
8. The backend processes the callback.
9. The related transaction and contribution records are updated.

## 10.2 Payment Callbacks

Callbacks allow Safaricom to communicate the outcome of asynchronous payment operations.

The backend processes callback results and updates the corresponding transaction records.

The callback endpoints must be publicly reachable by Safaricom.

During local development, ngrok can expose the local backend to the internet.

For example, a local backend running on port 8000 can be exposed through an ngrok tunnel.

The public callback URL must be configured in the relevant Daraja environment settings.

When the tunnel is offline, Safaricom cannot deliver callbacks to the local application.

## 10.3 Partial Payments

The payment system supports multiple payments toward one contribution.

For example:

```text
Contribution due: KSh 1,000

First payment:  KSh 400
Second payment: KSh 300
Third payment:  KSh 300

Total paid: KSh 1,000
Outstanding balance: KSh 0
```

Each payment is recorded separately.

The contribution maintains the cumulative amount paid and its outstanding balance.

## 10.4 Duplicate Callback Protection

Payment callback processing must be idempotent.

This means that receiving the same callback more than once should not cause the same payment to be credited repeatedly.

The payment implementation includes duplicate-callback handling and transaction-level checks.

## 10.5 M-Pesa B2C Payouts

B2C supports sending money from the business account to a member's phone.

The implementation includes:

- B2C authentication.
- Security credential handling.
- Payout submission.
- Result callback handling.
- Timeout callback handling.
- Transaction status queries.
- Payout reconciliation support.

B2C requires correct Daraja credentials, permissions, and an enabled API product.

A known integration limitation during development has been the Daraja response:

```text
401.002.01 - no api product match
```

This indicates that the configured request is not being matched to an enabled API product for the relevant Daraja account or environment.

The B2C integration should not be considered fully production-verified until the API product and account configuration issue is resolved and end-to-end payout testing succeeds.

---

# 11. Background Processing with Celery and Redis

Merigo Round uses Celery and Redis to support background processing.

This is important because some operations should run independently of normal user requests.

## 11.1 Why Celery Is Used

Without background processing, the application would have to perform every operation during an HTTP request.

This can make requests slow and unreliable, particularly when an operation depends on an external payment provider.

Celery allows the backend to submit work for execution by separate worker processes.

## 11.2 Redis as the Message Broker

Redis receives task messages submitted by the Django application.

The Celery worker connects to Redis and retrieves available tasks.

The current local broker URL is:

```text
redis://redis:6379/0
```

The hostname `redis` is the Docker Compose service name.

## 11.3 Celery Worker

The worker is responsible for executing registered background tasks.

The current worker discovers:

```python
groups.tasks.reconcile_pending_transactions
```

The task is responsible for processing pending transaction reconciliation.

## 11.4 Celery Beat

Celery Beat schedules periodic tasks.

The current configuration schedules pending transaction reconciliation every five minutes.

The project currently uses a persistent scheduler.

The schedule is limited to transaction reconciliation. Automatic cycle creation, cycle activation, and round activation have not been added to the Celery schedule.

## 11.5 Verifying Background Processing

Start the worker and Beat:

```bash
docker compose up -d celery_worker celery_beat
```

Check the services:

```bash
docker compose ps
```

View the logs:

```bash
docker compose logs -f celery_beat celery_worker
```

A successful scheduling sequence should show Celery Beat sending a due task and the worker receiving it.

The task's internal result must also be checked. A Celery task marked as successfully executed only means the task function returned normally; it does not automatically mean every reconciliation operation inside the task succeeded.

---

# 12. Backend Architecture

The backend is organized around Django applications and service-oriented business logic.

The primary backend application is responsible for authentication, group management, cycles, rounds, payments, and related operations.

Important areas include:

```text
backend/
│
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── celery.py
│   └── wsgi.py
│
├── groups/
│   ├── api/
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── views.py
│   │
│   ├── mpesa/
│   │   ├── b2c.py
│   │   ├── b2c_authentication.py
│   │   ├── b2c_security.py
│   │   ├── b2c_views.py
│   │   └── urls.py
│   │
│   ├── migrations/
│   ├── models.py
│   ├── services.py
│   ├── group_services.py
│   ├── payout_services.py
│   └── tasks.py
│
├── manage.py
├── requirements.txt
└── Dockerfile
```

### Models

Models define the database entities and relationships.

### Serializers

Serializers validate incoming API data and control how database objects are represented in API responses.

### Views

Views handle incoming HTTP requests, permissions, validation, and responses.

### Services

Business logic is separated into service modules where appropriate.

This helps avoid placing all business operations directly inside API views.

### API URLs

URL configuration maps API paths to their corresponding views.

### Migrations

Django migrations track database schema changes over time.

### Payment modules

The M-Pesa modules separate authentication, security credential generation, API requests, callbacks, and related payment operations.

---

# 13. Frontend Architecture

The frontend is built using React and Vite.

The application uses reusable components and API hooks to separate presentation from data operations.

Important frontend areas include:

```text
frontend/src/
│
├── api/
│   ├── cycleApi.js
│   └── groupApi.js
│
├── hooks/
│   ├── useCycles.js
│   └── useGroups.js
│
├── pages/
│   ├── GroupWorkspace.jsx
│   └── groups/
│       └── workspace/
│           └── components/
│               ├── GroupActivity.jsx
│               └── payouts/
│                   └── GroupPayouts.jsx
│
└── ...
```

### React

React is responsible for rendering the user interface and managing interactive components.

### Vite

Vite provides the frontend development environment and production build process.

### Tailwind CSS

Tailwind CSS v4 is used to create the application's responsive design.

### React Router

React Router manages navigation between pages.

### Axios

Axios handles HTTP requests to the backend.

### TanStack Query

TanStack Query manages server-state operations, including:

- Fetching groups.
- Fetching cycles.
- Fetching draw options.
- Fetching swap requests.
- Fetching rounds.
- Submitting mutations.
- Updating cached data.

### Reusable components

The frontend is designed around reusable UI components and established styling patterns to keep the application consistent as new features are introduced.

---

# 14. Database and Data Management

PostgreSQL is the primary database.

Django models and migrations define the application's data structure.

The database stores information relating to:

- Users.
- User profiles.
- Groups.
- Group memberships.
- Membership statuses.
- Savings cycles.
- Draw options.
- Selected payout positions.
- Swap requests.
- Rounds.
- Contributions.
- Payment transactions.
- Payouts.
- Group activity records.

Database migrations are used to introduce and update schema changes.

Apply migrations with:

```bash
python manage.py migrate
```

Create migrations after model changes with:

```bash
python manage.py makemigrations
```

View migration status with:

```bash
python manage.py showmigrations
```

For Docker:

```bash
docker compose exec backend python manage.py migrate
```

---

# 15. Local Development Setup

## Prerequisites

Install the following:

- Git.
- Python 3.13.
- Node.js and npm.
- Docker Desktop.
- Docker Compose.
- A code editor such as Visual Studio Code.

You should also have the necessary external credentials for the services you intend to test, such as Google OAuth, Resend, and Safaricom Daraja.

## Clone the repository

```bash
git clone https://github.com/codewithdeniskimutai123/merigo-round.git
```

Navigate into the project:

```bash
cd merigo-round
```

## Frontend installation

Navigate into the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend is available at:

```text
http://localhost:5173
```

Build the frontend:

```bash
npm run build
```

The production build is generated in:

```text
frontend/dist/
```

## Backend installation without Docker

Navigate into the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows Command Prompt:

```cmd
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Apply database migrations:

```bash
python manage.py migrate
```

Start the Django development server:

```bash
python manage.py runserver
```

The local API is available at:

```text
http://127.0.0.1:8000
```

For the complete containerized backend environment, use Docker Compose instead.

---

# 16. Environment Configuration

Sensitive configuration is provided through environment variables.

The project uses a root `.env` file for local configuration.

The `.env` file must not be committed to GitHub.

A deployment environment should receive its configuration through the hosting provider's environment-variable settings.

The required configuration categories include:

| Category | Example variable names |
|---|---|
| Django | `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` |
| Database | `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` |
| Frontend URLs | `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` |
| CSRF | `CSRF_TRUSTED_ORIGINS` |
| Redis | `REDIS_URL` |
| Google OAuth | Google client configuration |
| Email | Resend API key and sender configuration |
| M-Pesa | Daraja consumer credentials, passkeys and callback URLs |
| B2C | Initiator, security credential and B2C endpoint configuration |

The actual variable names should be taken from the backend settings and integration modules.

Never publish real API keys, passwords, passkeys, security credentials, or Django secret keys in this README or in source control.

---

# 17. Running the Application

The complete local infrastructure can be started using Docker Compose.

From the project root:

```bash
docker compose up -d
```

Check service status:

```bash
docker compose ps
```

The frontend can run separately through Vite:

```bash
cd frontend
npm run dev
```

The main local addresses are:

| Component | Local address |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://127.0.0.1:8000` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |

The backend, PostgreSQL, Redis, Celery worker, and Celery Beat run in Docker containers.

---

# 18. Testing and Quality Assurance

Testing is important, especially because Merigo Round handles financial records and payment operations.

The project includes payment-focused tests covering scenarios such as:

- Successful payments.
- Partial payments.
- Multiple partial payments.
- Duplicate callbacks.
- Incorrect payment amounts.
- Over-balance payment rejection.
- Payment result-code mapping.

Backend tests can be executed with:

```bash
python manage.py test
```

The frontend production build can be checked with:

```bash
npm run build
```

Docker services should also be checked using:

```bash
docker compose ps
```

And application logs:

```bash
docker compose logs -f backend
```

Payment testing should use the appropriate Safaricom test environment before any live-money operation is considered ready.

A successful API response alone is not sufficient to establish that a complete payment workflow is reliable. Callback processing, duplicate protection, transaction reconciliation, and final database balances must also be verified.

---

# 19. Deployment Strategy: Render

Render is the planned cloud hosting platform for Merigo Round.

The application is being prepared for deployment using its existing GitHub repository.

The intended deployment architecture separates the frontend, backend, database, and supporting infrastructure.

## Frontend: Render Static Site

The React application will be deployed as a Render Static Site.

Expected configuration:

| Setting | Value |
|---|---|
| Repository | `codewithdeniskimutai123/merigo-round` |
| Branch | `main` |
| Root directory | `frontend` |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |

The frontend will communicate with the deployed backend using the production API URL configured through `VITE_API_BASE_URL`.

## Backend: Render Web Service

The Django backend is prepared for Docker deployment.

Expected configuration:

| Setting | Value |
|---|---|
| Repository | `codewithdeniskimutai123/merigo-round` |
| Branch | `main` |
| Root directory | `backend` |
| Environment | Docker |
| Dockerfile | `Dockerfile` |

The Dockerfile installs dependencies, applies migrations, collects static files, and starts Gunicorn.

The production configuration uses environment variables rather than hardcoded development credentials.

## Database: PostgreSQL

The application requires PostgreSQL for persistent relational data.

A production deployment must use a database configuration appropriate for the application's financial records and expected lifetime.

## Redis

Redis is required by the Celery configuration.

The production Redis URL must be supplied through the `REDIS_URL` environment variable.

## Celery Worker and Beat

The application already has separate worker and Beat services in Docker Compose.

However, Render's Free plan does not provide free background worker services.

A deployment architecture must account for this limitation. The local Docker Compose setup should not be mistaken for proof that continuously running Celery services will be available on Render's Free plan.

## Current deployment status

The local Docker deployment has been tested, and the latest project changes have been pushed to GitHub.

**Render deployment is the next planned stage.** The public frontend and backend should only be described as live after their actual deployment, configuration, and connectivity have been verified.

---

# 20. Current Deployment Limitations

The initial deployment target is Render's Free plan.

This is useful for learning, demonstrations, and early testing, but it has important limitations.

## 20.1 Free Web Services Sleep

Render Free Web Services can spin down after a period of inactivity.

This means:

- The first request after inactivity may take longer.
- Users may experience cold-start delays.
- The backend is not guaranteed to be continuously available.

This is not ideal for an application where members expect immediate access to financial information.

## 20.2 Free PostgreSQL Expiration

Render's Free PostgreSQL offering has a limited lifetime, currently 30 days.

This creates a serious limitation for Merigo Round.

The application depends on persistent records for:

- Member accounts.
- Group memberships.
- Contributions.
- Payment transactions.
- Payout records.
- Cycle and round history.

A database that expires after a short period is not appropriate as the permanent database for a live savings platform.

## 20.3 Free Redis Limitations

Render's free Redis-compatible Key Value service is not a durable replacement for persistent production infrastructure.

Its data can be lost on restart or other lifecycle events.

Redis is currently used for Celery task messaging.

The application must not rely on free Redis as permanent storage for financial records.

PostgreSQL remains the authoritative application database.

## 20.4 No Free Background Workers

Render does not provide free background worker services on the Free plan.

This affects the current Celery architecture.

The application has:

- A Celery worker.
- Celery Beat.
- A scheduled transaction reconciliation task.

These services are running locally through Docker Compose, but the Free plan does not provide the continuously running worker infrastructure needed to host them in the same way.

As a result, scheduled reconciliation cannot be assumed to operate continuously in a free Render deployment.

## 20.5 Implications for Financial Operations

The Free plan is suitable for an initial demonstration and controlled testing, but it is not a reliable long-term hosting arrangement for an application handling real savings and payouts.

A production deployment requires:

- Persistent PostgreSQL storage.
- Reliable background processing.
- Stable backend availability.
- Reliable Redis or an appropriate alternative.
- Secure payment callback delivery.
- Verified email delivery.
- Proper domain configuration.
- Monitoring and operational recovery procedures.

The project must not be considered production-ready for real member funds solely because its frontend and backend can be opened online.

---

# 21. Security Considerations

Merigo Round handles account information and financial transactions, so security is an important part of its design.

Current and intended security measures include:

- JWT authentication.
- Google token verification.
- Backend permission checks.
- Profile completion validation.
- Role-based group access.
- Server-side request validation.
- Environment-based secrets.
- HTTPS configuration for production.
- Secure session and CSRF cookies in production.
- Payment callback validation and transaction checks.
- Duplicate payment callback protection.
- Database constraints for unique draw positions.
- Non-root Docker application user.

The Django production configuration includes proxy HTTPS handling and secure-cookie settings when `DEBUG` is disabled.

The deployment must also correctly configure:

- `ALLOWED_HOSTS`.
- `CORS_ALLOWED_ORIGINS`.
- `CSRF_TRUSTED_ORIGINS`.
- `SECRET_KEY`.
- Database credentials.
- Daraja credentials.
- Email provider credentials.

Uploaded media files, such as profile photos, also require an appropriate persistent production storage arrangement. Container-local media storage should not be assumed to survive redeployment or container replacement.

---

# 22. Current Development Status

The following table distinguishes the work already implemented from work that still requires additional development or production verification.

| Feature | Current status |
|---|---|
| React frontend | Implemented |
| Django REST backend | Implemented |
| PostgreSQL integration | Implemented |
| JWT authentication | Implemented |
| Google authentication | Implemented |
| Profile management | Implemented |
| Profile completion enforcement | Implemented |
| Group creation | Implemented |
| Group membership | Implemented |
| Group roles and permissions | Implemented |
| Membership approval and rejection | Implemented |
| Group workspace | Implemented |
| Savings cycle creation | Implemented |
| Draw option generation and selection | Implemented |
| Position swap requests | Implemented |
| Swap acceptance and rejection | Implemented |
| Payout order finalization | Implemented |
| Round generation | Implemented |
| Cycle and round activation operations | Implemented |
| Partial contribution accounting | Implemented |
| M-Pesa STK Push integration | Implemented; live verification required |
| M-Pesa callback handling | Implemented; public callback verification required |
| B2C payout integration | Implemented; Daraja configuration issue remains |
| Payment reconciliation task | Implemented locally |
| Group activity timeline | Implemented |
| Group payouts workspace | Implemented |
| Docker backend | Implemented |
| Docker Compose infrastructure | Implemented |
| Celery worker | Implemented and tested locally |
| Celery Beat | Implemented and tested locally |
| Email provider configuration | Implemented/configured; broader workflows remain under development |
| Complete email notification system | Under development |
| Production password reset experience | Domain and email configuration dependent |
| Group archival and deletion | Outstanding |
| Render cloud deployment | Planned; not yet completed |
| Production persistent media storage | Outstanding |
| Production background worker hosting | Requires hosting-plan decision |

---

# 23. Features Still Under Development

Merigo Round is an actively developed project. Some features are implemented in their core form but still require additional integration, testing, or production configuration.

## 23.1 Complete Email Notification System

The project has email provider configuration through Resend.

The next stage is to complete a consistent notification system for important application events.

Potential notification events include:

- Successful registration.
- Password reset requests.
- Group membership requests.
- Membership approval or rejection.
- Group updates.
- New cycle creation.
- Draw completion.
- Position swap requests.
- Swap acceptance or rejection.
- Round activation.
- Contribution reminders.
- Payment confirmations.
- Payout status updates.

The notification system should ensure that messages are sent at the appropriate point in each workflow.

It should also avoid duplicate notifications and provide clear error handling when email delivery fails.

## 23.2 Production Password Reset

Password reset functionality depends on a publicly accessible frontend domain.

The current local development URL cannot serve as a useful password reset destination for public users.

The production reset process must be configured with:

- A public frontend domain.
- Correct frontend URL environment configuration.
- A verified email sender/domain with the email provider.
- Valid reset URLs.
- A working backend reset endpoint.
- Proper token validation and expiration.

The planned approach is to complete the public-domain and email-sender configuration when the paid/custom domain is available.

Until that configuration is complete, the password reset workflow should be considered limited.

## 23.3 Daraja B2C Configuration

The B2C payout implementation exists, but a Daraja API product matching error has been encountered.

The remaining work includes:

- Confirming the correct Daraja account configuration.
- Confirming B2C product permissions.
- Verifying the production or sandbox endpoint.
- Verifying the initiator and security credential.
- Testing payout submission.
- Testing result callbacks.
- Testing timeout callbacks.
- Verifying transaction status queries.
- Verifying payout reconciliation.

## 23.4 Group Archiving and Deletion

Group archival and deletion workflows remain outstanding.

These operations need careful business rules because groups can contain members, financial transactions, cycles, rounds, and payout records.

The implementation should protect historical financial information and prevent accidental deletion of records that must be retained.

## 23.5 Automated Cycle and Round Operations

The current cycle and round progression uses explicit administrative activation operations.

Automatic activation through Celery scheduling has not been implemented.

Future work may include scheduled checks for eligible cycles and rounds, subject to the required production background-processing infrastructure.

The current Celery schedule is for pending transaction reconciliation, not cycle or round automation.

## 23.6 Production Media Storage

The current local setup supports uploaded media, but container-local storage is not a durable production solution.

A persistent media storage arrangement is needed so that profile photos and other uploaded files remain available across deployments and container restarts.

## 23.7 Production Deployment Verification

After Render deployment, the following still need end-to-end verification:

- Frontend-to-backend communication.
- Production CORS and CSRF configuration.
- Database connectivity.
- Authentication.
- Google OAuth redirect configuration.
- Password reset links.
- Email delivery.
- M-Pesa callback accessibility.
- Payment reconciliation.
- Media persistence.
- Background processing.

---

# 24. Known Limitations

The following limitations should be considered when evaluating the current version.

1. Render Free Web Services can sleep after inactivity.
2. Render's free PostgreSQL offering has a limited lifetime.
3. Render's free Redis-compatible storage is not durable.
4. Render Free does not provide continuously running background worker services.
5. The complete email notification system is not yet finished.
6. Password reset requires production domain and email-sender configuration.
7. B2C payout processing still requires resolution of the Daraja API product configuration issue.
8. Local M-Pesa callbacks depend on a reachable public tunnel when testing locally.
9. Production media storage needs a persistent storage solution.
10. Group archival and deletion workflows remain outstanding.
11. Cycle and round automation has not been scheduled through Celery.
12. A successful local Docker deployment does not automatically mean the application is production-ready.

These limitations are documented to make the application's development state transparent.

---

# 25. Future Improvements

The longer-term development roadmap includes:

- Completing email notifications.
- Completing production password reset configuration.
- Resolving the B2C Daraja integration issue.
- Completing group archival and deletion.
- Improving automated transaction reconciliation.
- Introducing scheduled cycle and round operations when reliable background infrastructure is available.
- Improving payout monitoring.
- Adding persistent media storage.
- Improving application monitoring and error reporting.
- Expanding test coverage.
- Improving production deployment reliability.
- Improving user-facing financial reports.
- Introducing additional administrative and group-management tools.

The goal is to evolve Merigo Round into a reliable and scalable digital savings platform.

---

# 26. Project Structure

The repository is organized into separate frontend and backend applications.

```text
merigo-round/
│
├── backend/
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── wsgi.py
│   │
│   ├── groups/
│   │   ├── api/
│   │   ├── migrations/
│   │   ├── mpesa/
│   │   ├── models.py
│   │   ├── services.py
│   │   ├── group_services.py
│   │   ├── payout_services.py
│   │   └── tasks.py
│   │
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── components/
│   │   └── ...
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

The structure separates application responsibilities and allows the frontend and backend to be developed and deployed independently.

---

# 27. Contributing

Merigo Round is an actively evolving project.

Contributions, suggestions, bug reports, and technical feedback are welcome.

When contributing:

1. Understand the existing application architecture.
2. Preserve established frontend and backend patterns.
3. Avoid introducing unrelated changes.
4. Validate backend business rules.
5. Consider financial data consistency.
6. Test payment-related changes carefully.
7. Keep sensitive credentials out of source control.
8. Update documentation when introducing new features.

---

# 28. Author

**Denis Kimutai**

Software Engineering graduate in progress, full-stack developer, and creator of Merigo Round.

The project is being developed as a practical application of full-stack software engineering, backend API development, database management, containerization, asynchronous task processing, and third-party payment integration.

**GitHub:** [codewithdeniskimutai123](https://github.com/codewithdeniskimutai123)

**Repository:** [Merigo Round](https://github.com/codewithdeniskimutai123/merigo-round)

---

## Final Note

Merigo Round is more than a group contribution tracker. It is an evolving digital platform intended to organize the entire merry-go-round process, from account creation and group formation to member participation, payout-order management, scheduled rounds, contribution tracking, and mobile money integration.

Development began on September 1, 2026, and has progressed through the implementation of a substantial full-stack application, payment integrations, background processing, and local Docker infrastructure.

### Deployment Status

Merigo Round is deployed and publicly accessible on Render.

- **Frontend:** https://merigo-round-frontend.onrender.com
- **Backend API:** Deployed on Render.
- **Hosting Platform:** Render (Free Plan)

**Note:** The application currently uses Render's free hosting services. Some services may spin down after periods of inactivity. As a result, the first visit or request after inactivity may take longer than usual while the services start up. Please allow a little time for the application to respond.

The application is actively being developed and improved.


**Merigo Round — Bringing traditional group savings into a more organized digital experience.**
