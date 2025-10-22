#!/bin/bash

# AutoShop Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting AutoShop deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
DOMAIN="your-domain.com"
DB_NAME="autoshop"
DB_USER="autoshop_user"
DB_PASSWORD="autoshop_password_2025"
BACKEND_PORT="3000"

# Functions
log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        log_error "$1 is not installed"
        exit 1
    fi
}

# Check prerequisites
check_command node
check_command npm
check_command psql
check_command nginx

# Create directory structure
log_info "Creating directory structure..."
sudo mkdir -p /var/www/autoshop/{frontend,admin,backend,logs}
sudo mkdir -p /var/www/autoshop/backend/{database,config}

# Set permissions
sudo chown -R $USER:$USER /var/www/autoshop
sudo chmod -R 755 /var/www/autoshop

# Copy project files
log_info "Copying project files..."

# Frontend
cp -r frontend/* /var/www/autoshop/frontend/

# Admin panel
cp -r admin/* /var/www/autoshop/admin/

# Backend
cp -r backend/* /var/www/autoshop/backend/

# Nginx config
sudo cp nginx/nginx.conf /etc/nginx/sites-available/autoshop
sudo ln -sf /etc/nginx/sites-available/autoshop /etc/nginx/sites-enabled/
sudo nginx -t

# Setup PostgreSQL
log_info "Setting up PostgreSQL database..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" || true
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true

# Initialize database
log_info "Initializing database..."
cd /var/www/autoshop/backend
psql -h localhost -U $DB_USER -d $DB_NAME -f database/init.sql

# Install backend dependencies
log_info "Installing backend dependencies..."
cd /var/www/autoshop/backend
npm install

# Create environment file
log_info "Creating environment configuration..."
cat > /var/www/autoshop/backend/.env << EOF
NODE_ENV=production
PORT=$BACKEND_PORT
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
JWT_SECRET=autoshop_jwt_secret_$(openssl rand -base64 32)
EOF

# Setup PM2 for process management
log_info "Setting up PM2..."
npm install -g pm2
pm2 start server.js --name "autoshop-api" --env production
pm2 startup
pm2 save

# Setup SSL with Certbot (optional)
read -p "Do you want to setup SSL with Certbot? (y/n): " setup_ssl
if [[ $setup_ssl == "y" ]]; then
    log_info "Setting up SSL..."
    sudo apt update
    sudo apt install certbot python3-certbot-nginx -y
    sudo certbot --nginx -d $DOMAIN
fi

# Restart services
log_info "Restarting services..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Setup firewall
log_info "Configuring firewall..."
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow ssh
sudo ufw --force enable

# Create backup script
log_info "Creating backup script..."
cat > /var/www/autoshop/backup.sh << 'EOF'
#!/bin/bash
# Backup script for AutoShop

BACKUP_DIR="/var/backups/autoshop"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U autoshop_user autoshop > $BACKUP_DIR/autoshop_db_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/autoshop_app_$DATE.tar.gz /var/www/autoshop

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/autoshop_$DATE"
EOF

chmod +x /var/www/autoshop/backup.sh

# Create log rotation
log_info "Setting up log rotation..."
sudo cat > /etc/logrotate.d/autoshop << EOF
/var/www/autoshop/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Final checks
log_info "Running final checks..."

# Check if backend is running
if pm2 list | grep -q "autoshop-api"; then
    log_info "Backend is running"
else
    log_error "Backend is not running"
    exit 1
fi

# Check if nginx is running
if systemctl is-active --quiet nginx; then
    log_info "Nginx is running"
else
    log_error "Nginx is not running"
    exit 1
fi

# Check if database is accessible
if pg_isready -h localhost -d $DB_NAME -U $DB_USER; then
    log_info "Database is accessible"
else
    log_error "Database is not accessible"
    exit 1
fi

log_info "🎉 Deployment completed successfully!"
log_info "🌐 Website: http://$DOMAIN"
log_info "🔧 Admin panel: http://$DOMAIN/admin"
log_info "📊 API: http://$DOMAIN/api"
log_info ""
log_info "Default admin credentials:"
log_info "Email: admin@autogadget.ru"
log_info "Password: admin123"
log_info ""
log_info "Next steps:"
log_info "1. Update domain in nginx configuration"
log_info "2. Configure SSL certificate"
log_info "3. Set up regular backups"
log_info "4. Monitor application logs"