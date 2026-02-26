
import { calculateStockTotalValue, formatCurrency } from './utils-stats.js?v=4';

console.log('Dashboard JS carregado v4');

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
        this.products = [];
        this.history = [];
        this.orders = [];
        this.filteredProducts = [];
        this.currentView = 'dashboard';
        this.API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:3000' 
            : 'https://api-production-ef9c.up.railway.app'; 
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
        
        await this.loadData();
        
        this.populateCategoryList();
        this.populateCategoryFilter();
        this.setupTabs();
        this.render();
        this.setupEventListeners();
        this.updateStats();
    }

    async loadData() {
        let localProducts = [];
        let apiProducts = [];

        // 1. Load from local JSON (Fallback source for static products)
        try {
            const response = await fetch('./products_data.json');
            if (response.ok) {
                localProducts = await response.json();
            }
        } catch (e) {
            localProducts = JSON.parse(localStorage.getItem('bomclima_products')) || [];
        }

        // 2. Load everything from API
        try {
            const [prodRes, histRes, ordRes] = await Promise.all([
                fetch(`${this.API_URL}/api/products?t=${Date.now()}`),
                fetch(`${this.API_URL}/api/history?t=${Date.now()}`),
                fetch(`${this.API_URL}/api/orders?t=${Date.now()}`)
            ]);

            if (prodRes.ok) apiProducts = await prodRes.json();
            if (histRes.ok) this.history = await histRes.json();
            if (ordRes.ok) this.orders = await ordRes.json();
            
        } catch (error) {
            console.error('Erro ao carregar dados da API:', error);
            // Fallbacks for offline use
            this.history = JSON.parse(localStorage.getItem('bomclima_history')) || [];
            this.orders = JSON.parse(localStorage.getItem('bomclima_pending_orders')) || [];
        }

        // 3. Merge Products
        const mergedMap = new Map();
        localProducts.forEach(p => mergedMap.set(p.id.toString(), p));
        apiProducts.forEach(p => mergedMap.set(p.id.toString(), p));

        this.products = Array.from(mergedMap.values());
        this.filteredProducts = [...this.products];
    }

    async save() {
        this.updateStats();
        this.populateCategoryFilter();
        // Sync local for quick reload fallback
        localStorage.setItem('bomclima_products', JSON.stringify(this.products));
        localStorage.setItem('bomclima_history', JSON.stringify(this.history));
        localStorage.setItem('bomclima_pending_orders', JSON.stringify(this.orders));
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
        const badge = document.getElementById('orderBadge');
        if (badge && this.orders.length > 0) {
            const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
            const hasRecent = this.orders.some(o => new Date(o.lastUpdate) > fiveMinsAgo);
            if (hasRecent && this.currentView !== 'orders') {
                badge.style.display = 'block';
            }
        }
    }

    renderOrders() {
        if (this.currentView !== 'orders') return;
        
        const tableBody = document.getElementById('ordersTableBody');
        const activeCount = document.getElementById('activeCartsCount');
        
        if (activeCount) activeCount.textContent = this.orders.length;

        if (this.orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Nenhum pedido ou carrinho ativo no momento.</td></tr>';
            return;
        }

        tableBody.innerHTML = this.orders.sort((a,b) => new Date(b.lastUpdate) - new Date(a.lastUpdate)).map(o => {
            const itemsList = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]');
            const paymentStatus = o.payment_status || (o.status === 'finalized' ? 'pending' : 'browsing');
            const fiscalStatus = o.invoice_status || 'pending';

            return `
                <tr class="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td style="padding: 1rem 1.5rem; font-weight: 600;">${o.customer}</td>
                    <td style="padding: 1rem 1.5rem;">${o.whatsapp}</td>
                    <td style="padding: 1rem 1.5rem; font-size: 0.8rem; color: #94a3b8;">${new Date(o.lastUpdate).toLocaleString('pt-BR')}</td>
                    <td style="padding: 1rem 1.5rem;">
                        <div style="font-size: 0.8rem; max-height: 60px; overflow-y: auto;">
                            ${itemsList.map(i => `${i.name} (x${i.quantity})`).join('<br>')}
                        </div>
                    </td>
                    <td style="padding: 1rem 1.5rem; font-weight: 700; color: #10b981;">${typeof o.total === 'number' ? formatCurrency(o.total) : o.total}</td>
                    <td style="padding: 1rem 1.5rem;">
                        <span class="badge" style="background: ${paymentStatus === 'paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(37, 99, 235, 0.2)'}; color: ${paymentStatus === 'paid' ? '#10b981' : '#60a5fa'};">
                            ${paymentStatus === 'paid' ? 'Pago' : (paymentStatus === 'browsing' ? 'Navegando' : 'Pendente')}
                        </span>
                    </td>
                    <td style="padding: 1rem 1.5rem;">
                        <span class="badge" style="background: ${fiscalStatus === 'issued' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(249, 115, 22, 0.2)'}; color: ${fiscalStatus === 'issued' ? '#10b981' : '#f97316'};">
                            ${fiscalStatus === 'issued' ? 'Emitida ✅' : 'Pendente'}
                        </span>
                    </td>
                    <td style="padding: 1rem 1.5rem;">
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <button class="btn btn-primary btn-sm" onclick="dashboard.contactCustomer('${o.whatsapp}', '${o.customer}')">
                                <i data-lucide="message-circle" style="width: 14px;"></i>
                            </button>
                            ${paymentStatus === 'paid' && fiscalStatus === 'pending' ? `
                                <button class="btn btn-secondary btn-sm" onclick="dashboard.issueInvoice('${o.id}')" style="background: #f97316; color: white;">
                                    <i data-lucide="file-text" style="width: 14px;"></i> NF
                                </button>
                            ` : ''}
                            <button class="action-btn delete" onclick="dashboard.deleteOrder('${o.id}')">
                                <i data-lucide="trash-2" style="width: 14px;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        lucide.createIcons();
    }

    contactCustomer(whatsapp, name) {
        const cleanWpp = whatsapp.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá ${name}! Vi que você adicionou alguns produtos ao carrinho na Bom Clima. Gostaria de ajuda para finalizar seu pedido?`);
        window.open(`https://wa.me/55${cleanWpp}?text=${message}`, '_blank');
    }

    async deleteOrder(id) {
        if (confirm('Deseja remover este registro de pedido?')) {
            try {
                await fetch(`${this.API_URL}/api/orders/${id}`, { method: 'DELETE' });
                this.orders = this.orders.filter(o => o.id != id);
                this.renderOrders();
                this.save();
            } catch (e) {
                console.error('Erro ao deletar pedido:', e);
            }
        }
    }

    async issueInvoice(orderId) {
        try {
            const response = await fetch(`${this.API_URL}/api/invoices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });
            const data = await response.json();
            if (data.success) {
                alert(`Nota Fiscal emitida com sucesso para o pedido ${orderId}!\n\nDados fiscais (Simulação):\nEmitente: ${data.invoice.emitter.razao_social}\nDestinatário: ${data.invoice.customer.name}\nCPF: ${data.invoice.customer.cpf_cnpj}\nTotal: R$ ${data.invoice.total}`);
                await this.loadData();
                this.renderOrders();
            } else {
                alert('Erro ao emitir nota fiscal: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (e) {
            console.error('Erro ao emitir nota fiscal:', e);
            alert('Erro de conexão com o servidor.');
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

    async logEvent(type, product, details = '') {
        const event = {
            id: Date.now(),
            type, 
            productName: product.name,
            productId: product.id,
            details,
            timestamp: new Date().toISOString()
        };
        
        this.history.unshift(event);
        if (this.history.length > 100) this.history.pop();
        this.renderHistory();
        this.save();

        try {
            await fetch(`${this.API_URL}/api/history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });
        } catch (e) {
            console.error('Erro ao salvar evento no servidor:', e);
        }
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
            } else {
                statusText = 'Fora de estoque';
                statusClass = '#ef4444'; // Red
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
                            <button class="action-btn" onclick="dashboard.viewProductDetails(${p.id})" title="Ver Detalhes">
                                <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                            </button>
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
            this.handleFormSubmit(e);
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

        // Details Modal Listeners
        const detailsModal = document.getElementById('detailsModalOverlay');
        const closeDetails = document.getElementById('closeDetailsModal');
        const cancelDetails = document.getElementById('cancelDetails');
        const detailsChangeImg = document.getElementById('detailsChangeImg');
        const detailsSaveImg = document.getElementById('detailsSaveImg');
        const detailsFileInput = document.getElementById('detailsFileInput');
        const saveDetailsChanges = document.getElementById('saveDetailsChanges');

        if (closeDetails) closeDetails.onclick = () => detailsModal.style.display = 'none';
        if (cancelDetails) cancelDetails.onclick = () => detailsModal.style.display = 'none';
        
        if (detailsChangeImg) detailsChangeImg.onclick = () => detailsFileInput.click();
        
        if (detailsFileInput) detailsFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('Arquivo selecionado:', file.name, file.type);
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = document.getElementById('viewMainImage');
                    if (img) {
                        img.src = event.target.result;
                        img.style.display = 'block';
                        console.log('Preview da imagem atualizado');
                    }
                };
                reader.readAsDataURL(file);
            }
        };

        if (detailsSaveImg) detailsSaveImg.onclick = async () => {
            const img = document.getElementById('viewMainImage');
            const name = document.getElementById('viewName').value || 'produto';
            
            if (!img || !img.src || img.src.includes('undefined') || img.src === window.location.href) {
                alert('Erro: Nenhuma imagem válida encontrada para download.');
                return;
            }

            const btn = detailsSaveImg;
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.textContent = 'Baixando...';
            
            try {
                const response = await fetch(img.src);
                if (!response.ok) throw new Error('Falha ao buscar imagem no servidor');
                const blob = await response.blob();
                const fileName = `bomclima-${name.toLowerCase().replace(/\s+/g, '-')}.png`;

                // Método 1: Escolher pasta (API moderna)
                if (window.showSaveFilePicker) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: fileName,
                            types: [{ description: 'Imagem PNG', accept: { 'image/png': ['.png'] } }]
                        });
                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                        return; 
                    } catch (err) {
                        if (err.name === 'AbortError') {
                            btn.disabled = false;
                            btn.innerHTML = originalText;
                            return;
                        }
                        console.warn('showSaveFilePicker falhou, tentando fallback...', err);
                    }
                }

                // Método 2: Download tradicional (Fallback)
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (err) {
                console.error('Erro no download:', err);
                alert('Erro ao processar download: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (window.lucide) lucide.createIcons();
            }
        };

        if (saveDetailsChanges) saveDetailsChanges.onclick = () => this.handleDetailsSubmit();

        document.getElementById('logoutBtn').onclick = (e) => {
            e.preventDefault();
            if (confirm('Deseja realmente sair?')) {
                this.logout();
            }
        };

        window.onclick = (event) => {
            if (event.target == modal) modal.style.display = 'none';
            if (event.target == detailsModal) detailsModal.style.display = 'none';
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

    async handleFormSubmit(e) {
        const id = document.getElementById('productId').value;
        const name = document.getElementById('name').value;
        const category = document.getElementById('category').value;
        const price = document.getElementById('price').value;
        const promoPrice = document.getElementById('promoPrice').value;
        const stock = parseInt(document.getElementById('modalStock').value) || 0;
        const onBackorder = document.getElementById('onBackorder').checked;
        const imageName = document.getElementById('imageName').value;
        const description = document.getElementById('description').value;
        const sku = document.getElementById('sku').value;

        const productData = {
            id: id || null,
            name,
            categories: [category],
            sku,
            price,
            promoPrice: promoPrice && promoPrice.trim() !== '' ? promoPrice : '',
            stock,
            stockStatus: onBackorder ? 'onbackorder' : (stock > 0 ? 'instock' : 'outofstock'),
            imageName,
            description
        };

        try {
            const btn = e ? e.submitter : null;
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="loading-spinner"></span> Salvando...';
            }

            const response = await fetch(`${this.API_URL}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                const result = await response.json();
                const finalId = (id || result.id).toString();
                
                const index = this.products.findIndex(p => p.id.toString() === finalId);
                if (index !== -1) {
                    this.products[index] = { ...this.products[index], ...productData, id: finalId };
                    this.logEvent('edit', this.products[index], `Alterações gravadas no Banco`);
                } else {
                    const newProd = { ...productData, id: finalId, date: new Date().toISOString() };
                    this.products.unshift(newProd);
                    this.logEvent('create', newProd, 'Novo produto gravado no Banco');
                }
                
                this.filteredProducts = [...this.products];
                this.save();
                this.render();
                if (btn) { 
                    btn.disabled = false; 
                    btn.innerHTML = '<i data-lucide="check"></i> Gravado!'; 
                    setTimeout(() => { if (btn) btn.textContent = 'Salvar Produto'; lucide.createIcons(); }, 3000);
                }
            } else {
                if (btn) { 
                    btn.disabled = false; 
                    btn.textContent = 'Erro ao Salvar'; 
                    setTimeout(() => { if (btn) btn.textContent = 'Salvar Produto'; }, 3000);
                }
            }
        } catch (err) {
            console.error('Erro de conexão com API:', err);
            alert('Erro ao conectar com o Railway. As mudanças podem não ser salvas permanentemente.');
        }
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
        document.getElementById('sku').value = p.sku || '';

        document.getElementById('modalTitle').textContent = 'Editar Produto';
        document.getElementById('modalOverlay').style.display = 'flex';
    }

    viewProductDetails(id) {
        const p = this.products.find(prod => prod.id == id);
        if (!p) return;

        this.currentEditingId = id;
        document.getElementById('viewName').value = p.name;
        
        const hasPromo = p.promoPrice && p.promoPrice !== '0,00' && p.promoPrice !== p.price;
        
        // viewPrice = Por (Selling), viewPromo = De (Original)
        if (hasPromo) {
            document.getElementById('viewPrice').value = p.promoPrice.replace('R$', '').trim();
            document.getElementById('viewPromo').value = p.price.replace('R$', '').trim();
        } else {
            document.getElementById('viewPrice').value = p.price.replace('R$', '').trim();
            document.getElementById('viewPromo').value = '';
        }
        
        document.getElementById('viewDescription').value = p.description || '';
        
        const cat = Array.isArray(p.categories) ? p.categories[0] : (p.category || 'Sem categoria');
        document.getElementById('detailsCategoryBadge').innerHTML = `
            <span class="badge badge-category" style="font-size: 0.7rem; padding: 0.4rem 0.8rem; text-transform: uppercase;">${cat}</span>
        `;
        
        const imgSrc = p.imageName ? (p.imageName.startsWith('data:image') ? p.imageName : `./uploads/${p.imageName}`) : '';
        document.getElementById('viewMainImage').src = imgSrc;
        
        document.getElementById('detailsModalOverlay').style.display = 'flex';
        lucide.createIcons();
    }

    async handleDetailsSubmit() {
        const id = this.currentEditingId;
        const p = this.products.find(prod => prod.id == id);
        if (!p) return;

        const porVal = document.getElementById('viewPrice').value.replace('R$', '').trim();
        const deVal = document.getElementById('viewPromo').value.replace('R$', '').trim();

        // Logic: if deVal (Original) is empty, then price = porVal and promo = empty.
        // If deVal exists, then price = deVal and promoPrice = porVal.
        const finalPrice = deVal ? `R$ ${deVal}` : `R$ ${porVal}`;
        const finalPromo = deVal ? `R$ ${porVal}` : '';

        const productData = {
            ...p,
            name: document.getElementById('viewName').value,
            price: finalPrice,
            promoPrice: finalPromo && finalPromo.trim() !== '' ? finalPromo : '',
            description: document.getElementById('viewDescription').value,
            imageName: document.getElementById('viewMainImage').src.startsWith('data:image') ? document.getElementById('viewMainImage').src : p.imageName
        };

        try {
            const btn = document.getElementById('saveDetailsChanges') || document.getElementById('detailsSaveImg');
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Gravando no Banco...';
            }

            const response = await fetch(`${this.API_URL}/api/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            if (response.ok) {
                const result = await response.json();
                const finalId = id.toString();
                const index = this.products.findIndex(prod => prod.id.toString() === finalId);
                
                if (index !== -1) {
                    this.products[index] = { ...productData, id: finalId };
                }
                
                this.logEvent('edit', productData, `Ficha técnica salva definitivamente`);
                this.filteredProducts = [...this.products];
                this.save();
                this.render();
                
                if (btn) {
                    btn.textContent = 'Alterações Salvas!';
                    setTimeout(() => { 
                        document.getElementById('detailsModalOverlay').style.display = 'none';
                        if (btn) btn.textContent = 'Confirmar Alterações'; 
                    }, 1000);
                } else {
                    document.getElementById('detailsModalOverlay').style.display = 'none';
                }
            } else {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Erro no Servidor';
                    setTimeout(() => { if (btn) btn.textContent = 'Confirmar Alterações'; }, 3000);
                }
            }
        } catch (err) {
            console.error('Erro ao salvar detalhes:', err);
            alert('Erro de conexão.');
        }
    }

    async deleteProduct(id) {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            try {
                const response = await fetch(`${this.API_URL}/api/products/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    const p = this.products.find(prod => prod.id == id);
                    this.logEvent('delete', p, 'Produto removido do servidor');
                    this.products = this.products.filter(p => p.id != id);
                    this.filteredProducts = this.filteredProducts.filter(p => p.id != id);
                    this.save();
                    this.render();
                } else {
                    alert('Erro ao excluir produto no servidor.');
                }
            } catch (err) {
                console.error('Erro ao excluir:', err);
                alert('Erro de conexão com Railway.');
            }
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
        
        // Usando a lógica movida para utils-stats.js
        const totalValue = calculateStockTotalValue(this.products);

        const stockEl = document.getElementById('stockTotalValue');
        if (stockEl) {
            stockEl.textContent = formatCurrency(totalValue);
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

