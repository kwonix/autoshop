#!/bin/bash

# AutoShop Docker Management Script
# This script helps manage your Docker-based AutoShop application

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_header() {
    echo -e "\n${GREEN}================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}================================${NC}\n"
}

check_requirements() {
    print_header "Checking Requirements"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker found: $(docker --version)"
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose found: $(docker-compose --version)"
}

create_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found"
        echo "Creating .env from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env file and set secure passwords!"
        read -p "Press enter to continue after editing .env file..."
    else
        print_success ".env file exists"
    fi
}

start_services() {
    print_header "Starting Services"
    docker-compose up -d
    print_success "Services started"
}

stop_services() {
    print_header "Stopping Services"
    docker-compose down
    print_success "Services stopped"
}

restart_services() {
    print_header "Restarting Services"
    docker-compose restart
    print_success "Services restarted"
}

rebuild_services() {
    print_header "Rebuilding and Restarting Services"
    docker-compose down
    docker-compose up -d --build
    print_success "Services rebuilt and started"
}

show_status() {
    print_header "Service Status"
    docker-compose ps
}

show_logs() {
    print_header "Service Logs"
    if [ -z "$1" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$1"
    fi
}

health_check() {
    print_header "Health Check"
    
    echo "Checking backend health..."
    if curl -s http://localhost:3000/api/health > /dev/null; then
        print_success "Backend is healthy"
        curl -s http://localhost:3000/api/health | jq '.'
    else
        print_error "Backend is not responding"
    fi
    
    echo -e "\nChecking frontend..."
    if curl -s http://localhost > /dev/null; then
        print_success "Frontend is accessible"
    else
        print_error "Frontend is not responding"
    fi
    
    echo -e "\nChecking database..."
    if docker-compose exec -T postgres pg_isready -U autoshop_user > /dev/null; then
        print_success "Database is healthy"
    else
        print_error "Database is not responding"
    fi
}

backup_database() {
    print_header "Backing Up Database"
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    docker-compose exec -T postgres pg_dump -U autoshop_user autoshop > "$BACKUP_FILE"
    print_success "Database backed up to $BACKUP_FILE"
}

clean_system() {
    print_header "Cleaning Docker System"
    read -p "This will remove unused Docker resources. Continue? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker system prune -a -f
        print_success "System cleaned"
    fi
}

show_menu() {
    echo -e "\n${GREEN}AutoShop Docker Manager${NC}"
    echo "========================"
    echo "1)  Start services"
    echo "2)  Stop services"
    echo "3)  Restart services"
    echo "4)  Rebuild services"
    echo "5)  Show status"
    echo "6)  Show logs (all)"
    echo "7)  Show backend logs"
    echo "8)  Show database logs"
    echo "9)  Show nginx logs"
    echo "10) Health check"
    echo "11) Backup database"
    echo "12) Clean Docker system"
    echo "13) Exit"
    echo
}

# Main script
clear
check_requirements
create_env_file

if [ $# -eq 0 ]; then
    # Interactive mode
    while true; do
        show_menu
        read -p "Select option: " choice
        case $choice in
            1) start_services ;;
            2) stop_services ;;
            3) restart_services ;;
            4) rebuild_services ;;
            5) show_status ;;
            6) show_logs ;;
            7) show_logs backend ;;
            8) show_logs postgres ;;
            9) show_logs nginx ;;
            10) health_check ;;
            11) backup_database ;;
            12) clean_system ;;
            13) echo "Goodbye!"; exit 0 ;;
            *) print_error "Invalid option" ;;
        esac
        read -p "Press enter to continue..."
    done
else
    # Command line mode
    case $1 in
        start) start_services ;;
        stop) stop_services ;;
        restart) restart_services ;;
        rebuild) rebuild_services ;;
        status) show_status ;;
        logs) show_logs "$2" ;;
        health) health_check ;;
        backup) backup_database ;;
        clean) clean_system ;;
        *) 
            echo "Usage: $0 {start|stop|restart|rebuild|status|logs [service]|health|backup|clean}"
            exit 1
            ;;
    esac
fi
