#!/bin/bash

# Create dist directory if it doesn't exist
mkdir -p dist/migrations dist/scripts

# Run TypeScript compilation
tsc

# Copy SQL files to dist
cp src/migrations/*.sql dist/migrations/ 