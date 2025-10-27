// script.js - Основной скрипт фронтенда
class ShopApp {
    constructor() {
        this.cart = new CartManager();
        this.init();
    }

    init() {
        this.loadCategories();
        this.loadPopularProducts();
        this.setupContactForm();
        this.setupAuthCheck();
        this.setupScrollListeners();
    }

    async loadCategories() {
        try {
            const categories = await Components.apiCall('/categories');
            this.renderCategories(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderCategories(categories) {
        const container = document.getElementById('categories-grid');
        if (!container) return;

        container.innerHTML = categories.map(category => `
            <div class="category-card" onclick="window.location='catalog.html?category=${category.slug}'">
                <div class="category-img" style="background-image: url('${category.image_url || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7'}')"></div>
                <div class="category-info">
                    <h3>${category.name}</h3>
                    <p>${category.description || ''}</p>
                    <button class="btn btn-outline">Смотреть товары</button>
                </div>
            </div>
        `).join('');
        
        // Update scroll buttons visibility
        setTimeout(() => this.updateScrollButtons(), 100);
    }

    async loadPopularProducts() {
        try {
            const products = await Components.apiCall('/products/popular');
            this.renderPopularProducts(products);
        } catch (error) {
            console.error('Error loading popular products:', error);
        }
    }

    renderPopularProducts(products) {
        const container = document.getElementById('popular-products');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p class="text-center">Популярные товары не найдены</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-img" style="background-image: url('${product.image_url || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7'}')"></div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <div class="price">${Components.formatPrice(product.price)}</div>
                    <button class="btn btn-primary" onclick="shopApp.cart.addToCart(${product.id})">
                        В корзину
                    </button>
                </div>
            </div>
        `).join('');
        
        // Update scroll buttons visibility
        setTimeout(() => this.updateScrollButtons(), 100);
    }

    setupContactForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                phone: document.getElementById('contact-phone').value,
                message: document.getElementById('contact-message').value
            };

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            submitBtn.innerHTML = '<div class="loading"></div>';
            submitBtn.disabled = true;

            try {
                await Components.apiCall('/contact', {
                    method: 'POST',
                    body: formData
                });

                Components.showNotification('Сообщение успешно отправлено!');
                form.reset();
            } catch (error) {
                Components.showNotification(error.message, 'error');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    setupAuthCheck() {
        const token = localStorage.getItem('user_token');
        if (token) {
            const loginBtn = document.querySelector('.login-btn');
            if (loginBtn) {
                loginBtn.textContent = '👤 Кабинет';
                loginBtn.href = 'account.html';
            }
        }
    }

    scrollCategories(direction) {
        const container = document.getElementById('categories-grid');
        if (!container) return;
        
        const scrollAmount = 300;
        if (direction === 'left') {
            container.scrollLeft -= scrollAmount;
        } else {
            container.scrollLeft += scrollAmount;
        }
        
        this.updateScrollButtons();
    }

    scrollProducts(direction) {
        const container = document.getElementById('popular-products');
        if (!container) return;
        
        const scrollAmount = 300;
        if (direction === 'left') {
            container.scrollLeft -= scrollAmount;
        } else {
            container.scrollLeft += scrollAmount;
        }
        
        this.updateScrollButtons();
    }

    updateScrollButtons() {
        // Update categories scroll buttons
        const categoriesGrid = document.getElementById('categories-grid');
        if (categoriesGrid) {
            const scrollContainer = categoriesGrid.parentElement;
            const categoriesLeftBtn = scrollContainer.querySelector('.scroll-left');
            const categoriesRightBtn = scrollContainer.querySelector('.scroll-right');
            
            const isAtStart = categoriesGrid.scrollLeft <= 0;
            const isAtEnd = categoriesGrid.scrollLeft >= categoriesGrid.scrollWidth - categoriesGrid.clientWidth - 10;
            const canScroll = categoriesGrid.scrollWidth > categoriesGrid.clientWidth;
            
            if (categoriesLeftBtn && categoriesRightBtn) {
                categoriesLeftBtn.style.display = isAtStart || !canScroll ? 'none' : 'flex';
                categoriesRightBtn.style.display = isAtEnd || !canScroll ? 'none' : 'flex';
            }
            
            // Update gradient indicators
            scrollContainer.classList.toggle('can-scroll-left', !isAtStart && canScroll);
            scrollContainer.classList.toggle('can-scroll-right', !isAtEnd && canScroll);
        }
        
        // Update products scroll buttons
        const productsGrid = document.getElementById('popular-products');
        if (productsGrid) {
            const scrollContainer = productsGrid.parentElement;
            const productsLeftBtn = scrollContainer.querySelector('.scroll-left');
            const productsRightBtn = scrollContainer.querySelector('.scroll-right');
            
            const isAtStart = productsGrid.scrollLeft <= 0;
            const isAtEnd = productsGrid.scrollLeft >= productsGrid.scrollWidth - productsGrid.clientWidth - 10;
            const canScroll = productsGrid.scrollWidth > productsGrid.clientWidth;
            
            if (productsLeftBtn && productsRightBtn) {
                productsLeftBtn.style.display = isAtStart || !canScroll ? 'none' : 'flex';
                productsRightBtn.style.display = isAtEnd || !canScroll ? 'none' : 'flex';
            }
            
            // Update gradient indicators
            scrollContainer.classList.toggle('can-scroll-left', !isAtStart && canScroll);
            scrollContainer.classList.toggle('can-scroll-right', !isAtEnd && canScroll);
        }
    }
    
    setupScrollListeners() {
        // Add scroll event listeners to update button visibility
        const categoriesGrid = document.getElementById('categories-grid');
        if (categoriesGrid) {
            categoriesGrid.addEventListener('scroll', () => this.updateScrollButtons());
        }
        
        const productsGrid = document.getElementById('popular-products');
        if (productsGrid) {
            productsGrid.addEventListener('scroll', () => this.updateScrollButtons());
        }
        
        // Update on window resize
        window.addEventListener('resize', () => this.updateScrollButtons());
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.shopApp = new ShopApp();
});
