🏧 **ATM Ticket Management & Intelligent Auto-Assignment System**

A production-style backend system for managing ATM incident tickets, engineer dispatch, and operational monitoring with OTP authentication, role-based access control, and intelligent workload balancing.

Built to simulate a real-world banking ATM support infrastructure, where incidents must be handled quickly, securely, and fairly across distributed engineers.

🚀 **Key Highlights**
🔐 OTP Authentication System (secure login verification)
🛡️ Role-Based Access Control (RBAC) (Admin, Engineer, User)
🤖 Automatic Engineer Assignment Engine
☁️ CockroachDB distributed SQL database
📡 Swagger API documentation (interactive frontend testing UI)
📊 Full audit trail for ticket assignment history
📧 Email notification system (engineers + admins)

🔐 **Authentication & Security**
OTP-Based Authentication
Secure login using One-Time Password (OTP)
Email-based verification flow
Reduces unauthorized access risks
Role-Based Access Control (RBAC)

System supports three core roles:

Admin
Manage engineers
View all tickets
System monitoring access
Engineer
View assigned tickets
Update ticket status
Receive assignment notifications
User
Create tickets
Track ticket progress

🤖 Intelligent Auto-Assignment Engine

The system automatically assigns tickets using a workload balancing algorithm:

Assignment Logic:
Locks ticket using database row-level locking
Validates ticket is unassigned
Queries engineers with lowest active workload
Assigns ticket and updates status to in-progress
Logs assignment into audit history
Sends real-time email notifications

☁️ **Database: CockroachDB**
Distributed SQL database for high availability
Built for scalability and fault tolerance
Ensures data consistency across nodes
PostgreSQL-compatible query structure

📡 **API Documentation (Swagger UI)**
Fully documented REST API using Swagger
Interactive frontend for testing endpoints
Supports authentication testing and role validation
Helps developers and recruiters easily explore the system

🧠 **System Architecture**

Client (Swagger UI / Postman / Frontend)
→ Express.js API Layer
→ Authentication Service (OTP + RBAC)
→ Auto-Assignment Engine
→ CockroachDB Cluster
→ Notification Service (Email)

⚙️ **Tech Stack**
Node.js
Express.js
CockroachDB
Swagger (API Documentation UI)
Nodemailer (Email Service)
OTP Authentication System
Role-Based Access Control (RBAC)
RESTful API Architecture

🗄️ **Database Schema Overview**
atm_calls
id
atm_id
title
description
status
priority
assigned_to
created_by
created_at
updated_at
engineers
id
name
email
ticket_assignment_history
id
atm_call_id
assigned_to
assigned_at
⚖️ **Auto-Assignment Strategy**

The system ensures fair distribution of workload using:

Active ticket counting per engineer
Exclusion of closed tickets
Real-time workload calculation
Transaction-safe assignment using database locks
📧 **Notification System**

Triggers automated email notifications for:

Engineer assignment alerts
Admin ticket updates
Status changes
🔥 **Engineering Strengths**

This project demonstrates:

Secure authentication design (OTP-based login)
Role-based authorization system (enterprise-grade security model)
Distributed database usage (CockroachDB)
Production-level concurrency handling
Automated task distribution logic
API documentation using Swagger (developer-friendly interface)
🚀 Future Improvements
JWT + Refresh token authentication upgrade
Real-time WebSocket ticket updates
SLA breach detection system
AI-powered ticket categorization
Geo-location based engineer assignment
Docker + CI/CD pipeline deployment
🧑‍💻 Use Cases

Designed for:

Banking ATM monitoring systems
Enterprise IT service desks (ITSM)
Field engineer dispatch platforms
Fintech infrastructure support systems
📌 Why this project stands out

This is not a basic CRUD application.

It demonstrates:

Real-world distributed system thinking
Secure authentication flow (OTP + RBAC)
Production-ready database design (CockroachDB)
Intelligent automation logic (auto-assignment engine)
API-first architecture with Swagger documentation
