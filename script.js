document.addEventListener('DOMContentLoaded', () => {
    
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
        });
    });

    // Product Data
    let products = [];
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' 
        : 'https://mysql-production-c17b.up.railway.app'; // Railway API
    
    async function loadProducts() {
        // Priority 1: Load from local JSON immediately (always available)
        try {
            const response = await fetch('./products_data.json');
            if (response.ok) {
                processProducts(await response.json());
            }
        } catch (e) {
            // Try localStorage fallback
            const localData = localStorage.getItem('bomclima_products');
            if (localData) processProducts(JSON.parse(localData));
        }

        // Priority 2: Try Railway API in background to get latest data
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const apiResponse = await fetch(`${API_URL}/api/products`, { signal: controller.signal });
            clearTimeout(timeout);
            if (apiResponse.ok) {
                const apiProducts = await apiResponse.json();
                if (apiProducts.length > 0) {
                    processProducts(apiProducts);
                }
            }
        } catch (e) {
            // API unavailable, already showing products from JSON
        }
    }

    function processProducts(rawProducts) {
        products = rawProducts.map(p => ({
            ...p,
            category: Array.isArray(p.categories) ? p.categories[0] : (p.category || 'Geral'),
            image: p.imageName ? (p.imageName.startsWith('data:image') ? p.imageName : `./uploads/${p.imageName}`) : "./assets/compressor-1.png",
            rating: 5,
            tags: p.tags || []
        }));

        // Set some random tags for filtering demo if none exist
        products.forEach((p, i) => {
            if (!p.tags || p.tags.length === 0) {
                p.tags = [];
                if (i % 3 === 0) p.tags.push('popular');
                if (i % 5 === 0) p.tags.push('featured');
                if (i % 7 === 0) p.tags.push('new');
            }
        });

        renderAll();
    }

    function renderAll() {
        renderCategories();
        renderFeaturedProducts();
        renderSaleProducts();
        renderProducts('popular');
    }

    loadProducts();

    // Re-load if dashboard updates data
    window.addEventListener('storage', (e) => {
        if (e.key === 'bomclima_products') {
            loadProducts();
        }
    });

    // Function to generate stars
    function getStars(rating) {
        let starsHtml = '';
        for (let i = 0; i < 5; i++) {
             if (i < rating) {
                starsHtml += '<i data-lucide="star" class="star filled" style="fill: #F59E0B; color: #F59E0B;"></i>';
             } else {
                 starsHtml += '<i data-lucide="star" class="star" style="color: #D1D5DB;"></i>';
             }
        }
        return starsHtml;
    }

    // Dynamic Categories
    function renderCategories() {
        const grid = document.getElementById('dynamic-categories-grid');
        if (!grid) return;
        
        let allCats = [...new Set(products.map(p => p.category))];
        
        // Ensure "Evaporador" is in the top if it exists
        const evapIndex = allCats.findIndex(c => c.toLowerCase() === 'evaporador');
        if (evapIndex > -1) {
            const evap = allCats.splice(evapIndex, 1)[0];
            allCats.unshift(evap);
        }

        const cats = allCats.slice(0, 12);
        const icons = ['droplet', 'disc', 'settings', 'wrench', 'battery-charging', 'search', 'fan', 'activity', 'tool', 'layers', 'box', 'truck'];
        
        grid.innerHTML = cats.map((cat, i) => `
            <div class="category-card" onclick="renderProductsByCategory('${cat}')" style="cursor: pointer;">
                <i data-lucide="${icons[i % icons.length]}" class="cat-icon"></i>
                <h3>${cat}</h3>
                <p>Peças e acessórios</p>
            </div>
        `).join('');
        
        if (window.lucide) window.lucide.createIcons();
    }

    // Featured Products (First Slider)
    function renderFeaturedProducts() {
        const grid = document.getElementById('featured-products-grid');
        if (!grid) return;
        
        // Pick some featured items (or those with 'featured' tag)
        const featured = products.filter(p => p.tags.includes('featured')).slice(0, 8);
        
        grid.innerHTML = featured.map(p => {
            const hasPromo = p.promoPrice && p.promoPrice !== p.price && p.promoPrice !== 'R$ 0,00';
            return `
                <div class="product-card-featured" data-aos="fade-up">
                    <div class="product-image-container">
                        <img src="${p.image}" alt="${p.name}" class="product-img">
                        ${hasPromo ? '<span class="product-badge" style="background: #ef4444;">Oferta</span>' : ''}
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${p.name}</h3>
                        <div class="product-price-box">
                            ${hasPromo ? `<span class="old-price">${p.price}</span>` : ''}
                            <span class="current-price">${hasPromo ? p.promoPrice : p.price}</span>
                        </div>
                        <button class="btn btn-primary btn-sm" onclick="showProductDetails(${p.id})" style="padding: 0.5rem 1rem; font-size: 0.8rem; width: 100%;">
                            Ver Detalhes
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Sale Products (Second Slider)
    function renderSaleProducts() {
        const grid = document.getElementById('sale-products-grid');
        if (!grid) return;
        
        // Items where promoPrice != price
        const sales = products.filter(p => p.promoPrice && p.promoPrice !== p.price && p.promoPrice !== 'R$ 0,00').slice(0, 8);
        
        grid.innerHTML = sales.map(p => `
            <div class="product-card-featured" data-aos="fade-up">
                <div class="product-image-container">
                    <img src="${p.image}" alt="${p.name}" class="product-img">
                    <span class="product-badge" style="background: #ef4444;">Promoção</span>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${p.name}</h3>
                    <div class="product-price-box">
                        <span class="old-price">${p.price}</span>
                        <span class="current-price">${p.promoPrice}</span>
                    </div>
                    <button class="add-to-cart-btn" onclick="showProductDetails(${p.id})">Ver Detalhes</button>
                </div>
            </div>
        `).join('');
    }

    // Global Search Logic
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const section = document.getElementById('products');
            
            if (query.length > 0) {
                // Scroll to products if not already there
                const rect = section.getBoundingClientRect();
                if (rect.top > window.innerHeight || rect.bottom < 0) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
                
                // Filter and Render
                renderProductsBySearch(query);
            } else {
                // Revert to active tab
                const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'popular';
                renderProducts(activeTab);
            }
        });
    }

    window.renderProductsBySearch = function(query) {
        const productsGrid = document.querySelector('.products-grid');
        if (!productsGrid) return;
        productsGrid.innerHTML = '';
        
        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.category.toLowerCase().includes(query) ||
            p.brand.toLowerCase().includes(query)
        );
        
        if (filtered.length === 0) {
            productsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6B7280;">Nenhum produto encontrado para sua busca.</div>';
            return;
        }

        // Show first 100 on search
        filtered.slice(0, 100).forEach(product => renderSingleProduct(productsGrid, product));
        if (window.lucide) window.lucide.createIcons();
    };

    // Show All Functionality
    const btnShowAll = document.getElementById('btn-show-all');
    if (btnShowAll) {
        btnShowAll.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'popular';
            const query = searchInput?.value.toLowerCase().trim();
            
            let filtered = products;
            if (query) {
                filtered = products.filter(p => 
                    p.name.toLowerCase().includes(query) || 
                    p.category.toLowerCase().includes(query) ||
                    p.brand.toLowerCase().includes(query)
                );
            } else if (activeTab !== 'all') {
                filtered = products.filter(p => p.tags.includes(activeTab) || p.category === activeTab);
            }
            
            const productsGrid = document.querySelector('.products-grid');
            productsGrid.innerHTML = '';
            filtered.forEach(product => renderSingleProduct(productsGrid, product));
            
            // Hide button after showing all
            btnShowAll.style.display = 'none';
            if (window.lucide) window.lucide.createIcons();
        });
    }

    // Helper for rendering a single product card
    function renderSingleProduct(container, product) {
        const hasPromo = product.promoPrice && product.promoPrice !== product.price && product.promoPrice !== 'R$ 0,00';
        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        
        productCard.innerHTML = `
            <div class="product-image-container">
                <span class="product-badge">${product.category}</span>
                <img src="${product.image}" alt="${product.name}" class="product-image">
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.name}</h3>
                <div class="product-rating">
                    ${getStars(product.rating)}
                </div>
                <div class="product-footer">
                    <div style="display: flex; flex-direction: column;">
                        ${hasPromo ? `<span style="font-size: 0.75rem; color: #ef4444; text-decoration: line-through;">${product.price}</span>` : ''}
                        <span class="product-price">${hasPromo ? product.promoPrice : product.price}</span>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="showProductDetails(${product.id})" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                         Ver Detalhes
                    </button>
                </div>
            </div>
        `;
        container.appendChild(productCard);
    }

    // Main Product Grid (Updated to use helper)
    window.renderProducts = function(filter = 'popular') {
        const productsGrid = document.querySelector('.products-grid');
        if (!productsGrid) return;
        productsGrid.innerHTML = '';
        
        // Reset "Ver Tudo" button visibility
        if (btnShowAll) btnShowAll.style.display = 'inline-block';
        
        let filtered = products;
        if (filter !== 'all') {
            filtered = products.filter(p => p.tags.includes(filter) || p.category === filter);
        }
        
        // Show first 20 for performance (can expand with show all)
        filtered.slice(0, 20).forEach(product => renderSingleProduct(productsGrid, product));
        if (window.lucide) window.lucide.createIcons();
    }

    window.renderProductsByCategory = function(cat) {
        const section = document.getElementById('products');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
        renderProducts(cat);
    };

    // Quick Action Handlers
    window.showBackorderSection = function() {
        const section = document.getElementById('backorder-section');
        const viewAll = document.getElementById('backorder-view-all');
        if (section) {
            section.style.display = 'block';
            if (viewAll) viewAll.style.display = 'block';
            renderBackorderProducts();
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.scrollToFeatured = function() {
        const section = document.querySelector('.featured-slider-container');
        if (section) {
            // Scroll a bit less to show title
            const rect = section.getBoundingClientRect();
            const top = rect.top + window.pageYOffset - 100;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    window.openChecklistWhatsApp = function() {
        const message = encodeURIComponent('Olá! Gostaria de receber o Checklist Mecânico da Bom Clima.');
        window.open(`https://wa.me/557381203737?text=${message}`, '_blank');
    };

    window.filterByEvaporador = function() {
        const section = document.getElementById('products');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
        renderProducts('Evaporador');
    };

    window.scrollToContact = function() {
        const footer = document.querySelector('footer');
        if (footer) footer.scrollIntoView({ behavior: 'smooth' });
    };

    // Backorder Products Rendering
    function renderBackorderProducts() {
        const grid = document.getElementById('backorder-products-grid');
        if (!grid) return;

        // In products_data.json, stockStatus might be "onbackorder"
        // Or we can check if stock is 0 but it's "em breve"
        const backorder = products.filter(p => p.stockStatus === 'onbackorder' || p.stock === 0).slice(0, 9);
        
        grid.innerHTML = backorder.map(p => `
            <div class="product-card" data-aos="fade-up">
                <div class="product-image-container">
                    <span class="product-badge" style="background: #F59E0B;">Em Breve</span>
                    <img src="${p.image}" alt="${p.name}" class="product-image">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${p.name}</h3>
                    <div style="margin-bottom: 1rem;">
                        <span class="product-price">${p.price}</span>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="showProductDetails(${p.id})" style="width: 100%;">
                        Ver Detalhes
                    </button>
                </div>
            </div>
        `).join('');
    }

    // --- Cart & User Logic ---
    let cart = JSON.parse(localStorage.getItem('bomclima_cart')) || [];
    let currentUser = JSON.parse(localStorage.getItem('bomclima_user')) || null;
    let currentOpenProductId = null;

    // Initialize Header Cart Count
    updateHeaderCartCount();

    window.toggleCartSidebar = function() {
        const sidebar = document.getElementById('cart-sidebar');
        if (sidebar) {
            const currentRight = sidebar.style.right;
            sidebar.style.right = (currentRight === '0px') ? '-400px' : '0px';
            if (sidebar.style.right === '0px') renderCart();
        }
    };

    window.addToCartCurrentProduct = function() {
        if (!currentUser) {
            document.getElementById('user-data-modal').style.display = 'flex';
            return;
        }
        
        const product = products.find(p => p.id === currentOpenProductId);
        if (product) {
            const existing = cart.find(item => item.id === product.id);
            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({
                    id: product.id,
                    name: product.name,
                    price: product.promoPrice && product.promoPrice !== 'R$ 0,00' ? product.promoPrice : product.price,
                    image: product.image,
                    quantity: 1,
                    sku: product.sku
                });
            }
            saveCart();
            updateHeaderCartCount();
            toggleCartSidebar();
            syncOrderToDashboard();
        }
    };

    window.saveUserData = function() {
        const name = document.getElementById('user-name').value.trim();
        const whatsapp = document.getElementById('user-whatsapp').value.trim();
        
        if (name && whatsapp) {
            currentUser = { name, whatsapp };
            localStorage.setItem('bomclima_user', JSON.stringify(currentUser));
            document.getElementById('user-data-modal').style.display = 'none';
            // Resume adding to cart
            addToCartCurrentProduct();
        } else {
            alert('Por favor, informe seu nome e WhatsApp.');
        }
    };

    function saveCart() {
        localStorage.setItem('bomclima_cart', JSON.stringify(cart));
    }

    function updateHeaderCartCount() {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        const el = document.getElementById('header-cart-count');
        if (el) el.textContent = count;
    }

    function renderCart() {
        const container = document.getElementById('cart-items');
        if (!container) return;
        
        if (cart.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6B7280; margin-top: 2rem;">Seu carrinho está vazio.</p>';
            document.getElementById('cart-total').textContent = 'R$ 0,00';
            return;
        }

        container.innerHTML = cart.map((item, index) => `
            <div class="cart-item" style="display: flex; gap: 1rem; margin-bottom: 1.5rem; align-items: center;">
                <img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
                <div style="flex: 1;">
                    <h4 style="font-size: 0.9rem; margin-bottom: 0.2rem;">${item.name}</h4>
                    <p style="font-weight: 700; color: #1E3A8A;">${item.price}</p>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.3rem;">
                        <button onclick="updateCartItemQty(${index}, -1)" style="padding: 0.2rem 0.5rem;">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartItemQty(${index}, 1)" style="padding: 0.2rem 0.5rem;">+</button>
                    </div>
                </div>
                <button onclick="removeFromCart(${index})" style="background: none; border: none; color: #EF4444; cursor: pointer;">
                    <i data-lucide="trash-2" style="width: 18px;"></i>
                </button>
            </div>
        `).join('');
        
        calculateCartTotal();
        if (window.lucide) window.lucide.createIcons();
    }

    window.updateCartItemQty = function(index, delta) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart();
        updateHeaderCartCount();
        renderCart();
        syncOrderToDashboard();
    };

    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        saveCart();
        updateHeaderCartCount();
        renderCart();
        syncOrderToDashboard();
    };

    function calculateCartTotal() {
        let total = 0;
        cart.forEach(item => {
            const cleanPrice = parseFloat(item.price.replace(/[^\d,]/g, '').replace(',', '.'));
            if (!isNaN(cleanPrice)) {
                total += cleanPrice * item.quantity;
            }
        });
        document.getElementById('cart-total').textContent = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    window.finalizeOrder = function() {
        if (cart.length === 0) return;
        
        let message = `Olá! Sou *${currentUser.name}* e gostaria de realizar o pedido dos seguintes itens:\n\n`;
        cart.forEach(item => {
            message += `📦 *${item.name}* (x${item.quantity}) - ${item.price}\n`;
            if (item.sku) message += `🔢 SKU: ${item.sku}\n`;
            message += `\n`;
        });
        
        message += `Total Estimado: *${document.getElementById('cart-total').textContent}*`;
        
        const encMessage = encodeURIComponent(message);
        window.open(`https://wa.me/557381203737?text=${encMessage}`, '_blank');
        
        // Mark as finalized in sync
        syncOrderToDashboard(true);
    };

    async function syncOrderToDashboard(finalized = false) {
        if (!currentUser) return;
        
        const orderData = {
            id: currentUser.whatsapp,
            customer: currentUser.name,
            whatsapp: currentUser.whatsapp,
            items: cart,
            total: document.getElementById('cart-total')?.textContent || 'R$ 0,00',
            status: finalized ? 'finalized' : 'browsing'
        };

        // 1. Sync to LocalStorage (for local dashboard tab)
        const orders = JSON.parse(localStorage.getItem('bomclima_pending_orders')) || [];
        const existingIndex = orders.findIndex(o => o.id === orderData.id);
        if (existingIndex > -1) {
            orders[existingIndex] = { ...orderData, lastUpdate: new Date().toISOString() };
        } else {
            orders.push({ ...orderData, lastUpdate: new Date().toISOString() });
        }
        localStorage.setItem('bomclima_pending_orders', JSON.stringify(orders));
        window.dispatchEvent(new Event('storage'));

        // 2. Sync to Railway API
        try {
            await fetch(`${API_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
        } catch (e) {
            console.error('Erro ao sincronizar pedido com o servidor Railway:', e);
        }
    }

    // --- End Cart Logic ---

    // Global Functions for exposure to inline onclick
    window.showProductDetails = function(productId) {
        currentOpenProductId = productId;
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const hasPromo = product.promoPrice && product.promoPrice !== product.price && product.promoPrice !== 'R$ 0,00';

        // Hide main homepage sections
        const sectionsToHide = ['.hero', '.quick-actions', '.main-content-wrapper', '#categories', '.brands-banner', '.promo-images-container'];
        sectionsToHide.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.classList.add('hidden');
        });

        // Show details section
        const detailSection = document.getElementById('product-details');
        detailSection.style.display = 'block';

        // Populate details
        document.getElementById('detail-image').src = product.image;
        document.getElementById('detail-category').textContent = product.category;
        document.getElementById('detail-title').textContent = product.name;
        
        document.getElementById('detail-price').innerHTML = `
            ${hasPromo ? `<span style="font-size: 1rem; color: #ef4444; text-decoration: line-through; margin-right: 10px;">${product.price}</span>` : ''}
            <span>${hasPromo ? product.promoPrice : product.price}</span>
        `;
        
        document.getElementById('detail-rating').innerHTML = getStars(product.rating);
        
        // Description (Handle line breaks from WordPress)
        const descEl = document.getElementById('detail-description');
        if (product.description) {
            descEl.innerHTML = product.description.replace(/rn/g, '<br>').replace(/\\r\\n/g, '<br>');
        } else {
            descEl.textContent = 'Sem descrição disponível.';
        }

        // Specs Update
        const specsList = document.getElementById('detail-specs');
        const stockDisplay = product.stock > 0 ? `${product.stock} unidades` : 'Consulte disponibilidade';
        specsList.innerHTML = `
            <li><i data-lucide="hash"></i> SKU: ${product.sku || 'N/A'}</li>
            <li><i data-lucide="tag"></i> Marca: ${product.brand || 'Original'}</li>
            <li><i data-lucide="package"></i> Estoque: ${stockDisplay}</li>
        `;

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeProductDetails = function() {
        // Show main sections
        const elementsToReveal = document.querySelectorAll('.hidden');
        elementsToReveal.forEach(el => el.classList.remove('hidden'));

        // Hide details
        document.getElementById('product-details').style.display = 'none';
        
        // Scroll back to products
        const productsSection = document.getElementById('products');
        if (productsSection) productsSection.scrollIntoView({ behavior: 'smooth' });
    };

    window.placeOrder = function() {
        const productTitle = document.getElementById('detail-title').textContent;
        const productPrice = document.getElementById('detail-price').textContent.trim();
        const specsText = document.getElementById('detail-specs').innerText;
        const skuMatch = specsText.match(/SKU: (.*)/);
        const sku = skuMatch ? skuMatch[1] : 'N/A';
        
        const message = encodeURIComponent(`Olá! Gostaria de realizar o pedido do produto:
📦 *${productTitle}*
🔢 SKU: ${sku}
💰 Preço: ${productPrice.replace(/\s+/g, ' ')}

Pode me ajudar com a disponibilidade?`);
        window.open(`https://wa.me/557381203737?text=${message}`, '_blank');
    };

    // Initial Render
    renderProducts();

    // Tab Switching
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            // Add to click
            tab.classList.add('active');
            
            const filter = tab.getAttribute('data-tab');
            renderProducts(filter);
        });
    });

    // Cart Simulation
    let cartCount = 0;
    const cartCountEl = document.querySelector('.cart-count');
    
    window.addToCart = function() {
        cartCount++;
        cartCountEl.textContent = cartCount;
        
        // Animation feedback
        cartCountEl.style.transform = 'scale(1.2)';
        setTimeout(() => {
            cartCountEl.style.transform = 'scale(1)';
        }, 200);
    };
    
    // Sticky Header visual effect
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) {
            header.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        }
    });

    // Generic Slider Logic Function
    function initSlider(sliderSelector) {
        const slider = document.querySelector(sliderSelector);
        if (!slider) return;

        const sliderInner = slider.querySelector('.hero-slider-inner');
        const slides = slider.querySelectorAll('.hero-slide');
        const dots = slider.querySelectorAll('.dot');
        const prevBtn = slider.querySelector('.hero-nav.prev');
        const nextBtn = slider.querySelector('.hero-nav.next');
        let currentSlide = 0;
        let slideInterval;

        function showSlide(index) {
            if (!slides.length) return;
            currentSlide = (index + slides.length) % slides.length;
            
            if (sliderInner) {
                sliderInner.style.transform = `translateX(-${currentSlide * 100}%)`;
            }
            
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));
            
            if (slides[currentSlide]) slides[currentSlide].classList.add('active');
            if (dots[currentSlide]) dots[currentSlide].classList.add('active');
        }

        function nextSlide() {
            showSlide(currentSlide + 1);
        }

        function prevSlide() {
            showSlide(currentSlide - 1);
        }

        function startAutoSlide() {
            stopAutoSlide();
            slideInterval = setInterval(nextSlide, 6000); // 6 seconds
        }

        function stopAutoSlide() {
            clearInterval(slideInterval);
        }

        if (slides.length > 0) {
            if (nextBtn) nextBtn.addEventListener('click', () => {
                nextSlide();
                startAutoSlide();
            });
            if (prevBtn) prevBtn.addEventListener('click', () => {
                prevSlide();
                startAutoSlide();
            });

            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    showSlide(index);
                    startAutoSlide();
                });
            });

            slider.addEventListener('mouseenter', stopAutoSlide);
            slider.addEventListener('mouseleave', startAutoSlide);

            startAutoSlide();
        }
    }

    // Initialize both sliders
    initSlider('.hero-slider:not(.brands-slider)');
    initSlider('.brands-slider');

    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }

});
