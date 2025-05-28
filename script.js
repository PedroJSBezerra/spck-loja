document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos do DOM ---
    const productGrid = document.getElementById('product-grid');
    const loader = document.getElementById('loader');
    const searchInput = document.getElementById('search-input');
    const animatedCartIcon = document.getElementById('animated-cart-icon');
    const cartCountSpan = document.getElementById('cart-count');
    const toastContainer = document.getElementById('toast-container');

    // Modais
    const productModal = document.getElementById('product-modal');
    const closeProductModalBtn = document.getElementById('close-product-modal');
    const modalImageSlider = document.getElementById('modal-image-slider');
    const sliderImagesContainer = document.getElementById('slider-images');
    const modalPrevBtn = document.getElementById('modal-prev-btn');
    const modalNextBtn = document.getElementById('modal-next-btn');
    const modalPrice = document.getElementById('modal-price');
    const modalName = document.getElementById('modal-name');
    const modalStock = document.getElementById('modal-stock');
    const modalDescription = document.getElementById('modal-description');
    const addToCartButton = document.getElementById('add-to-cart-button');

    const cartModal = document.getElementById('cart-modal');
    const closeCartModalBtn = document.getElementById('close-cart-modal');
    const cartItemsContainer = document.getElementById('cart-items');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartTotalSpan = document.getElementById('cart-total');
    const clearCartButton = document.getElementById('clear-cart-button');

    // Ícone de Configurações e Modal de Configurações
    const settingsIcon = document.getElementById('settings-icon');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModalBtn = document.getElementById('close-settings-modal');

    // Opções de Exibição (dentro do modal de configurações)
    const displayGridButton = document.getElementById('display-grid-button');
    const displayListButton = document.getElementById('display-list-button');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // --- Estado da Aplicação ---
    let allProducts = [];
    let currentCart = [];
    let selectedProduct = null;
    let currentImageIndex = 0; // Para o slider de imagens do modal
    let currentViewMode = 'grid'; // 'grid' ou 'list'

    // --- Funções de Ajuda ---

    /**
     * Exibe uma notificação toast.
     * @param {string} message - A mensagem a ser exibida.
     * @param {string} type - O tipo de toast ('success' ou 'error').
     */
    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.classList.add('toast', type);
        toast.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);

        // Força o reflow para a animação CSS funcionar
        void toast.offsetWidth;

        setTimeout(() => {
            toast.remove();
        }, 3000); // Remove o toast após 3 segundos
    }

    /**
     * Anima o ícone do carrinho.
     */
    function animateCartIcon() {
        if (!animatedCartIcon) return;
        animatedCartIcon.classList.add('pulse');
        setTimeout(() => {
            animatedCartIcon.classList.remove('pulse');
        }, 500);
    }

    /**
     * Retorna o status de estoque formatado.
     * @param {number} stock
     * @returns {{text: string, className: string}}
     */
    function getStockStatus(stock) {
        if (isNaN(stock) || stock === 0) {
            return { text: 'Esgotado', className: 'out' };
        } else if (stock <= 5) {
            return { text: `${stock} em estoque`, className: 'low' };
        } else {
            return { text: 'Em estoque', className: 'high' };
        }
    }

    // --- Funções de Renderização ---

    /**
     * Renderiza um único card de produto.
     * @param {Object} product - O objeto produto.
     * @param {string} viewMode - 'grid' ou 'list'.
     * @returns {HTMLElement} O elemento HTML do card.
     */
    function renderProductCard(product, viewMode) {
        const card = document.createElement('div');
        card.classList.add('product-card', viewMode === 'grid' ? 'grid-item' : 'list-item');
        card.dataset.productId = product.id; // Armazena o ID do produto no elemento

        const firstImage = product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/200/cccccc/ffffff?text=Sem+Imagem';
        const stockStatus = getStockStatus(product.stock);

        card.innerHTML = `
            <div class="image-container">
                <img src="${firstImage}" alt="${product.name}" loading="lazy">
            </div>
            <div class="info">
                <p class="price">R$ ${product.price ? product.price.toFixed(2).replace('.', ',') : 'N/A'}</p>
                <p class="name">${product.name || 'Produto sem nome'}</p>
                <div class="stock ${stockStatus.className}">${stockStatus.text}</div>
            </div>
        `;

        card.addEventListener('click', () => openProductModal(product));
        return card;
    }

    /**
     * Renderiza todos os produtos na grade/lista.
     * @param {Array} productsToDisplay - Array de produtos filtrados.
     */
    function renderProducts(productsToDisplay) {
        if (!productGrid) return;
        productGrid.innerHTML = ''; // Limpa o conteúdo atual
        if (productsToDisplay.length === 0) {
            productGrid.innerHTML = '<p>Nenhum produto encontrado.</p>';
        } else {
            productsToDisplay.forEach(product => {
                if (product) productGrid.appendChild(renderProductCard(product, currentViewMode));
            });
        }
        // Atualiza as classes do container para o modo de visualização
        productGrid.classList.remove('grid-view', 'list-view');
        productGrid.classList.add(`${currentViewMode}-view`);
    }

    /**
     * Renderiza o carrinho de compras.
     */
    function renderCart() {
        if (!cartItemsContainer || !emptyCartMessage || !clearCartButton || !cartTotalSpan || !cartCountSpan) return;

        cartItemsContainer.innerHTML = ''; // Limpa o conteúdo atual

        if (currentCart.length === 0) {
            emptyCartMessage.style.display = 'block';
            clearCartButton.style.display = 'none'; // Esconde o botão de limpar carrinho
        } else {
            emptyCartMessage.style.display = 'none';
            clearCartButton.style.display = 'block'; // Mostra o botão de limpar carrinho
            currentCart.forEach(item => {
                const cartItemDiv = document.createElement('div');
                cartItemDiv.classList.add('cart-item');
                const itemImage = item.product.images && item.product.images.length > 0 ? item.product.images[0] : 'https://via.placeholder.com/60/cccccc/ffffff?text=';
                cartItemDiv.innerHTML = `
                    <img src="${itemImage}" alt="${item.product.name}">
                    <div class="cart-item-details">
                        <div class="name">${item.product.name}</div>
                        <div class="price">R$ ${item.product.price.toFixed(2).replace('.', ',')} x ${item.quantity}</div>
                    </div>
                    <div class="cart-item-controls">
                        <button class="decrease-quantity" data-product-id="${item.product.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="increase-quantity" data-product-id="${item.product.id}">+</button>
                    </div>
                `;
                cartItemsContainer.appendChild(cartItemDiv);

                cartItemDiv.querySelector('.decrease-quantity').addEventListener('click', () => updateItemQuantity(item.product.id, -1));
                cartItemDiv.querySelector('.increase-quantity').addEventListener('click', () => updateItemQuantity(item.product.id, 1));
            });
        }

        const total = currentCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        cartTotalSpan.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        cartCountSpan.textContent = currentCart.reduce((sum, item) => sum + item.quantity, 0);
    }

    // --- Funções do Carrinho ---

    /**
     * Adiciona um produto ao carrinho.
     * @param {Object} productToAdd - O produto a ser adicionado.
     */
    function addItemToCart(productToAdd) {
        if (!productToAdd || typeof productToAdd.id === 'undefined') {
            console.error("Tentativa de adicionar produto inválido ao carrinho:", productToAdd);
            showToast('Erro ao adicionar produto ao carrinho.', 'error');
            return;
        }
        const existingItem = currentCart.find(item => item.product.id === productToAdd.id);

        if (existingItem) {
            if (existingItem.quantity < productToAdd.stock) {
                existingItem.quantity++;
                showToast(`${productToAdd.name} +1 no carrinho!`);
            } else {
                showToast(`Não há mais estoque de ${productToAdd.name}.`, 'error');
            }
        } else {
            currentCart.push({ product: productToAdd, quantity: 1 });
            showToast(`${productToAdd.name} adicionado ao carrinho!`);
        }
        animateCartIcon();
        renderCart();
        saveCartToLocalStorage();
    }

    /**
     * Atualiza a quantidade de um item no carrinho.
     * @param {string} productId - ID do produto.
     * @param {number} change - Mudança na quantidade (+1 ou -1).
     */
    function updateItemQuantity(productId, change) {
        const itemIndex = currentCart.findIndex(item => item.product.id === productId);

        if (itemIndex > -1) {
            const item = currentCart[itemIndex];
            const newQuantity = item.quantity + change;

            if (newQuantity > 0 && newQuantity <= item.product.stock) {
                item.quantity = newQuantity;
                showToast(`Quantidade de ${item.product.name} atualizada para ${newQuantity}.`);
            } else if (newQuantity <= 0) {
                if (confirm(`Remover ${item.product.name} do carrinho?`)) {
                    currentCart.splice(itemIndex, 1);
                    showToast(`${item.product.name} removido do carrinho.`, 'success');
                }
            } else if (newQuantity > item.product.stock) {
                showToast(`Você atingiu o limite de estoque para ${item.product.name}.`, 'error');
            }
        }
        renderCart();
        saveCartToLocalStorage();
    }

    /**
     * Limpa todo o carrinho.
     */
    function clearCart() {
        if (confirm('Tem certeza que deseja limpar o carrinho?')) {
            currentCart = [];
            showToast('Carrinho limpo!', 'success');
            renderCart();
            saveCartToLocalStorage();
        }
    }

    // --- Funções de Modal ---

    /**
     * Abre o modal de detalhes do produto.
     * @param {Object} product - O produto a ser exibido.
     */
    function openProductModal(product) {
        if (!productModal || !modalPrice || !modalName || !modalStock || !modalDescription || !addToCartButton || !sliderImagesContainer) return;
        selectedProduct = product;
        currentImageIndex = 0; // Reseta o slide ao abrir o modal

        modalPrice.textContent = `R$ ${selectedProduct.price ? selectedProduct.price.toFixed(2).replace('.', ',') : 'N/A'}`;
        modalName.textContent = selectedProduct.name || 'Produto sem nome';
        const stockStatus = getStockStatus(selectedProduct.stock);
        modalStock.className = ''; // Limpa classes anteriores
        modalStock.classList.add('stock', stockStatus.className);
        modalStock.textContent = stockStatus.text;
        modalDescription.textContent = selectedProduct.description || 'Sem descrição.';

        addToCartButton.disabled = selectedProduct.stock === 0 || isNaN(selectedProduct.stock);
        addToCartButton.textContent = addToCartButton.disabled ? 'Produto Esgotado' : 'Adicionar ao Carrinho';

        // Renderiza as imagens do slider
        sliderImagesContainer.innerHTML = '';
        if (selectedProduct.images && selectedProduct.images.length > 0) {
            selectedProduct.images.forEach((imgUrl, index) => {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = `${selectedProduct.name} - Imagem ${index + 1}`;
                sliderImagesContainer.appendChild(img);
            });
        } else {
            const img = document.createElement('img');
            img.src = 'https://via.placeholder.com/400/cccccc/ffffff?text=Sem+Imagem';
            img.alt = 'Sem imagem disponível';
            sliderImagesContainer.appendChild(img);
        }
        updateModalSlider();

        productModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Evita rolagem da página
    }

    /**
     * Fecha o modal de detalhes do produto.
     */
    function closeProductModal() {
        if (!productModal) return;
        productModal.classList.remove('active');
        document.body.style.overflow = ''; // Restaura a rolagem da página
        selectedProduct = null;
    }

    /**
     * Atualiza a exibição do slider de imagens no modal.
     */
    function updateModalSlider() {
        if (!sliderImagesContainer || !modalPrevBtn || !modalNextBtn) return;
        const offset = -currentImageIndex * 100;
        sliderImagesContainer.style.transform = `translateX(${offset}%)`;

        modalPrevBtn.disabled = currentImageIndex === 0;
        modalNextBtn.disabled = !selectedProduct || !selectedProduct.images || currentImageIndex === selectedProduct.images.length - 1;

        // Esconde botões se houver apenas 1 imagem ou nenhuma
        if (!selectedProduct || !selectedProduct.images || selectedProduct.images.length <= 1) {
            modalPrevBtn.style.display = 'none';
            modalNextBtn.style.display = 'none';
        } else {
            modalPrevBtn.style.display = 'block';
            modalNextBtn.style.display = 'block';
        }
    }

    /**
     * Abre o modal do carrinho.
     */
    function openCartModal() {
        if (!cartModal) return;
        renderCart();
        cartModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Fecha o modal do carrinho.
     */
    function closeCartModal() {
        if (!cartModal) return;
        cartModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    // --- Funções de Persistência (LocalStorage) ---

    function saveCartToLocalStorage() {
        localStorage.setItem('shoppingCart', JSON.stringify(currentCart));
    }

    function loadCartFromLocalStorage() {
        const storedCart = localStorage.getItem('shoppingCart');
        if (storedCart) {
            try {
                currentCart = JSON.parse(storedCart);
                // Re-hidratar produtos
                currentCart.forEach(item => {
                    if (item.product) {
                        if (typeof item.product.stock !== 'number') {
                            item.product.stock = parseInt(item.product.stock, 10) || 0;
                        }
                        if (typeof item.product.price !== 'number') {
                            item.product.price = parseFloat(item.product.price) || 0;
                        }
                    } else {
                        // Tratar caso onde o produto no item do carrinho é inválido
                        console.warn("Item inválido no carrinho:", item);
                        // Poderia remover o item aqui ou tentar recuperá-lo se tivesse uma fonte de dados mestre
                    }
                });
                // Filtra itens que possam ter ficado inválidos
                currentCart = currentCart.filter(item => item.product && typeof item.product.id !== 'undefined');
                renderCart();
            } catch (e) {
                console.error("Erro ao carregar carrinho do localStorage:", e);
                localStorage.removeItem('shoppingCart'); // Limpa carrinho corrompido
                currentCart = [];
            }
        }
    }

    // --- Funções do Modal de Configurações ---

    function openSettingsModal() {
        if (!settingsModal) return;
        settingsModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Evita rolagem da página
    }

    function closeSettingsModal() {
        if (!settingsModal) return;
        settingsModal.classList.remove('active');
        document.body.style.overflow = ''; // Restaura a rolagem da página
    }


    // --- Funções de Opções de Visualização (Grade/Lista) ---

    /**
     * Define o modo de visualização (grade ou lista) e atualiza a interface.
     * @param {string} mode - 'grid' ou 'list'.
     */
    function setViewMode(mode) {
        if (!productGrid || !displayGridButton || !displayListButton) return;
        currentViewMode = mode;
        productGrid.classList.remove('grid-view', 'list-view');
        productGrid.classList.add(`${mode}-view`);

        displayGridButton.classList.toggle('active', mode === 'grid');
        displayListButton.classList.toggle('active', mode === 'list');

        localStorage.setItem('viewMode', mode);

        const currentSearchTerm = searchInput ? searchInput.value.toLowerCase() : "";
        const filtered = allProducts.filter(product =>
            product && product.name && product.name.toLowerCase().includes(currentSearchTerm) ||
            product && product.description && product.description.toLowerCase().includes(currentSearchTerm)
        );
        renderProducts(filtered);
    }

    function loadViewMode() {
        const savedMode = localStorage.getItem('viewMode');
        if (savedMode && (savedMode === 'grid' || savedMode === 'list')) {
            setViewMode(savedMode);
        } else {
            setViewMode('grid'); // Padrão
        }
    }

    // --- Funções de Dark Mode ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (darkModeToggle) darkModeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            if (darkModeToggle) darkModeToggle.checked = false;
        }
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        // Define 'light' como padrão se nenhum tema estiver salvo.
        // Você pode adicionar lógica para verificar a preferência do sistema aqui, se desejar.
        // Exemplo: const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        // applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
        applyTheme(savedTheme || 'light'); // Aplica o tema salvo ou 'light' como padrão
    }


    // --- Função de Busca de Produtos (e Parsing CSV) ---

    async function fetchProducts() {
        if (loader) loader.style.display = 'block';
        if (productGrid) productGrid.innerHTML = '';

        const googleSheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRY00iz3q4UEcZ0BUpYJ52EnLyKpAv2r37_UUS01aqb2GF1hWpxKEcmUYC1RslP-Kp-dUuJd_wTb2uq/pub?output=csv';

        try {
            const response = await fetch(googleSheetCsvUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();
            allProducts = parseCSV(data);
            renderProducts(allProducts);
        } catch (error) {
            console.error('Falha ao buscar produtos:', error);
            showToast('Erro ao carregar produtos. Verifique o link e as permissões da planilha.', 'error');
            if (productGrid) productGrid.innerHTML = '<p>Não foi possível carregar os produtos.</p>';
        } finally {
            if (loader) loader.style.display = 'none';
        }
    }

    /**
     * Parsea um texto CSV em um array de objetos produto.
     * Considera vírgulas dentro de aspas duplas.
     * @param {string} text - O conteúdo CSV.
     * @returns {Array<Object>} Array de objetos produto.
     */
    function parseCSV(text) {
        const rows = text.split(/\r?\n/).slice(1); // Ignora o cabeçalho
        return rows.map((row, index) => {
            const values = [];
            let inQuote = false;
            let currentField = "";
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    values.push(currentField.trim());
                    currentField = "";
                } else {
                    currentField += char;
                }
            }
            values.push(currentField.trim());

            if (values.length < 5 || values[0].trim() === '') return null;

            const priceString = values[2].replace(',', '.');
            const stockString = values[3];

            return {
                id: `product-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
                name: values[0],
                description: values[1],
                price: parseFloat(priceString) || 0,
                stock: parseInt(stockString, 10) || 0,
                images: values[4] ? values[4].split(',').map(url => url.trim()).filter(url => url) : []
            };
        }).filter(Boolean);
    }

    // --- Escutadores de Eventos ---

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.toLowerCase();
            const filtered = allProducts.filter(product =>
                product.name.toLowerCase().includes(term) ||
                (product.description && product.description.toLowerCase().includes(term))
            );
            renderProducts(filtered);
        });
    }

    if (closeProductModalBtn) closeProductModalBtn.addEventListener('click', closeProductModal);
    if (productModal) {
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) closeProductModal();
        });
    }

    if (modalPrevBtn) {
        modalPrevBtn.addEventListener('click', () => {
            if (selectedProduct && selectedProduct.images && currentImageIndex > 0) {
                currentImageIndex--;
                updateModalSlider();
            }
        });
    }
    if (modalNextBtn) {
        modalNextBtn.addEventListener('click', () => {
            if (selectedProduct && selectedProduct.images && currentImageIndex < selectedProduct.images.length - 1) {
                currentImageIndex++;
                updateModalSlider();
            }
        });
    }

    if (addToCartButton) {
        addToCartButton.addEventListener('click', () => {
            if (selectedProduct) {
                addItemToCart(selectedProduct);
                // closeProductModal(); // Opcional: fechar modal após adicionar
            }
        });
    }

    if (animatedCartIcon) animatedCartIcon.addEventListener('click', openCartModal);
    if (closeCartModalBtn) closeCartModalBtn.addEventListener('click', closeCartModal);
    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) closeCartModal();
        });
    }

    if (clearCartButton) clearCartButton.addEventListener('click', clearCart);

    // Event Listeners para o Modal de Configurações
    if (settingsIcon) settingsIcon.addEventListener('click', openSettingsModal);
    if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettingsModal();
        });
    }

    // Fechar modal de configurações ao clicar fora (se a sidebar foi removida)
    document.addEventListener('click', (e) => {
        // Este listener pode ser removido se o clique no overlay do modal já o fecha.
        // Se mantido, ajuste para o settingsModal e settingsIcon.
        if (settingsModal && settingsModal.classList.contains('active') &&
            !settingsModal.querySelector('.modal-content').contains(e.target) && // Verifica se o clique não foi dentro do conteúdo do modal
            e.target !== settingsIcon &&
            (!settingsIcon || !settingsIcon.contains(e.target))
        ) {
            // closeSettingsModal(); // Descomente se o clique no overlay não estiver funcionando como esperado
        }
    });

    if (displayGridButton) {
        displayGridButton.addEventListener('click', () => {
            setViewMode('grid');
            closeSettingsModal(); // Fecha o modal de configurações após a seleção
        });
    }
    if (displayListButton) {
        displayListButton.addEventListener('click', () => {
            setViewMode('list');
            closeSettingsModal(); // Fecha o modal de configurações após a seleção
        });
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (event) => {
            const newTheme = event.target.checked ? 'dark' : 'light';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
            // closeSettingsModal(); // Opcional: fechar modal ao trocar tema, pode ser um pouco abrupto.
        });
    }


    // --- Inicialização ---
    loadCartFromLocalStorage();
    loadViewMode();
    loadTheme(); // Carrega o tema salvo
    fetchProducts();
});
