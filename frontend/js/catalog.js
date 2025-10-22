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
}

// Инициализация каталога
document.addEventListener('DOMContentLoaded', function() {
    window.catalogApp = new CatalogApp();
});