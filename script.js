console.log('Script principal carregado v2.1');
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
            if (nav) nav.classList.remove('active');
        });
    });

    // --- Global Window Functions (Contact, Product Details) ---
    window.openContactSection = function() {
        console.log('Abrindo seção de contato...');
        const sectionsToHide = ['.hero', '.quick-actions', '.main-content-wrapper', '#categories', '.brands-banner', '.promo-images-container', '#products'];
        sectionsToHide.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = 'none';
        });
        document.getElementById('product-details').style.display = 'none';
        const contactSection = document.getElementById('contact-full-section');
        if (contactSection) contactSection.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        initCalendar();
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeContactSection = function() {
        const sectionsToReveal = ['.hero', '.quick-actions', '.main-content-wrapper', '#categories', '.brands-banner', '.promo-images-container', '#products'];
        sectionsToReveal.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = 'block';
        });
        document.getElementById('contact-full-section').style.display = 'none';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Calendar Logic
    let currentDate = new Date();
    let selectedDate = null;

    window.initCalendar = function() {
        renderCalendar();
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        if (prevBtn) prevBtn.onclick = () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        };
        if (nextBtn) nextBtn.onclick = () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        };
    }

    function renderCalendar() {
        const monthYear = document.getElementById('current-month-year');
        const daysContainer = document.getElementById('calendar-days');
        if (!monthYear || !daysContainer) return;
        
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthYear.textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate);
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        daysContainer.innerHTML = '';
        for (let i = 0; i < firstDay; i++) { daysContainer.innerHTML += '<div></div>'; }
        
        const today = new Date();
        for (let d = 1; d <= daysInMonth; d++) {
            const checkDate = new Date(year, month, d);
            const isToday = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
            const isSelected = selectedDate && selectedDate.getDate() === d && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
            
            const dayEl = document.createElement('div');
            dayEl.className = `calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`;
            dayEl.textContent = d;
            
            if (checkDate < today.setHours(0,0,0,0)) {
                dayEl.classList.add('disabled');
            } else {
                dayEl.onclick = () => selectDate(year, month, d);
            }
            daysContainer.appendChild(dayEl);
        }
    }

    function selectDate(y, m, d) {
        selectedDate = new Date(y, m, d);
        renderCalendar();
        const feedback = document.getElementById('schedule-feedback');
        const text = document.getElementById('selected-date-text');
        if (feedback) feedback.style.display = 'flex';
        if (text) text.textContent = `Data: ${selectedDate.toLocaleDateString('pt-BR')}`;
    }

    window.sendScheduleRequest = function() {
        if (!selectedDate) return;
        const dateStr = selectedDate.toLocaleDateString('pt-BR');
        const message = encodeURIComponent(`Olá! Gostaria de agendar uma manutenção/revisão na Bom Clima para a data: *${dateStr}*. Como podemos confirmar?`);
        window.open(`https://wa.me/557381203737?text=${message}`, '_blank');
    };

    // Product Data
    let products = [];
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000' 
        : 'https://api-production-ef9c.up.railway.app'; 
    
    async function loadProducts() {
        let localProducts = [];
        let apiProducts = [];
        try {
            const response = await fetch('./products_data.json');
            if (response.ok) {
                localProducts = await response.json();
                processProducts(localProducts, []); 
            }
        } catch (e) {
            const localData = localStorage.getItem('bomclima_products');
            if (localData) localProducts = JSON.parse(localData);
            processProducts(localProducts, []);
        }
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const apiResponse = await fetch(`${API_URL}/api/products`, { signal: controller.signal });
            clearTimeout(timeout);
            if (apiResponse.ok) {
                apiProducts = await apiResponse.json();
                if (apiProducts.length > 0) {
                    processProducts(localProducts, apiProducts);
                }
            }
        } catch (e) {
            console.log("API offline or slow, using local data.");
        }
    }

    function processProducts(jsonList, apiList) {
        const mergedMap = new Map();
        jsonList.forEach(p => mergedMap.set(p.id.toString(), p));
        apiList.forEach(p => mergedMap.set(p.id.toString(), p));
        const rawProducts = Array.from(mergedMap.values());
        products = rawProducts.map(p => ({
            ...p,
            category: Array.isArray(p.categories) ? p.categories[0] : (p.category || 'Geral'),
            image: p.imageName ? (p.imageName.startsWith('data:image') ? p.imageName : `./uploads/${p.imageName}`) : "./assets/compressor-1.png",
            rating: 5,
            tags: p.tags || []
        }));
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

    window.addEventListener('storage', (e) => {
        if (e.key === 'bomclima_products') {
            loadProducts();
        }
    });

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

    function renderCategories() {
        const grid = document.getElementById('dynamic-categories-grid');
        if (!grid) return;
        let allCats = [...new Set(products.map(p => p.category))];
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

    function renderFeaturedProducts() {
        const grid = document.getElementById('featured-products-grid');
        if (!grid) return;
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

    function renderSaleProducts() {
        const grid = document.getElementById('sale-products-grid');
        if (!grid) return;
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

    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const section = document.getElementById('products');
            if (query.length > 0) {
                const rect = section.getBoundingClientRect();
                if (rect.top > window.innerHeight || rect.bottom < 0) { section.scrollIntoView({ behavior: 'smooth' }); }
                renderProductsBySearch(query);
            } else {
                const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'popular';
                renderProducts(activeTab);
            }
        });
    }

    window.renderProductsBySearch = function(query) {
        const productsGrid = document.querySelector('.products-grid');
        if (!productsGrid) return;
        productsGrid.innerHTML = '';
        const filtered = products.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query) || (p.brand && p.brand.toLowerCase().includes(query)));
        if (filtered.length === 0) {
            productsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #6B7280;">Nenhum produto encontrado para sua busca.</div>';
            return;
        }
        filtered.slice(0, 100).forEach(product => renderSingleProduct(productsGrid, product));
        if (window.lucide) window.lucide.createIcons();
    };

    const btnShowAll = document.getElementById('btn-show-all');
    if (btnShowAll) {
        btnShowAll.addEventListener('click', () => {
            const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'popular';
            const query = searchInput?.value.toLowerCase().trim();
            let filtered = products;
            if (query) {
                filtered = products.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query) || (p.brand && p.brand.toLowerCase().includes(query)));
            } else if (activeTab !== 'all') {
                filtered = products.filter(p => p.tags.includes(activeTab) || p.category === activeTab);
            }
            const productsGrid = document.querySelector('.products-grid');
            productsGrid.innerHTML = '';
            filtered.forEach(product => renderSingleProduct(productsGrid, product));
            btnShowAll.style.display = 'none';
            if (window.lucide) window.lucide.createIcons();
        });
    }

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
                <div class="product-rating">${getStars(product.rating)}</div>
                <div class="product-footer">
                    <div style="display: flex; flex-direction: column;">
                        ${hasPromo ? `<span style="font-size: 0.75rem; color: #ef4444; text-decoration: line-through;">${product.price}</span>` : ''}
                        <span class="product-price">${hasPromo ? product.promoPrice : product.price}</span>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="showProductDetails(${product.id})" style="padding: 0.5rem 1rem; font-size: 0.8rem;">Ver Detalhes</button>
                </div>
            </div>
        `;
        container.appendChild(productCard);
    }

    window.renderProducts = function(filter = 'popular') {
        const productsGrid = document.querySelector('.products-grid');
        if (!productsGrid) return;
        productsGrid.innerHTML = '';
        if (btnShowAll) btnShowAll.style.display = 'inline-block';
        let filtered = products;
        if (filter !== 'all') { filtered = products.filter(p => p.tags.includes(filter) || p.category === filter); }
        filtered.slice(0, 20).forEach(product => renderSingleProduct(productsGrid, product));
        if (window.lucide) window.lucide.createIcons();
    }

    window.renderProductsByCategory = function(cat) {
        const section = document.getElementById('products');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
        renderProducts(cat);
    };

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
        window.location.href = 'contato.html';
    };

    function renderBackorderProducts() {
        const grid = document.getElementById('backorder-products-grid');
        if (!grid) return;
        const backorder = products.filter(p => p.stockStatus === 'onbackorder' || p.stock === 0).slice(0, 9);
        grid.innerHTML = backorder.map(p => `
            <div class="product-card" data-aos="fade-up">
                <div class="product-image-container">
                    <span class="product-badge" style="background: #F59E0B;">Em Breve</span>
                    <img src="${p.image}" alt="${p.name}" class="product-image">
                </div>
                <div class="product-info">
                    <h3 class="product-title">${p.name}</h3>
                    <div style="margin-bottom: 1rem;"><span class="product-price">${p.price}</span></div>
                    <button class="btn btn-primary btn-sm" onclick="showProductDetails(${p.id})" style="width: 100%;">Ver Detalhes</button>
                </div>
            </div>
        `).join('');
    }

    let cart = JSON.parse(localStorage.getItem('bomclima_cart')) || [];
    let currentUser = JSON.parse(localStorage.getItem('bomclima_user')) || null;
    let currentOpenProductId = null;

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
            if (existing) { existing.quantity += 1; } 
            else {
                cart.push({ id: product.id, name: product.name, price: product.promoPrice && product.promoPrice !== 'R$ 0,00' ? product.promoPrice : product.price, image: product.image, quantity: 1, sku: product.sku });
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
            addToCartCurrentProduct();
        } else { alert('Por favor, informe seu nome e WhatsApp.'); }
    };

    function saveCart() { localStorage.setItem('bomclima_cart', JSON.stringify(cart)); }

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
                <button onclick="removeFromCart(${index})" style="background: none; border: none; color: #EF4444; cursor: pointer;"><i data-lucide="trash-2" style="width: 18px;"></i></button>
            </div>
        `).join('');
        calculateCartTotal();
        if (window.lucide) window.lucide.createIcons();
    }

    window.updateCartItemQty = function(index, delta) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) { cart.splice(index, 1); }
        saveCart(); updateHeaderCartCount(); renderCart(); syncOrderToDashboard();
    };

    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        saveCart(); updateHeaderCartCount(); renderCart(); syncOrderToDashboard();
    };

    function calculateCartTotal() {
        let total = 0;
        cart.forEach(item => {
            const cleanPrice = parseFloat(item.price.replace(/[^\d,]/g, '').replace(',', '.'));
            if (!isNaN(cleanPrice)) { total += cleanPrice * item.quantity; }
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
        syncOrderToDashboard(true);
    };

    async function syncOrderToDashboard(finalized = false) {
        if (!currentUser) return;
        const orderData = { id: currentUser.whatsapp, customer: currentUser.name, whatsapp: currentUser.whatsapp, items: cart, total: document.getElementById('cart-total')?.textContent || 'R$ 0,00', status: finalized ? 'finalized' : 'browsing' };
        const orders = JSON.parse(localStorage.getItem('bomclima_pending_orders')) || [];
        const existingIndex = orders.findIndex(o => o.id === orderData.id);
        if (existingIndex > -1) { orders[existingIndex] = { ...orderData, lastUpdate: new Date().toISOString() }; } 
        else { orders.push({ ...orderData, lastUpdate: new Date().toISOString() }); }
        localStorage.setItem('bomclima_pending_orders', JSON.stringify(orders));
        window.dispatchEvent(new Event('storage'));
        try {
            await fetch(`${API_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
        } catch (e) { console.error('Erro ao sincronizar pedido:', e); }
    }

    window.showProductDetails = function(productId) {
        console.log('showProductDetails chamado com ID:', productId);
        currentOpenProductId = productId;
        const product = products.find(p => p.id == productId); // Use == for flexible type matching
        if (!product) {
            console.error('Produto não encontrado:', productId, 'IDs disponíveis:', products.map(p => p.id));
            return;
        }
        console.log('Produto encontrado:', product.name);
        const hasPromo = product.promoPrice && product.promoPrice !== product.price && product.promoPrice !== 'R$ 0,00';
        const sectionsToHide = ['.hero', '.quick-actions', '.main-content-wrapper', '#categories', '.brands-banner', '.promo-images-container'];
        sectionsToHide.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = 'none';
        });
        const detailSection = document.getElementById('product-details');
        if (detailSection) detailSection.style.display = 'block';
        document.getElementById('detail-image').src = product.image;
        document.getElementById('detail-category').textContent = product.category;
        document.getElementById('detail-title').textContent = product.name;
        document.getElementById('detail-price').innerHTML = `
            ${hasPromo ? `<span style="font-size: 1rem; color: #ef4444; text-decoration: line-through; margin-right: 10px;">${product.price}</span>` : ''}
            <span>${hasPromo ? product.promoPrice : product.price}</span>
        `;
        document.getElementById('detail-rating').innerHTML = getStars(product.rating);
        const descEl = document.getElementById('detail-description');
        if (product.description) { descEl.innerHTML = product.description.replace(/rn/g, '<br>').replace(/\\r\\n/g, '<br>'); } 
        else { descEl.textContent = 'Sem descrição disponível.'; }
        const specsList = document.getElementById('detail-specs');
        const stockDisplay = product.stock > 0 ? `${product.stock} unidades` : 'Consulte disponibilidade';
        specsList.innerHTML = `<li><i data-lucide="hash"></i> SKU: ${product.sku || 'N/A'}</li><li><i data-lucide="tag"></i> Marca: ${product.brand || 'Original'}</li><li><i data-lucide="package"></i> Estoque: ${stockDisplay}</li>`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeProductDetails = function() {
        const sectionsToReveal = ['.hero', '.quick-actions', '.main-content-wrapper', '#categories', '.brands-banner', '.promo-images-container'];
        sectionsToReveal.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) el.style.display = 'block';
        });
        document.getElementById('product-details').style.display = 'none';
        const productsSection = document.getElementById('products');
        if (productsSection) productsSection.scrollIntoView({ behavior: 'smooth' });
    };

    window.placeOrder = function() {
        const productTitle = document.getElementById('detail-title').textContent;
        const productPrice = document.getElementById('detail-price').textContent.trim();
        const specsText = document.getElementById('detail-specs').innerText;
        const skuMatch = specsText.match(/SKU: (.*)/);
        const sku = skuMatch ? skuMatch[1] : 'N/A';
        const message = encodeURIComponent(`Olá! Gostaria de realizar o pedido do produto:\n📦 *${productTitle}*\n🔢 SKU: ${sku}\n💰 Preço: ${productPrice.replace(/\s+/g, ' ')}\n\nPode me ajudar com a disponibilidade?`);
        window.open(`https://wa.me/557381203737?text=${message}`, '_blank');
    };

    renderProducts();

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.getAttribute('data-tab');
            renderProducts(filter);
        });
    });

    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (window.scrollY > 50) { header.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; } 
        else { header.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'; }
    });

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
            if (sliderInner) { sliderInner.style.transform = `translateX(-${currentSlide * 100}%)`; }
            slides.forEach(s => s.classList.remove('active')); dots.forEach(d => d.classList.remove('active'));
            if (slides[currentSlide]) slides[currentSlide].classList.add('active');
            if (dots[currentSlide]) dots[currentSlide].classList.add('active');
        }
        function nextSlide() { showSlide(currentSlide + 1); }
        function prevSlide() { showSlide(currentSlide - 1); }
        function startAutoSlide() { stopAutoSlide(); slideInterval = setInterval(nextSlide, 6000); }
        function stopAutoSlide() { clearInterval(slideInterval); }
        if (slides.length > 0) {
            if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); startAutoSlide(); });
            if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); startAutoSlide(); });
            dots.forEach((dot, index) => { dot.addEventListener('click', () => { showSlide(index); startAutoSlide(); }); });
            slider.addEventListener('mouseenter', stopAutoSlide); slider.addEventListener('mouseleave', startAutoSlide);
            startAutoSlide();
        }
    }
    initSlider('.hero-slider:not(.brands-slider)');
    initSlider('.brands-slider');

    window.openCheckout = function() {
        console.log('openCheckout chamado. currentOpenProductId:', currentOpenProductId);
        if (!currentOpenProductId) {
            console.error('currentOpenProductId está nulo!');
            return;
        }
        const product = products.find(p => p.id == currentOpenProductId); // Use ==
        if (!product) {
            console.error('Produto não encontrado no array products para o ID:', currentOpenProductId);
            return;
        }
        
        const priceStr = product.promoPrice && product.promoPrice !== 'R$ 0,00' ? product.promoPrice : product.price;
        const totalEl = document.getElementById('checkout-total');
        if (totalEl) totalEl.textContent = priceStr;
        
        // Auto-fill from current user if exists
        if (currentUser) {
            const nameField = document.getElementById('checkout-name');
            const phoneField = document.getElementById('checkout-phone');
            if (nameField) nameField.value = currentUser.name || '';
            if (phoneField) phoneField.value = currentUser.whatsapp || '';
        }
        
        const modal = document.getElementById('checkout-modal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('Modal aberto com sucesso.');
        } else {
            console.error('Elemento #checkout-modal não encontrado no DOM!');
        }
        
        if (window.lucide) window.lucide.createIcons();
    };

    window.closeCheckout = function() {
        document.getElementById('checkout-modal').style.display = 'none';
    };

    window.searchCEP = async function(cep) {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;
        
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                document.getElementById('checkout-street').value = data.logradouro;
                document.getElementById('checkout-district').value = data.bairro;
                document.getElementById('checkout-city').value = data.localidade;
                document.getElementById('checkout-uf').value = data.uf;
                document.getElementById('checkout-number').focus();
            }
        } catch (e) {
            console.error('Erro ao buscar CEP:', e);
        }
    };

    window.submitPayment = async function(event) {
        event.preventDefault();
        const product = products.find(p => p.id == currentOpenProductId);
        if (!product) {
            console.error('Produto não encontrado ao enviar pagamento:', currentOpenProductId);
            return;
        }

        const orderData = {
            id: 'ORD-' + Date.now(),
            customer: document.getElementById('checkout-name').value,
            whatsapp: document.getElementById('checkout-phone').value,
            items: [{
                id: product.id,
                name: product.name,
                price: product.promoPrice && product.promoPrice !== 'R$ 0,00' ? product.promoPrice : product.price,
                quantity: 1,
                sku: product.sku
            }],
            total: document.getElementById('checkout-total').textContent,
            status: 'paid',
            cpf_cnpj: document.getElementById('checkout-cpf').value,
            email: document.getElementById('checkout-email').value,
            phone: document.getElementById('checkout-phone').value,
            cep: document.getElementById('checkout-cep').value,
            street: document.getElementById('checkout-street').value,
            number: document.getElementById('checkout-number').value,
            district: document.getElementById('checkout-district').value,
            city: document.getElementById('checkout-city').value,
            uf: document.getElementById('checkout-uf').value,
            payment_status: 'paid',
            invoice_status: 'pending'
        };

        try {
            const response = await fetch(`${API_URL}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                closeCheckout();
                document.getElementById('success-modal').style.display = 'flex';
                if (window.lucide) window.lucide.createIcons();
            } else {
                alert('Erro ao processar pedido. Tente novamente.');
            }
        } catch (e) {
            console.error('Erro ao enviar pedido:', e);
            alert('Erro de conexão com o servidor.');
        }
    };

    window.closeSuccessModal = function() {
        document.getElementById('success-modal').style.display = 'none';
        const name = document.getElementById('checkout-name').value;
        const total = document.getElementById('checkout-total').textContent;
        const message = encodeURIComponent(`Olá! Acabei de realizar o pagamento do pedido no valor de ${total}. Meu nome é ${name}. Aguardo a confirmação!`);
        window.open(`https://wa.me/557381203737?text=${message}`, '_blank');
        closeProductDetails();
    };

    if (typeof AOS !== 'undefined') { AOS.init({ duration: 800, once: true, offset: 100 }); }

});
