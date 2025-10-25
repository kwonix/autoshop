// catalog.js - Логика каталога товаров
class CatalogApp {
    constructor() {
        this.currentPage = 1;
        this.filters = {
            category: 'all',
            search: '',
            sort: 'name'
        };
        this.init();
    }

    init() {
        this.loadCategories();
        this.loadProducts();
        this.setupEventListeners();
        
        // Проверяем параметры URL
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        if (category) {
            this.filters.category = category;
            document.getElementById('category-filter').value = category;
        }
    }

    async loadCategories() {
        try {
            const categories = await Components.apiCall('/categories');
            this.renderCategoryFilter(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    renderCategoryFilter(categories) {
        const select = document.getElementById('category-filter');
        select.innerHTML = '<option value="all">Все категории</option>' +
            categories.map(cat => 
                `<option value="${cat.slug}">${cat.name}</option>`
            ).join('');
        
        // Устанавливаем выбранную категорию из фильтров
        select.value = this.filters.category;
    }

    async loadProducts() {
        try {
            const response = await Components.apiCall(
                `/products?category=${this.filters.category}&search=${this.filters.search}&sort=${this.filters.sort}&page=${this.currentPage}`
            );
            
            this.renderProducts(response.products);
            this.renderPagination(response.pagination);
        } catch (error) {
            console.error('Error loading products:', error);
            Components.showNotification('Ошибка загрузки товаров', 'error');
        }
    }

    renderProducts(products) {
        const container = document.getElementById('catalog-grid');
        
        if (products.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <h3>Товары не найдены</h3>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-img" style="background-image: url('${product.image_url}')"></div>
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p>${product.description}</p>
                    <div class="price">${Components.formatPrice(product.price)}</div>
                    <button class="btn btn-outline" onclick="catalogApp.viewProduct(${product.id})">
                        Подробнее
                    </button>
                    <button class="btn btn-primary" onclick="shopApp.cart.addToCart(${product.id})">
                        В корзину
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderPagination(pagination) {
        const container = document.getElementById('pagination');
        if (!container) return;

        if (pagination.total <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '';
        
        // Кнопка "Назад"
        if (pagination.current > 1) {
            paginationHTML += `<button class="btn btn-outline" onclick="catalogApp.goToPage(${pagination.current - 1})">Назад</button>`;
        }

        // Номера страниц
        for (let i = 1; i <= pagination.total; i++) {
            if (i === pagination.current) {
                paginationHTML += `<span class="btn btn-primary" style="cursor: default;">${i}</span>`;
            } else {
                paginationHTML += `<button class="btn btn-outline" onclick="catalogApp.goToPage(${i})">${i}</button>`;
            }
        }

        // Кнопка "Вперед"
        if (pagination.current < pagination.total) {
            paginationHTML += `<button class="btn btn-outline" onclick="catalogApp.goToPage(${pagination.current + 1})">Вперед</button>`;
        }

        container.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    searchProducts() {
        this.filters.search = document.getElementById('search-input').value;
        this.currentPage = 1;
        this.loadProducts();
    }

    setupEventListeners() {
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.currentPage = 1;
            this.loadProducts();
        });

        document.getElementById('sort-by').addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.currentPage = 1;
            this.loadProducts();
        });

        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.searchProducts();
            }
        });
    }

    async viewProduct(productId) {
        try {
            const product = await Components.apiCall(`/products/${productId}`);
            this.showProductModal(product);
        } catch (error) {
            console.error('Error loading product:', error);
            Components.showNotification('Ошибка загрузки товара', 'error');
        }
    }

    showProductModal(product) {
        const modal = document.getElementById('product-modal');
        const content = document.getElementById('product-modal-content');
        
        // Parse features
        let features = [];
        try {
            if (product.features) {
                features = typeof product.features === 'string' ? JSON.parse(product.features) : product.features;
            }
        } catch (e) {
            console.error('Error parsing features:', e);
        }
        
        content.innerHTML = `
            <div class="product-modal-image">
                <img src="${product.image_url}" alt="${product.name}">
                <div class="product-badges">
                    <span class="badge ${product.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                        ${product.status === 'active' ? 'В наличии' : 'Нет в наличии'}
                    </span>
                    ${product.popular ? '<span class="badge badge-popular">Популярное</span>' : ''}
                </div>
            </div>
            <div class="product-modal-details">
                <h2>${product.name}</h2>
                <p class="product-modal-description">${product.description}</p>
                
                <div class="product-modal-price">
                    <div class="price-label">Цена</div>
                    <div class="price-value">${Components.formatPrice(product.price)}</div>
                </div>
                
                <div class="product-modal-info">
                    <div class="info-row">
                        <span class="info-label">Категория</span>
                        <span class="info-value">${product.category_name || 'Не указана'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Наличие на складе</span>
                        <span class="info-value ${product.stock > 10 ? 'stock-high' : 'stock-low'}">
                            ${product.stock} шт.
                        </span>
                    </div>
                </div>
                
                ${features && features.length > 0 ? `
                    <div class="product-modal-features">
                        <h3>Характеристики</h3>
                        <ul class="features-list">
                            ${features.map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div class="product-modal-actions">
                    <button class="btn btn-primary" onclick="shopApp.cart.addToCart(${product.id}); catalogApp.closeProductModal();">
                        Добавить в корзину
                    </button>
                    <button class="btn btn-outline" onclick="catalogApp.closeProductModal()">
                        Закрыть
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Инициализация каталога
document.addEventListener('DOMContentLoaded', function() {
    window.catalogApp = new CatalogApp();
});