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

    // Product Data (Simulated)
    const products = [
        {
            id: 1,
            name: "COMPRESSOR MAHLE FIAT FIORINO MOTOR 1.4 L 8V SOHC L4 FIRE EVO",
            category: "Compressores",
            price: "R$ 1.500,00",
            image: "./assets/compressor-1.png",
            rating: 5,
            tags: ["popular", "featured"]
        },
        {
            id: 2,
            name: "COMPRESSOR AC P/ HYUNDAI TUCSON GLS 2.0 2010 A 2015",
            category: "Compressores",
            price: "R$ 1.776,00",
            image: "./assets/compressor-2.png",
            rating: 5,
            tags: ["popular"]
        },
        {
            id: 3,
            name: "COMPRESSOR AR NISSAN KICKS/MARCH/VERSA",
            category: "Compressores",
            price: "R$ 1.468,00",
            image: "./assets/compressor-3.png",
            rating: 4,
            tags: ["popular", "new"]
        },
        {
            id: 4,
            name: "Bateria Moura 60Ah Free",
            category: "Baterias",
            price: "R$ 480,00",
            image: "https://placehold.co/400x300/e2e8f0/1e3a8a?text=Bateria+Moura",
            rating: 5,
            tags: ["popular", "featured"]
        },
        {
            id: 5,
            name: "Jogo de Pastilhas de Freio Bosch",
            category: "Freios",
            price: "R$ 120,00",
            image: "https://placehold.co/400x300/e2e8f0/1e3a8a?text=Pastilha+Freio",
            rating: 4,
            tags: ["new"]
        },
        {
            id: 6,
            name: "Filtro de Ar Esportivo K&N",
            category: "Performance",
            price: "R$ 350,00",
            image: "https://placehold.co/400x300/e2e8f0/1e3a8a?text=Filtro+K%26N",
            rating: 5,
            tags: ["popular", "new"]
        },
         {
            id: 7,
            name: "Lâmpada Super Branca H4 Philips",
            category: "Iluminação",
            price: "R$ 85,00",
            image: "https://placehold.co/400x300/e2e8f0/1e3a8a?text=Lampada+H4",
            rating: 4,
            tags: ["featured"]
        },
        {
            id: 8,
            name: "Kit Embreagem Luk Palio/Uno",
            category: "Transmissão",
            price: "R$ 420,00",
            image: "https://placehold.co/400x300/e2e8f0/1e3a8a?text=Embreagem",
            rating: 5,
            tags: ["new"]
        }
    ];

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

    // Function to render products
    function renderProducts(filter = 'popular') {
        const productsGrid = document.querySelector('.products-grid');
        productsGrid.innerHTML = '';
        
        // In a real app, we would filter here. For demo, we just shuffle or select some.
        // Let's actually filter by tag for "popular", "featured", "new"
        
        const filteredProducts = products.filter(p => p.tags.includes(filter));
        
        filteredProducts.forEach(product => {
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
                        <span class="product-price">${product.price}</span>
                        <button class="btn btn-primary btn-sm" onclick="showProductDetails(${product.id})" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                             Ver Detalhes
                        </button>
                    </div>
                </div>
            `;
            productsGrid.appendChild(productCard);
        });
        
        // Re-initialize icons for new elements
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Global Functions for exposure to inline onclick
    window.showProductDetails = function(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        // Hide main homepage sections
        const heroSection = document.querySelector('.hero');
        const quickActions = document.querySelector('.quick-actions');
        const mainContent = document.querySelector('.main-content-wrapper');
        const promoImages = document.querySelector('.promo-images-container');
        const brandBanner = document.querySelector('.brands-banner');
        const featuredProducts = document.querySelector('.featured-slider-container')?.parentElement;
        const categoriesSection = document.getElementById('categories');

        const sectionsToHide = [heroSection, quickActions, mainContent, categoriesSection, promoImages, brandBanner];
        sectionsToHide.forEach(s => { if(s) s.classList.add('hidden'); });

        // Show details section
        const detailSection = document.getElementById('product-details');
        detailSection.style.display = 'block';

        // Populate details
        document.getElementById('detail-image').src = product.image;
        document.getElementById('detail-category').textContent = product.category;
        document.getElementById('detail-title').textContent = product.name;
        document.getElementById('detail-price').textContent = product.price;
        document.getElementById('detail-rating').innerHTML = getStars(product.rating);

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
        const message = encodeURIComponent(`Olá! Gostaria de realizar o pedido do produto: ${productTitle}`);
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
