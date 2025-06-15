#!/bin/bash

# Configuration
BACKUP_DIR="/path/to/backups"
DB_NAME="raw_capture"
BACKUP_RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating backup: $BACKUP_FILE"
if [ -n "$DATABASE_URL" ]; then
    # Use connection URL if available
    pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
else
    # Fall back to local connection
    pg_dump "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully"
    
    # Create symlink to latest backup
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.sql.gz"
    
    # Remove old backups
    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
    
    # Log success
    echo "$(date): Backup successful - $BACKUP_FILE" >> "$BACKUP_DIR/backup.log"
else
    echo "Backup failed"
    echo "$(date): Backup failed" >> "$BACKUP_DIR/backup.log"
    exit 1
fi

# Verify backup integrity
echo "Verifying backup integrity"
if gunzip -t "$BACKUP_FILE"; then
    echo "Backup verified successfully"
else
    echo "Backup verification failed"
    echo "$(date): Backup verification failed - $BACKUP_FILE" >> "$BACKUP_DIR/backup.log"
    exit 1
fi

# Calculate backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup size: $BACKUP_SIZE"
echo "$(date): Backup size: $BACKUP_SIZE" >> "$BACKUP_DIR/backup.log"

# List remaining backups
echo "Current backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 