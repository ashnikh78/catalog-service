# User Service

## Overview
Handles user registration, authentication, profile management, and user preferences. Supports multi-role access (customer, admin, designer, production) and integrates with authentication and notification services.

## Features
- User registration and login (email/password, OAuth)
- JWT-based authentication
- Profile and address management
- Role-based access control
- Password reset and email verification
- Audit logging and security features

## API Endpoints
- `POST /auth/register`
- `POST /auth/login`
- `GET /profile`
- `PUT /profile`
- `POST /profile/addresses`
- `GET /profile/addresses`
- ...

## Technology Stack
- Node.js, Express.js
- Sequelize ORM (PostgreSQL)
- Docker
"# catalog-service" 
