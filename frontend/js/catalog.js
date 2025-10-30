// catalog.js - Логика каталога товаров с бесконечной прокруткой
class CatalogApp {
    constructor() {
        this.currentPage = 1;
        this.filters = {
            category: 'all',
            search: '',
            sort: 'name'
        };
        this.isLoading = false;
        this.hasMoreProducts = true;
        this.products = [];
        this.init();
    }

    init() {
        this.loadCategories();
        this.loadProducts(true); // true = сброс списка товаров
        this.setupEventListeners();
        this.setupInfiniteScroll();
        
        // Проверяем параметры URL
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        if (category) {
            this.filters.category = category;
            document.getElementById('category-filter').value = category;
        }
    }

    setupInfiniteScroll() {
        // Создаем элемент-наблюдатель для infinite scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isLoading && this.hasMoreProducts) {
                    this.loadMoreProducts();
                }
            });
        }, {
            rootMargin: '200px' // Начинаем загрузку за 200px до конца
        });

        // Создаем элемент-триггер в конце списка
        const trigger = document.createElement('div');
        trigger.id = 'infinite-scroll-trigger';
        trigger.style.height = '1px';
        document.querySelector('.catalog .container').appendChild(trigger);
        
        observer.observe(trigger);
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

    async loadProducts(reset = false) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        if (reset) {
            this.currentPage = 1;
            this.products = [];
            this.hasMoreProducts = true;
        }
        
        try {
            // Формируем параметры запроса с учетом сортировки
            const params = new URLSearchParams({
                category: this.filters.category,
                search: this.filters.search,
                sort: this.filters.sort,
                page: this.currentPage,
                limit: 12
            });
            
            const response = await Components.apiCall(`/products?${params}`);
            
            if (reset) {
                this.products = response.products;
            } else {
                this.products = [...this.products, ...response.products];
            }
            
            this.renderProducts(this.products);
            this.hasMoreProducts = response.pagination.hasMore;
            
            // Показываем/скрываем индикатор загрузки
            this.toggleLoadingIndicator(false);
            
        } catch (error) {
            console.error('Error loading products:', error);
            Components.showNotification('Ошибка загрузки товаров', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    loadMoreProducts() {
        if (this.hasMoreProducts && !this.isLoading) {
            this.currentPage++;
            this.toggleLoadingIndicator(true);
            this.loadProducts(false);
        }
    }

    toggleLoadingIndicator(show) {
        let indicator = document.getElementById('loading-indicator');
        
        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'loading-indicator';
                indicator.className = 'loading-indicator';
                indicator.innerHTML = `
                    <div class="loading-spinner"></div>
                    <p>Загрузка товаров...</p>
                `;
                document.getElementById('catalog-grid').after(indicator);
            }
            indicator.style.display = 'flex';
        } else {
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    }

    async sortProducts() {
        const container = document.getElementById('catalog-grid');
        const sortedProducts = [...this.products];
        
        switch(this.filters.sort) {
            case 'name':
                sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'price-low':
                sortedProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                break;
            case 'price-high':
                sortedProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                break;
            case 'popular':
                sortedProducts.sort((a, b) => {
                    // Сначала популярные, потом по имени
                    if (a.popular && !b.popular) return -1;
                    if (!a.popular && b.popular) return 1;
                    return a.name.localeCompare(b.name);
                });
                break;
        }
        
        this.products = sortedProducts;
        this.renderProducts(this.products);
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

    searchProducts() {
        this.filters.search = document.getElementById('search-input').value;
        this.loadProducts(true); // Сброс и новая загрузка
    }

    setupEventListeners() {
        // Фильтр по категориям
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.loadProducts(true);
        });

        // Сортировка
        document.getElementById('sort-by').addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            // Если товары уже загружены, просто сортируем на клиенте
            if (this.products.length > 0) {
                this.sortProducts();
            } else {
                this.loadProducts(true);
            }
        });

        // Поиск при нажатии Enter
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