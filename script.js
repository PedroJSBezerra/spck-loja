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

    // Sidebar e Opções de Exibição
    const menuIcon = document.getElementById('menu-icon');
    const sidebar = document.getElementById('sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const displayGridButton = document.getElementById('display-grid-button');
    const displayListButton = document.getElementById('display-list-button');

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

        const firstImage = product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/200/cccccc/ffffff?text=Sem+Imagem';
        const stockStatus = getStockStatus(product.stock);

        card.innerHTML = `
            <div class="image-container">
                <img src="${firstImage}" alt="${product.name}" loading="lazy">
            </div>
            <div class="info">
                <p class="price">R$ ${product.price.toFixed(2).replace('.', ',')}</p>
                <p class="name">${product.name}</p>
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
        productGrid.innerHTML = ''; // Limpa o conteúdo atual
        if (productsToDisplay.length === 0) {
            productGrid.innerHTML = '<p>Nenhum produto encontrado.</p>';
        } else {
            productsToDisplay.forEach(product => {
                productGrid.appendChild(renderProductCard(product, currentViewMode));
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
                cartItemDiv.innerHTML = `
                    <img src="${item.product.images[0] || 'https://via.placeholder.com/60/cccccc/ffffff?text='}" alt="${item.product.name}">
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

                cartItemDiv.querySelector('.decrease-quantity').addEventListener('click', (e) => updateItemQuantity(item.product.id, -1));
                cartItemDiv.querySelector('.increase-quantity').addEventListener('click', (e) => updateItemQuantity(item.product.id, 1));
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
        selectedProduct = product;
        currentImageIndex = 0; // Reseta o slide ao abrir o modal

        modalPrice.textContent = `R$ ${selectedProduct.price.toFixed(2).replace('.', ',')}`;
        modalName.textContent = selectedProduct.name;
        const stockStatus = getStockStatus(selectedProduct.stock);
        modalStock.className = ''; // Limpa classes anteriores
        modalStock.classList.add('stock', stockStatus.className);
        modalStock.textContent = stockStatus.text;
        modalDescription.textContent = selectedProduct.description;

        addToCartButton.disabled = selectedProduct.stock === 0 || isNaN(selectedProduct.stock);
        addToCartButton.textContent = addToCartButton.disabled ? 'Produto Esgotado' : 'Adicionar ao Carrinho';

        // Renderiza as imagens do slider
        sliderImagesContainer.innerHTML = '';
        selectedProduct.images.forEach((imgUrl, index) => {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = `Imagem ${index + 1}`;
            sliderImagesContainer.appendChild(img);
        });
        updateModalSlider();

        productModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Evita rolagem da página
    }

    /**
     * Fecha o modal de detalhes do produto.
     */
    function closeProductModal() {
        productModal.classList.remove('active');
        document.body.style.overflow = ''; // Restaura a rolagem da página
        selectedProduct = null;
    }

    /**
     * Atualiza a exibição do slider de imagens no modal.
     */
    function updateModalSlider() {
        const offset = -currentImageIndex * 100;
        sliderImagesContainer.style.transform = `translateX(${offset}%)`;

        modalPrevBtn.disabled = currentImageIndex === 0;
        modalNextBtn.disabled = !selectedProduct || currentImageIndex === selectedProduct.images.length - 1;

        // Esconde botões se houver apenas 1 imagem
        if (!selectedProduct || selectedProduct.images.length <= 1) {
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
        renderCart();
        cartModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Fecha o modal do carrinho.
     */
    function closeCartModal() {
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
            currentCart = JSON.parse(storedCart);
            // Re-hidratar produtos caso o localStorage não preserve protótipos
            // No nosso caso, como são dados simples, o parse já basta.
            // Apenas para garantir que o stock ainda é um número, etc.
            currentCart.forEach(item => {
                if (typeof item.product.stock !== 'number') {
                    item.product.stock = parseInt(item.product.stock, 10);
                }
                if (typeof item.product.price !== 'number') {
                    item.product.price = parseFloat(item.product.price);
                }
            });
            renderCart(); // Renderiza o carrinho ao carregar
        }
    }

    // --- Funções da Sidebar / Opções de Visualização ---

    function openSidebar() {
        sidebar.classList.add('open');
        document.body.classList.add('sidebar-open'); // Adiciona classe para empurrar o main
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open'); // Remove classe
    }

    function setViewMode(mode) {
        currentViewMode = mode;
        // Atualiza a classe no container principal
        productGrid.classList.remove('grid-view', 'list-view');
        productGrid.classList.add(`${mode}-view`);

        // Atualiza os botões de opção
        displayGridButton.classList.remove('active');
        displayListButton.classList.remove('active');
        if (mode === 'grid') {
            displayGridButton.classList.add('active');
        } else {
            displayListButton.classList.add('active');
        }

        // Re-renderiza os produtos com a nova visualização
        const currentSearchTerm = searchInput.value.toLowerCase();
        const filtered = allProducts.filter(product =>
            product.name.toLowerCase().includes(currentSearchTerm) ||
            product.description.toLowerCase().includes(currentSearchTerm)
        );
        renderProducts(filtered);
    }

    // --- Função de Busca de Produtos (e Parsing CSV) ---

    async function fetchProducts() {
        loader.style.display = 'block'; // Mostra o loader
        productGrid.innerHTML = ''; // Limpa produtos anteriores

        // SUBSTITUA ESTE LINK PELO SEU LINK DA PLANILHA PUBLICADA COMO CSV
        const googleSheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRY00iz3q4UEcZ0BUpYJ52EnLyKpAv2r37_UUS01aqb2GF1hWpxKEcmUYC1RslP-Kp-dUuJd_wTb2uq/pub?output=csv';

        try {
            const response = await fetch(googleSheetCsvUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();
            allProducts = parseCSV(data);
            renderProducts(allProducts); // Renderiza todos os produtos inicialmente
        } catch (error) {
            console.error('Falha ao buscar produtos:', error);
            showToast('Erro ao carregar produtos. Verifique o link e as permissões da planilha.', 'error');
            productGrid.innerHTML = '<p>Não foi possível carregar os produtos.</p>';
        } finally {
            loader.style.display = 'none'; // Esconde o loader
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
        return rows.map(row => {
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
            values.push(currentField.trim()); // Adiciona o último campo

            // Validação básica para garantir que a linha tem dados suficientes
            if (values.length < 5 || values[0].trim() === '') return null;

            const priceString = values[2].replace(',', '.'); // Troca vírgula por ponto para parseFloat
            const stockString = values[3];

            return {
                id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // ID único
                name: values[0],
                description: values[1],
                price: parseFloat(priceString),
                stock: parseInt(stockString, 10),
                images: values[4].split(',').map(url => url.trim()).filter(url => url) // Divide URLs de imagem
            };
        }).filter(Boolean); // Remove linhas nulas (inválidas)
    }

    // --- Escutadores de Eventos ---

    // Busca de produtos
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase();
        const filtered = allProducts.filter(product =>
            product.name.toLowerCase().includes(term) ||
            product.description.toLowerCase().includes(term)
        );
        renderProducts(filtered);
    });

    // Abrir/Fechar Modal de Produto
    closeProductModalBtn.addEventListener('click', closeProductModal);
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) {
            closeProductModal();
        }
    });

    // Slider de Imagens no Modal de Produto
    modalPrevBtn.addEventListener('click', () => {
        if (selectedProduct && currentImageIndex > 0) {
            currentImageIndex--;
            updateModalSlider();
        }
    });
    modalNextBtn.addEventListener('click', () => {
        if (selectedProduct && currentImageIndex < selectedProduct.images.length - 1) {
            currentImageIndex++;
            updateModalSlider();
        }
    });

    // Adicionar ao Carrinho (do modal de detalhes)
    addToCartButton.addEventListener('click', () => {
        if (selectedProduct) {
            addItemToCart(selectedProduct);
            closeProductModal(); // Fecha o modal após adicionar
        }
    });

    // Abrir/Fechar Modal do Carrinho
    animatedCartIcon.addEventListener('click', openCartModal);
    closeCartModalBtn.addEventListener('click', closeCartModal);
    cartModal.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            closeCartModal();
        }
    });

    // Limpar Carrinho
    clearCartButton.addEventListener('click', clearCart);

    // Sidebar
    menuIcon.addEventListener('click', openSidebar);
    closeSidebarBtn.addEventListener('click', closeSidebar);
    // Fechar sidebar ao clicar fora (ou em qualquer lugar que não seja a sidebar ou o ícone)
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            e.target !== menuIcon &&
            !menuIcon.contains(e.target)
        ) {
            closeSidebar();
        }
    });


    // Opções de Visualização
    displayGridButton.addEventListener('click', () => {
        setViewMode('grid');
        closeSidebar(); // Fecha a sidebar após selecionar
    });
    displayListButton.addEventListener('click', () => {
        setViewMode('list');
        closeSidebar(); // Fecha a sidebar após selecionar
    });
    
    


    // --- Inicialização ---
    loadCartFromLocalStorage(); // Carrega o carrinho salvo
    fetchProducts(); // Inicia o carregamento dos produtos
});