# Catalog Service

## Overview
The Catalog Service is responsible for managing the product catalog, including products, categories, variants, and product images. It provides APIs for CRUD operations, filtering, and searching products, and integrates with inventory, order, and customization services.

## Features
- Product CRUD (Create, Read, Update, Delete)
- Category hierarchy management
- Product variants and attributes
- Product image management
- Filtering and search endpoints
- Integration with inventory and order services
- OpenAPI documentation

## API Endpoints
- `GET /products` - List products with filters and pagination
- `GET /products/:id` - Get product details
- `POST /products` - Create a new product
- `PUT /products/:id` - Update a product
- `DELETE /products/:id` - Soft delete a product
- `GET /categories` - List categories
- `GET /categories/:id` - Get category details

## Technology Stack
- Node.js, Express.js
- Sequelize ORM (PostgreSQL)
- Docker

## Running Locally
```
docker-compose up --build
```

## Testing
```
npm test
```
