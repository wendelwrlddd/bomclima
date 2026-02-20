
const FULL_CATEGORIES = [
    "Sem categoria", "BOBINA MAGUINETICA P/C TM15/TM16 24", "Bobina para compressor", "Caixa de teto", 
    "celta", "Chave AC universal", "CHICOTE 5 VIAS", "Chicote bomba ar linha GM", "CHICOTE LINHA GM", 
    "classic", "Comando", "Compressor", "Condensadores", "CONEXAO DE ALUMINIO", "CONEXAO ORING 8X90", 
    "CONEXAO ORING AÇO", "CONEXAO ORING ALUMINIO", "Conjunto de embreagem Hilux", "Copinho clip\\6", 
    "COPINHO CLIP10", "Copinho\\clip8", "cronos", "Eletroventilador", "Eletroventilador Universal", 
    "Evaporador", "Evaporadores", "Evaporarador de celta", "fiesta", "Filtro cabine", "Filtro cabine de kwid", 
    "Filtros Secadores", "HIGIENIZADOR GREEN", "Kit de embreagem", "Kit de ferramentas", "KIT INSTALADOR", 
    "Lâmpada de teste", "linea", "MANGUEIRA", "Manometro Manifold", "Modulo", "Moto ventilador interno constelletion", 
    "Moto ventilador interno Hilux", "Motor da caixa", "Motor da caixa Chevrolet GM", "Motor da caixa evaporador Mercedes Axor", 
    "Motor da caixa Komatsu\\ Hitachi\\ Caterpillar", "Motor ventilador actros", "Motor ventilador interno GM", 
    "Nucleo de valvula", "Nucleo de valvula Ranger", "Óleo Igloo 46", "OLEO IGLOO PRA COMPRESSOR", 
    "OLEO P\\COMPRESSOR PAG 150 937ML", "OLEO P\\COMPRESSOR PEG 100", "Oléo pag 150 sem contraste", 
    "ÓLEO PAG 46 250ML", "ORING 06M", "ORING 10M", "ORING 8M", "PALHETAS COMPRESSORES", "Polia solta", 
    "PORTA FUSÍVEL", "PRESSOSTATO FORD KA", "PRESSOSTATO FORD KA ALTA", "Pressostato Ford Ranger", 
    "PRESSOSTATO GM", "Pressostato GM/ RENAULT", "pressostato gol", "Pressostato peugeot", "Pressostato Unviversal", 
    "propressor", "RELÉ 24V", "RELÉ 70A", "Rele universal 12v", "resistencia", "Resistência do eletroventilador", 
    "Resistencia para caixa evaporadora", "Rolamento 6000", "Rolamentos de compressor", "Rolamentos Vetor", 
    "Selo compressor", "Selo compressor sandem", "SENSOR", "Sensor de temperatura externa peugeot renault citroen", 
    "Sensor de temperatura externo Gm", "sensor de temperatura hyundai", "SENSOR E CHICOTE MERCEDES", 
    "SENSOR EVAPORADOR DO ONIX", "SENSOR EVAPORADOR FLUENCE", "sensor temperatura externa ford Ranger e Fusion", 
    "sensor temperatura externa Jeep", "TAMPA COMPRESSOR", "TAPA FUGAS", "Termostato Eletronico", 
    "Termostato universal", "toro", "TRANSDUTOR AUDI 3 VW", "uniao 10 venil de aço", "UNIAO 12MM", 
    "UNIAO 1OMM", "UNIAO 6MM", "UNIAO 8 COM VENIL ALUMINIO", "UNIAO 8 VENIL AÇO", "UNIAO 8MM", 
    "UNIAO DE VENIL ALUMINIO", "Valvula Block \\caterpilar \\ford\\gol\\palio", "VALVULA BLOCK \\CONSTELETIOON\\IVECO", 
    "Valvula block delivery", "Valvula block Hilux \\toyota", "VALVULA BLOCK VALTRA VW", "Valvula caneta", 
    "Valvula de alta", "VALVULA DE EXPANSAO", "Valvula de expansao \\gol\\fox", "Valvula de expansao \\logan\\sandeiro", 
    "Valvula de torre\\compressor\\7SB16C\\Gol G3\\BMW", "VALVULA ELETRONICA", "VALVULA ELETRONICA \\SENTRA", 
    "Valvula eletronica Mahle\\polo\\virtus", "Valvula Eletronica p\\compressor jetta \\amarok", 
    "Valvula Enchimento de baixa", "VALVULA ETIOS", "Valvula Master\\ Citroen", "valvula mitsubishi\\ pajero", 
    "valvula onix", "VALVULA SD MENOR", "VALVULA TORRE", "Válvula torre maior ACPX7", 
    "VALVULA TORRE P\\COMPRESSOR\\SD SD7V16", "Válvula torre pequena (ACPX3)", "Válvulas de expansão", 
    "VENTILADOR", "VENTILADOR INTERNO AXO ATEGO", "ventilador interno Caminhao MB 1620"
];

class Dashboard {
    constructor() {
        this.products = JSON.parse(localStorage.getItem('bomclima_products')) || [];
        this.history = JSON.parse(localStorage.getItem('bomclima_history')) || [];
        this.filteredProducts = [];
        this.currentView = 'dashboard';
        this.checkAuth();
        this.init();
    }

    checkAuth() {
        const session = JSON.parse(localStorage.getItem('bomclima_auth_session'));
        if (!session || !session.active) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    logout() {
        localStorage.removeItem('bomclima_auth_session');
        window.location.href = 'login.html';
    }

    async init() {
        if (!this.checkAuth()) return;
        
        if (this.products.length === 0) {
            await this.loadInitialData();
        }
        this.filteredProducts = [...this.products];
        this.populateCategoryList();
        this.populateCategoryFilter();
        this.setupTabs();
        this.render();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadInitialData() {
        try {
            const response = await fetch('./products_data.json');
            if (response.ok) {
                const data = await response.json();
                this.products = data;
                this.filteredProducts = [...this.products];
                this.save();
            }
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }

    save() {
        localStorage.setItem('bomclima_products', JSON.stringify(this.products));
        localStorage.setItem('bomclima_history', JSON.stringify(this.history));
        this.updateStats();
        this.populateCategoryFilter();
    }

    setupTabs() {
        const navDashboard = document.getElementById('navDashboard');
        const navHistory = document.getElementById('navHistory');
        const navOrders = document.getElementById('navOrders');
        const dashboardView = document.getElementById('dashboardView');
        const historyView = document.getElementById('historyView');
        const ordersView = document.getElementById('ordersView');

        if (navDashboard && navHistory && navOrders) {
            navDashboard.onclick = (e) => {
                e.preventDefault();
                this.switchView('dashboard', [navDashboard], [navHistory, navOrders], [dashboardView], [historyView, ordersView]);
            };

            navHistory.onclick = (e) => {
                e.preventDefault();
                this.switchView('history', [navHistory], [navDashboard, navOrders], [historyView], [dashboardView, ordersView]);
            };

            navOrders.onclick = (e) => {
                e.preventDefault();
                this.switchView('orders', [navOrders], [navDashboard, navHistory], [ordersView], [dashboardView, historyView]);
                document.getElementById('orderBadge').style.display = 'none';
            };
        }
        
        // Listen for storage changes from the main site
        window.addEventListener('storage', () => {
            this.handleOrderNotification();
            if (this.currentView === 'orders') this.renderOrders();
        });
        
        // Initial check
        this.handleOrderNotification();
    }

    switchView(view, activeNavs, inactiveNavs, activeViews, inactiveViews) {
        this.currentView = view;
        activeNavs.forEach(n => n.classList.add('active'));
        inactiveNavs.forEach(n => n.classList.remove('active'));
        activeViews.forEach(v => v.classList.remove('hidden'));
        inactiveViews.forEach(v => v.classList.add('hidden'));
        
        if (view === 'dashboard') this.render();
        if (view === 'history') this.renderHistory();
        if (view === 'orders') this.renderOrders();
    }

    handleOrderNotification() {
        const orders = JSON.parse(localStorage.getItem('bomclima_pending_orders')) || [];
        const badge = document.getElementById('orderBadge');
        if (badge && orders.length > 0) {
            // Check if there's any order updated in the last 5 minutes
            const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
            const hasRecent = orders.some(o => new Date(o.lastUpdate) > fiveMinsAgo);
            if (hasRecent && this.currentView !== 'orders') {
                badge.style.display = 'block';
            }
        }
    }

    renderOrders() {
        if (this.currentView !== 'orders') return;
        
        const orders = JSON.parse(localStorage.getItem('bomclima_pending_orders')) || [];
        const tableBody = document.getElementById('ordersTableBody');
        const activeCount = document.getElementById('activeCartsCount');
        
        if (activeCount) activeCount.textContent = orders.length;

        if (orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Nenhum pedido ou carrinho ativo no momento.</td></tr>';
            return;
        }

        tableBody.innerHTML = orders.sort((a,b) => new Date(b.lastUpdate) - new Date(a.lastUpdate)).map(o => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition-all">
                <td style="padding: 1rem 1.5rem; font-weight: 600;">${o.customer}</td>
                <td style="padding: 1rem 1.5rem;">${o.whatsapp}</td>
                <td style="padding: 1rem 1.5rem; font-size: 0.8rem; color: #94a3b8;">${new Date(o.lastUpdate).toLocaleString('pt-BR')}</td>
                <td style="padding: 1rem 1.5rem;">
                    <div style="font-size: 0.8rem; max-height: 60px; overflow-y: auto;">
                        ${o.items.map(i => `${i.name} (x${i.quantity})`).join('<br>')}
                    </div>
                </td>
                <td style="padding: 1rem 1.5rem; font-weight: 700; color: #10b981;">${o.total}</td>
                <td style="padding: 1rem 1.5rem;">
                    <span class="badge" style="background: ${o.status === 'finalized' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(37, 99, 235, 0.2)'}; color: ${o.status === 'finalized' ? '#10b981' : '#60a5fa'};">
                        ${o.status === 'finalized' ? 'Finalizado' : 'Navegando'}
                    </span>
                </td>
                <td style="padding: 1rem 1.5rem;">
                    <button class="btn btn-primary btn-sm" onclick="dashboard.contactCustomer('${o.whatsapp}', '${o.customer}')">
                        <i data-lucide="message-circle" style="width: 14px;"></i> Contato
                    </button>
                    <button class="action-btn delete" onclick="dashboard.deleteOrder('${o.id}')" style="margin-left: 0.5rem;">
                        <i data-lucide="trash-2" style="width: 14px;"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    }

    contactCustomer(whatsapp, name) {
        const cleanWpp = whatsapp.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá ${name}! Vi que você adicionou alguns produtos ao carrinho na Bom Clima. Gostaria de ajuda para finalizar seu pedido?`);
        window.open(`https://wa.me/55${cleanWpp}?text=${message}`, '_blank');
    }

    deleteOrder(id) {
        if (confirm('Deseja remover este registro de pedido?')) {
            let orders = JSON.parse(localStorage.getItem('bomclima_pending_orders')) || [];
            orders = orders.filter(o => o.id !== id);
            localStorage.setItem('bomclima_pending_orders', JSON.stringify(orders));
            this.renderOrders();
        }
    }

    populateCategoryList() {
        const modalCat = document.getElementById('category');
        if (!modalCat) return;
        modalCat.innerHTML = FULL_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    populateCategoryFilter() {
        const filter = document.getElementById('categoryFilter');
        if (!filter) return;
        
        const currentVal = filter.value;
        const availableCats = [...new Set(this.products.flatMap(p => p.categories || [p.category]).filter(Boolean))].sort();
        
        filter.innerHTML = '<option value="all">Todas Categorias</option>' + 
            availableCats.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');
        
        filter.onchange = (e) => this.handleFilter();
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '-';
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `Publicado ${day}/${month}/${year} às ${hours}:${minutes}`;
    }

    logEvent(type, product, details = '') {
        const event = {
            id: Date.now(),
            type, // 'create', 'edit', 'delete'
            productName: product.name,
            productId: product.id,
            details,
            timestamp: new Date().toISOString()
        };
        this.history.unshift(event);
        if (this.history.length > 100) this.history.pop();
        this.save();
    }

    render() {
        if (this.currentView !== 'dashboard') return;
        
        const tableBody = document.getElementById('productTableBody');
        tableBody.innerHTML = this.filteredProducts.map(p => {
            let statusText = 'Fora de estoque';
            let statusClass = '#ef4444'; // Red

            if (p.stockStatus === 'onbackorder') {
                statusText = 'Sob Encomenda';
                statusClass = '#f97316'; // Orange
            } else if (p.stock > 0) {
                statusText = `Em estoque (${p.stock})`;
                statusClass = '#10b981'; // Green
            } else if (p.stockStatus === 'instock') {
                statusText = 'Disponível';
                statusClass = '#10b981';
            }

            // Price display logic - Only show sale layout if promoPrice is different from price
            const clean = (val) => val ? val.replace(/\s/g, '').replace('R$', '') : '';
            const isSale = p.promoPrice && p.promoPrice !== '0,00' && clean(p.promoPrice) !== clean(p.price);
            
            let priceHtml = `<span style="font-weight: 600;">${p.price}</span>`;
            if (isSale) {
                priceHtml = `
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 0.75rem; color: #ef4444; text-decoration: line-through;">${p.price}</span>
                        <span style="font-weight: 700; color: #10b981;">${p.promoPrice}</span>
                    </div>
                `;
            }

            return `
                <tr class="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td style="padding: 1rem 0.75rem; text-align: center;">
                        <div class="actions" style="justify-content: center;">
                            <button class="action-btn" onclick="dashboard.editProduct(${p.id})" title="Editar">
                                <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                            </button>
                            <button class="action-btn delete" onclick="dashboard.deleteProduct(${p.id})" title="Excluir">
                                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                            </button>
                        </div>
                    </td>
                <td style="padding: 1rem 0.75rem;">
                    <div class="product-img-thumb" style="display: flex; align-items: center; justify-content: center; color: #64748b; width: 40px; height: 40px; overflow: hidden; border-radius: 4px; background: rgba(255,255,255,0.05);">
                        ${p.imageName ? `
                            <img src="${p.imageName.startsWith('data:image') ? p.imageName : `./uploads/${p.imageName}`}" 
                            onerror="this.parentElement.innerHTML='<i data-lucide=\\'image\\' class=\\'w-4 h-4\\'></i>'; lucide.createIcons();" 
                            style="width: 100%; height: 100%; object-fit: cover;">` : `
                            <i data-lucide="image" class="w-4 h-4"></i>`}
                    </div>
                </td>
                    <td style="padding: 1rem 0.75rem;">
                        <span style="font-weight: 600; color: #2563eb; cursor: pointer;">${p.name}</span>
                    </td>
                    <td style="padding: 1rem 0.75rem;"><code style="color: #94a3b8; font-size: 0.75rem;">${p.sku || '-'}</code></td>
                    <td style="padding: 1rem 0.75rem; color: #94a3b8; font-size: 0.813rem;">${p.gtin || '-'}</td>
                    <td style="padding: 1rem 0.75rem;">
                        <span style="color: ${statusClass}; font-weight: 600; font-size: 0.813rem;">
                            ${statusText}
                        </span>
                    </td>
                    <td style="padding: 1rem 0.75rem;">
                        ${priceHtml}
                    </td>
                    <td style="padding: 1rem 0.75rem; color: #60a5fa; font-size: 0.813rem;">
                        ${Array.isArray(p.categories) ? p.categories.join(', ') : (p.category || '-')}
                    </td>
                    <td style="padding: 1rem 0.75rem; color: #94a3b8; font-size: 0.813rem;">
                        ${p.brand || '-'}
                    </td>
                    <td style="padding: 1rem 0.75rem; color: #94a3b8; font-size: 0.75rem;">
                        ${this.formatDate(p.date)}
                    </td>
                </tr>
            `;
        }).join('');
        lucide.createIcons();
    }

    renderHistory() {
        const container = document.getElementById('timelineContainer');
        const movesEl = document.getElementById('totalMoves');
        if (movesEl) movesEl.textContent = this.history.length;
        
        container.innerHTML = this.history.length ? this.history.map(ev => `
            <div class="timeline-event ${ev.type}">
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <strong style="text-transform: uppercase; font-size: 0.75rem; color: ${ev.type === 'create' ? '#10b981' : ev.type === 'delete' ? '#ef4444' : '#eab308'};">
                            ${ev.type === 'create' ? 'Criação' : ev.type === 'delete' ? 'Exclusão' : 'Edição'}
                        </strong>
                        <span style="color: var(--text-main); font-weight: 500;">${ev.productName}</span>
                    </div>
                    <span style="color: var(--text-dim); font-size: 0.813rem;">${ev.details}</span>
                </div>
                <div style="text-align: right; color: var(--text-dim); font-size: 0.75rem;">
                    ${new Date(ev.timestamp).toLocaleString('pt-BR')}
                </div>
            </div>
        `).join('') : '<p style="color: var(--text-dim); text-align: center;">Nenhuma movimentação registrada.</p>';
    }

    setupEventListeners() {
        const modal = document.getElementById('modalOverlay');
        const openBtn = document.getElementById('openModal');
        const closeBtn = document.getElementById('closeModal');
        const form = document.getElementById('productForm');
        const searchInput = document.getElementById('productSearch');
        const syncBtn = document.getElementById('syncData');
        const imageFile = document.getElementById('imageFile');

        if (syncBtn) syncBtn.onclick = async () => {
            if (confirm('Deseja sincronizar os dados? Isso limpará alterações locais não salvas.')) {
                localStorage.removeItem('bomclima_products');
                localStorage.removeItem('bomclima_history');
                location.reload();
            }
        };

        if (openBtn) openBtn.onclick = () => {
            this.clearForm();
            document.getElementById('modalTitle').textContent = 'Novo Produto';
            modal.style.display = 'flex';
        };

        if (closeBtn) closeBtn.onclick = () => {
            modal.style.display = 'none';
        };

        if (form) form.onsubmit = (e) => {
            e.preventDefault();
            this.handleFormSubmit();
            modal.style.display = 'none';
        };

        if (searchInput) searchInput.oninput = (e) => this.handleFilter();

        if (imageFile) imageFile.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('imageName').value = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        };

        document.getElementById('logoutBtn').onclick = (e) => {
            e.preventDefault();
            if (confirm('Deseja realmente sair?')) {
                this.logout();
            }
        };

        window.onclick = (event) => {
            if (event.target == modal) modal.style.display = 'none';
        };
    }

    handleFilter() {
        const query = document.getElementById('productSearch').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;

        this.filteredProducts = this.products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(query) || 
                               (p.sku && p.sku.toLowerCase().includes(query)) ||
                               (p.brand && p.brand.toLowerCase().includes(query));
            
            const cats = Array.isArray(p.categories) ? p.categories : [p.category];
            const matchesCategory = category === 'all' || cats.includes(category);
            
            return matchesSearch && matchesCategory;
        });
        this.render();
    }

    handleFormSubmit() {
        const id = document.getElementById('productId').value;
        const name = document.getElementById('name').value;
        const category = document.getElementById('category').value;
        const price = document.getElementById('price').value;
        const promoPrice = document.getElementById('promoPrice').value;
        const stock = parseInt(document.getElementById('modalStock').value) || 0;
        const onBackorder = document.getElementById('onBackorder').checked;
        const imageName = document.getElementById('imageName').value;
        const description = document.getElementById('description').value;

        if (id) {
            const index = this.products.findIndex(p => p.id == id);
            this.products[index] = { 
                ...this.products[index], 
                name, 
                categories: [category], 
                price, 
                promoPrice,
                stock, 
                stockStatus: onBackorder ? 'onbackorder' : (stock > 0 ? 'instock' : 'outofstock'),
                imageName, 
                description 
            };
            this.logEvent('edit', this.products[index], `Produto atualizado: ${stock} em estoque, ${onBackorder ? 'Sob Encomenda' : 'Pronta Entrega'}`);
        } else {
            const newProd = {
                id: Date.now(),
                name,
                categories: [category],
                sku: 'NOVO-' + Math.floor(Math.random() * 1000),
                stock,
                stockStatus: onBackorder ? 'onbackorder' : (stock > 0 ? 'instock' : 'outofstock'),
                price,
                promoPrice,
                imageName,
                description,
                date: new Date().toISOString()
            };
            this.products.push(newProd);
            this.logEvent('create', newProd, 'Produto criado manualmente no dashboard.');
        }

        this.filteredProducts = [...this.products];
        this.save();
        this.render();
    }

    editProduct(id) {
        const p = this.products.find(prod => prod.id == id);
        if (!p) return;

        document.getElementById('productId').value = p.id;
        document.getElementById('name').value = p.name;
        document.getElementById('category').value = Array.isArray(p.categories) ? p.categories[0] : (p.category || 'Sem categoria');
        document.getElementById('price').value = p.price.replace('R$', '').replace(/\s/g, '').trim();
        document.getElementById('promoPrice').value = (p.promoPrice || '').replace('R$', '').replace(/\s/g, '').trim();
        document.getElementById('modalStock').value = p.stock || 0;
        document.getElementById('onBackorder').checked = p.stockStatus === 'onbackorder';
        document.getElementById('imageName').value = p.imageName || '';
        document.getElementById('description').value = p.description || '';

        document.getElementById('modalTitle').textContent = 'Editar Produto';
        document.getElementById('modalOverlay').style.display = 'flex';
    }

    deleteProduct(id) {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            const p = this.products.find(prod => prod.id == id);
            this.logEvent('delete', p, 'Produto removido do catálogo.');
            this.products = this.products.filter(p => p.id != id);
            this.filteredProducts = this.filteredProducts.filter(p => p.id != id);
            this.save();
            this.render();
        }
    }

    clearForm() {
        document.getElementById('productId').value = '';
        document.getElementById('productForm').reset();
        document.getElementById('imageName').value = '';
    }

    updateStats() {
        if (document.getElementById('totalProducts')) {
            document.getElementById('totalProducts').textContent = this.products.length;
        }
        
        let totalValue = 0;
        this.products.forEach(p => {
            // Exclude onbackorder from total sum as requested
            if (p.stockStatus === 'onbackorder') return;

            const qty = parseFloat(p.stock) || 0;
            if (qty > 0) {
                // Use promo price for calculation if available, else regular price
                const priceToUse = (p.promoPrice && p.promoPrice !== '0,00') ? p.promoPrice : p.price;
                const numericPrice = parseFloat(priceToUse.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
                totalValue += (qty * numericPrice);
            }
        });

        const stockEl = document.getElementById('stockTotalValue');
        if (stockEl) {
            stockEl.textContent = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }

        if (document.getElementById('totalCategories')) {
            const allCats = this.products.flatMap(p => p.categories || [p.category]);
            const uniqueCats = [...new Set(allCats.filter(Boolean))];
            document.getElementById('totalCategories').textContent = uniqueCats.length;
        }
    }
}

const dashboard = new Dashboard();
window.dashboard = dashboard;

