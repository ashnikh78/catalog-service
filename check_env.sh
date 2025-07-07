#!/bin/sh

# Print the values of environment variables
echo "DB_HOST=$DB_HOST"
echo "DB_USER=$DB_USER"
echo "DB_PASSWORD=$DB_PASSWORD"
echo "DB_NAME=$DB_NAME"
echo "JWT_SECRET=$JWT_SECRET"

# Check if required variables are set
if [ -z "$DB_HOST" ]; then
    echo "ERROR: DB_HOST is missing"
fi

if [ -z "$DB_NAME" ]; then
    echo "ERROR: DB_NAME is missing"
fi

if [ -z "$DB_USER" ]; then
    echo "ERROR: DB_USER is missing"
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: DB_PASSWORD is missing"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "ERROR: JWT_SECRET is missing"
fi

# Exit with an error code if any required variable is missing
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
    echo "Missing required environment variables"
    exit 1
fi
