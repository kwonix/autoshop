// supabase-client.js - Клиент для работы с Supabase
class SupabaseClient {
    constructor() {
        this.supabaseUrl = 'https://vueahcxztxsfgbamskpv.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1ZWFoY3h6dHhzZmdiYW1za3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTkxOTgsImV4cCI6MjA3NjczNTE5OH0.nY1zW3ZQiVjhBPBPv222G98FcBYn8rSdZYblx_aAiT4';
        this.supabase = null;
        this.init();
    }

    init() {
        // Динамически загружаем Supabase JS
        if (typeof supabase === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = () => this.setupClient();
            document.head.appendChild(script);
        } else {
            this.setupClient();
        }
    }

    setupClient() {
        this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseKey);
        console.log('Supabase client initialized');
    }

    // === PRODUCTS ===
    async getProducts(filters = {}) {
        if (!this.supabase) await this.waitForClient();
        
        let query = this.supabase
            .from('products')
            .select('*, categories(name, slug)')
            .eq('status', 'active');

        if (filters.category && filters.category !== 'all') {
            query = query.eq('categories.slug', filters.category);
        }

        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
        }

        if (filters.sort === 'price-low') {
            query = query.order('price', { ascending: true });
        } else if (filters.sort === 'price-high') {
            query = query.order('price', { ascending: false });
        } else if (filters.sort === 'popular') {
            query = query.order('popular', { ascending: false });
        } else {
            query = query.order('name', { ascending: true });
        }

        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    }

    async getPopularProducts() {
        if (!this.supabase) await this.waitForClient();
        
        const { data, error } = await this.supabase
            .from('products')
            .select('*, categories(name)')
            .eq('status', 'active')
            .eq('popular', true)
            .limit(8);

        if (error) throw error;
        return data;
    }

    async getProduct(id) {
        if (!this.supabase) await this.waitForClient();
        
        const { data, error } = await this.supabase
            .from('products')
            .select('*, categories(name, slug)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    // === CATEGORIES ===
    async getCategories() {
        if (!this.supabase) await this.waitForClient();
        
        const { data, error } = await this.supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    }

    // === ORDERS ===
    async createOrder(orderData) {
        if (!this.supabase) await this.waitForClient();
        
        const { data, error } = await this.supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // === AUTH ===
    async register(userData) {
        if (!this.supabase) await this.waitForClient();
        
        const { data, error } = await this.supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    full_name: userData.full_name,
                    phone: userData.phone
                }
            }
        });

        if (error) throw error;
        return data;
    }

    async login(email, password) {
        if (!this.supabase) await this.waitForClient();
        
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;
        return data;
    }

    async logout() {
        if (!this.supabase) await this.waitForClient();
        
        const { error } = await this.supabase.auth.signOut();
        if (error) throw error;
    }

    getCurrentUser() {
        if (!this.supabase) return null;
        
        const { data } = this.supabase.auth.getUser();
        return data?.user || null;
    }

    // === ADMIN ===
    async adminLogin(email, password) {
        if (!this.supabase) await this.waitForClient();
        
        // Для админов используем отдельную таблицу
        const { data, error } = await this.supabase
            .from('admin_users')
            .select('*')
            .eq('email', email)
            .eq('is_active', true)
            .single();

        if (error) throw error;
        
        // Простая проверка пароля (в продакшене используйте хеширование)
        if (data && data.password_hash === password) {
            return {
                token: btoa(JSON.stringify(data)),
                admin: data
            };
        } else {
            throw new Error('Неверный email или пароль');
        }
    }

    async getDashboardStats() {
        if (!this.supabase) await this.waitForClient();
        
        const [
            ordersCount,
            newOrdersCount,
            totalRevenue,
            productsCount,
            messagesCount,
            usersCount,
            recentOrders,
            popularProducts
        ] = await Promise.all([
            this.supabase.from('orders').select('id', { count: 'exact' }),
            this.supabase.from('orders').select('id', { count: 'exact' }).eq('status', 'new'),
            this.supabase.from('orders').select('total_amount').neq('status', 'cancelled'),
            this.supabase.from('products').select('id', { count: 'exact' }).eq('status', 'active'),
            this.supabase.from('contact_messages').select('id', { count: 'exact' }).eq('status', 'new'),
            this.supabase.from('profiles').select('id', { count: 'exact' }),
            this.supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
            this.supabase.from('products').select('*, categories(name)').eq('popular', true).eq('status', 'active').limit(5)
        ]);

        const revenue = totalRevenue.data?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

        return {
            total_orders: ordersCount.count || 0,
            new_orders: newOrdersCount.count || 0,
            total_revenue: revenue,
            total_products: productsCount.count || 0,
            new_messages: messagesCount.count || 0,
            total_users: usersCount.count || 0,
            recent_orders: recentOrders.data || [],
            popular_products: popularProducts.data || []
        };
    }

    // === CONTACT ===
    async sendMessage(messageData) {
        if (!this.supabase) await this.waitForClient();
        
        const { data, error } = await this.supabase
            .from('contact_messages')
            .insert([messageData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // === UTILS ===
    async waitForClient() {
        return new Promise((resolve) => {
            const checkClient = setInterval(() => {
                if (this.supabase) {
                    clearInterval(checkClient);
                    resolve();
                }
            }, 100);
        });
    }
}

// Создаем глобальный экземпляр
window.supabaseClient = new SupabaseClient();