# 🚀 AutoShop - Docker Quick Start

## Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+

## Installation Steps

### Step 1: Setup Environment
```bash
# Navigate to project directory
cd autoshop

# Create environment file
cp .env.example .env

# Edit .env and set secure passwords (IMPORTANT!)
# Change at least:
# - POSTGRES_PASSWORD
# - JWT_SECRET
nano .env
```

### Step 2: Start Application
```bash
# Start all services
docker-compose up -d

# Or use the management script (Linux/Mac)
chmod +x docker-manager.sh
./docker-manager.sh start
```

### Step 3: Verify Installation
```bash
# Check service status
docker-compose ps

# Check health
curl http://localhost:3000/api/health

# View logs
docker-compose logs -f
```

### Step 4: Access Application
- **Frontend**: http://localhost
- **Admin Panel**: http://localhost/admin
- **API**: http://localhost/api

## Default Admin Credentials
(Will be set during database initialization)
- Email: admin@autoshop.ru
- Password: admin123

**⚠️ IMPORTANT: Change this password immediately in production!**

## Common Commands

### Start/Stop
```bash
docker-compose up -d          # Start
docker-compose down           # Stop
docker-compose restart        # Restart
```

### Logs
```bash
docker-compose logs -f        # All logs
docker-compose logs backend   # Backend only
docker-compose logs postgres  # Database only
docker-compose logs nginx     # Nginx only
```

### Database
```bash
# Backup
docker-compose exec postgres pg_dump -U autoshop_user autoshop > backup.sql

# Restore
cat backup.sql | docker-compose exec -T postgres psql -U autoshop_user -d autoshop

# Access database
docker-compose exec postgres psql -U autoshop_user -d autoshop
```

### Rebuild
```bash
# Rebuild and restart
docker-compose up -d --build

# Complete cleanup and restart
docker-compose down -v
docker-compose up -d --build
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
netstat -ano | findstr :80   # Windows
lsof -i :80                  # Linux/Mac

# Change ports in docker-compose.yml if needed
```

### Database Connection Error
```bash
# Check database is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

### Can't Access Frontend
```bash
# Check nginx logs
docker-compose logs nginx

# Verify nginx config
docker-compose exec nginx nginx -t

# Restart nginx
docker-compose restart nginx
```

## Production Deployment

### Security Checklist
- [ ] Change all default passwords in .env
- [ ] Generate strong JWT_SECRET
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable monitoring

### SSL Setup (Optional)
```bash
# Add SSL certificates to docker-compose.yml
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro

# Update nginx.conf for SSL
listen 443 ssl;
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

## Maintenance

### Update Application
```bash
git pull
docker-compose up -d --build
```

### Clean Up
```bash
# Remove unused images
docker image prune -a

# Remove all unused resources
docker system prune -a
```

### Backup Strategy
```bash
# Daily backup script
0 2 * * * docker-compose exec -T postgres pg_dump -U autoshop_user autoshop > /backups/autoshop_$(date +\%Y\%m\%d).sql
```

## Need Help?

- Check logs: `docker-compose logs -f`
- Read full documentation: [DOCKER_README.md](./DOCKER_README.md)
- Check health: `curl http://localhost:3000/api/health`

## Architecture

```
┌─────────────┐
│   Nginx     │ :80, :443
│ (Frontend)  │
└──────┬──────┘
       │
       ├─────> Frontend Files
       │
       └─────> /api/* ──────┐
                             │
                    ┌────────▼────────┐
                    │   Node.js       │ :3000
                    │   (Backend)     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │ :5432
                    │   (Database)    │
                    └─────────────────┘
```

---

**Questions?** Check [DOCKER_README.md](./DOCKER_README.md) for detailed documentation.
