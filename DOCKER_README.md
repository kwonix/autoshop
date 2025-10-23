# AutoGadget - Docker Deployment Guide

## 🐳 Quick Start with Docker

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

### One-Command Setup

1. **Clone and navigate to the project:**
```bash
cd autoshop
```

2. **Create environment file:**
```bash
cp .env.example .env
```

3. **Edit `.env` file and set secure passwords:**
```bash
nano .env  # or use any text editor
```

4. **Start all services:**
```bash
docker-compose up -d
```

5. **Check service status:**
```bash
docker-compose ps
```

6. **View logs:**
```bash
docker-compose logs -f
```

Your application will be available at:
- **Frontend:** http://localhost
- **Admin Panel:** http://localhost/admin
- **API:** http://localhost/api

## 📦 Services

- ### 1. PostgreSQL Database
- **Container:** `autogadget-db`
- **Port:** 5432
- **Image:** postgres:15-alpine
- **Persistent Data:** Volume `postgres_data`

- ### 2. Node.js Backend
- **Container:** `autogadget-backend`
- **Port:** 3000
- **Built from:** `Dockerfile`
- **Environment:** Configured via `.env`

- ### 3. Nginx Web Server
- **Container:** `autogadget-nginx`
- **Ports:** 80 (HTTP), 443 (HTTPS)
- **Image:** nginx:alpine
- **Serves:** Frontend + Admin Panel

## 🔧 Common Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Restart a specific service
```bash
docker-compose restart backend
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f nginx
```

### Execute commands in containers
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U autogadget_user -d autogadget

# Access backend shell
docker-compose exec backend sh

# Run database migrations
docker-compose exec backend npm run migrate
```

### Rebuild services
```bash
# Rebuild all
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build backend
```

### Clean up (remove containers and volumes)
```bash
# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (DATA WILL BE LOST!)
docker-compose down -v
```

## 🗄️ Database Management

### Backup Database
```bash
docker-compose exec postgres pg_dump -U autogadget_user autogadget > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker-compose exec -T postgres psql -U autogadget_user -d autogadget
```

### Access Database Shell
```bash
docker-compose exec postgres psql -U autogadget_user -d autogadget
```

## 🔍 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Check if ports are already in use
netstat -tuln | grep -E '(80|443|3000|5432)'

# Remove old containers and try again
docker-compose down
docker-compose up -d
```

### Database connection issues
```bash
# Check if database is healthy
docker-compose ps

# View database logs
docker-compose logs postgres

# Verify database is accessible
docker-compose exec postgres pg_isready -U autogadget_user
```

### Backend API not responding
```bash
# Check backend logs
docker-compose logs backend

# Check if backend can reach database
docker-compose exec backend ping postgres

# Restart backend
docker-compose restart backend
```

### Frontend not loading
```bash
# Check nginx logs
docker-compose logs nginx

# Verify nginx configuration
docker-compose exec nginx nginx -t

# Restart nginx
docker-compose restart nginx
```

## 🔒 Security Recommendations

1. **Change default passwords** in `.env`:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`

2. **For production:**
   - Use strong, random passwords
   - Enable HTTPS with SSL certificates
   - Configure firewall rules
   - Use Docker secrets for sensitive data
   - Regularly update images

3. **SSL/TLS Setup:**
```bash
# Example with Let's Encrypt (requires domain)
# Update docker-compose.yml to mount SSL certificates
volumes:
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

## 📊 Health Checks

All services include health checks:

```bash
# View health status
docker-compose ps

# Manually check backend health
curl http://localhost:3000/api/health

# Check database health
docker-compose exec postgres pg_isready -U autogadget_user
```

## 🚀 Production Deployment

### Using Docker Compose
```bash
# Set production environment
export NODE_ENV=production

# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build

# Clean up unused images
docker image prune -a -f
```

### Environment Variables for Production
Update `.env`:
```env
NODE_ENV=production
POSTGRES_PASSWORD=<strong-random-password>
JWT_SECRET=<strong-random-secret>
```

## 📈 Monitoring

### Resource Usage
```bash
# View resource usage
docker stats

# View disk usage
docker system df
```

### Container Inspection
```bash
# Inspect a container
docker-compose exec backend env

# View container details
docker inspect autogadget-backend
```

## 🔄 Updates

### Update Application
```bash
git pull
docker-compose up -d --build
```

### Update Base Images
```bash
docker-compose pull
docker-compose up -d
```

## 💾 Data Persistence

Persistent data is stored in Docker volumes:
- `postgres_data`: Database files
- `nginx_logs`: Nginx access and error logs

### List volumes
```bash
docker volume ls
```

### Inspect volume
```bash
docker volume inspect autogadget_postgres_data
```

## 🌐 Network

Services communicate via the `autogadget-network` bridge network.

```bash
# Inspect network
docker network inspect autogadget_autogadget-network

# List all networks
docker network ls
```

## 📝 Additional Notes

- Database initialization scripts run automatically on first start
- Backend connects to database using service name `postgres`
- Nginx proxies API requests to backend service
- All services restart automatically unless stopped manually

## 🆘 Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify `.env` configuration
3. Ensure ports 80, 443, 3000, 5432 are available
4. Check Docker and Docker Compose versions
