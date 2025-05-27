document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÃO ---
    // Cole aqui o link da sua planilha publicada como CSV
    const googleSheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRY00iz3q4UEcZ0BUpYJ52EnLyKpAv2r37_UUS01aqb2GF1hWpxKEcmUYC1RslP-Kp-dUuJd_wTb2uq/pub?output=csv';

    // --- ELEMENTOS DO DOM ---
    const productGrid = document.getElementById('product-grid');
    const loader = document.getElementById('loader');
    const searchInput = document.getElementById('search-input');
    
    // Modal de Detalhes do Produto
    const productDetailModal = document.getElementById('modal'); // Renomeado para clareza
    const closeProductDetailModalBtn = document.getElementById('close-modal');
    const addToCartButton = document.getElementById('add-to-cart-button');

    // Carrinho
    const cartIcon = document.getElementById('cart-icon');
    const cartCountSpan = document.getElementById('cart-count');
    const cartModal = document.getElementById('cart-modal');
    const closeCartModalBtn = document.getElementById('close-cart-modal');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const clearCartButton = document.getElementById('clear-cart-button');

    let allProducts = [];
    let currentImageIndex = 0;
    let currentImages = [];
    let currentProduct = null; // Para guardar o produto atualmente no modal
    let cart = []; // Array para armazenar os itens do carrinho: { product: {}, quantity: N }

    // --- FUNÇÕES GERAIS ---

    // Função para buscar e processar os dados da planilha
    async function fetchProducts() {
        if (!googleSheetCsvUrl || googleSheetCsvUrl === 'COLE_O_LINK_DA_SUA_PLANILHA_PUBLICADA_COM O_CSV_AQUI') {
            loader.innerHTML = 'Erro: Configure o link da sua Planilha Google no código HTML.';
            return;
        }
        
        try {
            const response = await fetch(googleSheetCsvUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.text();
            allProducts = parseCSV(data);
            displayProducts(allProducts);
        } catch (error) {
            console.error('Falha ao buscar produtos:', error);
            loader.innerHTML = 'Não foi possível carregar os produtos. Verifique o link e as permissões da planilha.';
        } finally {
            if(loader) loader.style.display = 'none';
        }
    }

    // Função para parsear o CSV (com melhorias para vírgulas em descrições)
    function parseCSV(text) {
        const rows = text.split(/\r?\n/).slice(1); // Ignora cabeçalho
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

            if (values.length < 5) return null; // Ignora linhas mal formatadas ou incompletas

            const priceString = values[2].replace(',', '.'); // Troca vírgula por ponto para parseFloat
            const stockString = values[3];

            return {
                // Adicione um ID único para cada produto, útil para o carrinho
                id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
                name: values[0],
                description: values[1],
                price: parseFloat(priceString),
                stock: parseInt(stockString, 10),
                images: values[4].split(',').map(url => url.trim()).filter(url => url)
            };
        }).filter(Boolean); // Remove linhas nulas
    }
    
    // Função para exibir os produtos na grade
    function displayProducts(products) {
        productGrid.innerHTML = ''; // Limpa a grade antes de adicionar novos itens
        if (products.length === 0) {
            productGrid.innerHTML = '<p>Nenhum produto encontrado.</p>';
            return;
        }
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const stockStatus = getStockStatus(product.stock);
            const firstImage = product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/200/cccccc/ffffff?text=Sem+Imagem';

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
            
            card.addEventListener('click', () => showProductModal(product));
            productGrid.appendChild(card);
        });
    }
    
    // Função para definir status do estoque
    function getStockStatus(stock) {
        if (isNaN(stock) || stock === 0) {
            return { text: 'Esgotado', className: 'out' };
        } else if (stock <= 5) {
            return { text: `${stock} em estoque`, className: 'low' };
        } else {
            return { text: 'Em estoque', className: 'high' };
        }
    }
    
    // --- LÓGICA DO MODAL DE DETALHES DO PRODUTO ---
    function showProductModal(product) {
        currentProduct = product; // Salva o produto atual
        currentImages = product.images;
        currentImageIndex = 0;
        
        const priceText = isNaN(product.price) ? 'N/A' : `R$ ${product.price.toFixed(2).replace('.', ',')}`;
        document.getElementById('modal-price').textContent = priceText;
        document.getElementById('modal-name').textContent = product.name;
        document.getElementById('modal-description').textContent = product.description;
        
        const stockStatus = getStockStatus(product.stock);
        const modalStock = document.getElementById('modal-stock');
        modalStock.textContent = stockStatus.text;
        modalStock.className = `stock ${stockStatus.className}`;

        // Desabilita/habilita botão "Adicionar ao Carrinho" se esgotado
        if (product.stock === 0 || isNaN(product.stock)) {
            addToCartButton.textContent = 'Produto Esgotado';
            addToCartButton.disabled = true;
            addToCartButton.style.backgroundColor = '#ccc'; // Cor cinza para desabilitado
        } else {
            addToCartButton.textContent = 'Adicionar ao Carrinho';
            addToCartButton.disabled = false;
            addToCartButton.style.backgroundColor = ''; // Remove cor se já não for padrão
        }

        updateSlider();
        productDetailModal.style.display = 'flex';
    }
    
    function updateSlider() {
        const slider = document.getElementById('modal-image-slider');
        // Remove imagens existentes (mantém botões de navegação)
        Array.from(slider.children).forEach(child => {
            if (child.tagName === 'IMG') {
                child.remove();
            }
        });
        
        currentImages.forEach((imgUrl, index) => {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = `Imagem ${index + 1}`;
            if(index === currentImageIndex) img.classList.add('active');
            slider.insertBefore(img, slider.querySelector('.next'));
        });
        
        document.querySelector('.slider-btn.prev').disabled = currentImageIndex === 0;
        document.querySelector('.slider-btn.next').disabled = currentImageIndex === currentImages.length - 1;
        
        const hasMultipleImages = currentImages.length > 1;
        document.querySelector('.slider-btn.prev').style.display = hasMultipleImages ? 'block' : 'none';
        document.querySelector('.slider-btn.next').style.display = hasMultipleImages ? 'block' : 'none';
    }
    
    // Torna changeSlide global para ser acessível via onclick no HTML
    window.changeSlide = function(direction) {
        const newIndex = currentImageIndex + direction;
        if (newIndex >= 0 && newIndex < currentImages.length) {
            currentImageIndex = newIndex;
            updateSlider();
        }
    }

    closeProductDetailModalBtn.addEventListener('click', () => {
        productDetailModal.style.display = 'none';
    });
    
    productDetailModal.addEventListener('click', (e) => {
        if(e.target === productDetailModal) {
            productDetailModal.style.display = 'none';
        }
    });
    
    // --- LÓGICA DO CARRINHO ---

    // Adicionar produto ao carrinho
    addToCartButton.addEventListener('click', () => {
        if (currentProduct && currentProduct.stock > 0) {
            addItemToCart(currentProduct);
            productDetailModal.style.display = 'none'; // Fecha o modal de detalhes
        } else {
            alert('Produto esgotado ou inválido.');
        }
    });

    // Abrir modal do carrinho
    cartIcon.addEventListener('click', () => {
        renderCart(); // Renderiza o carrinho antes de abrir
        cartModal.style.display = 'flex';
    });

    // Fechar modal do carrinho
    closeCartModalBtn.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });

    cartModal.addEventListener('click', (e) => {
        if(e.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });

    // Limpar carrinho
    clearCartButton.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja limpar o carrinho?')) {
            cart = [];
            updateCartCount();
            renderCart();
        }
    });

    // Adicionar item ao array do carrinho
    function addItemToCart(productToAdd) {
        const existingItem = cart.find(item => item.product.id === productToAdd.id);

        if (existingItem) {
            // Verifica se há estoque disponível
            if (existingItem.quantity < productToAdd.stock) {
                existingItem.quantity++;
            } else {
                alert(`Não há mais estoque de ${productToAdd.name} disponível.`);
                return;
            }
        } else {
            cart.push({ product: productToAdd, quantity: 1 });
        }
        updateCartCount();
        renderCart(); // Opcional: renderizar o carrinho imediatamente após adicionar
        alert(`${productToAdd.name} adicionado ao carrinho!`);
    }

    // Remover item do carrinho
    function removeItemFromCart(productId) {
        cart = cart.filter(item => item.product.id !== productId);
        updateCartCount();
        renderCart();
    }

    // Atualizar quantidade de item no carrinho
    function updateItemQuantity(productId, change) {
        const item = cart.find(item => item.product.id === productId);
        if (item) {
            const newQuantity = item.quantity + change;
            if (newQuantity > 0 && newQuantity <= item.product.stock) {
                item.quantity = newQuantity;
            } else if (newQuantity <= 0) {
                removeItemFromCart(productId); // Remove se a quantidade for 0 ou menos
            } else if (newQuantity > item.product.stock) {
                alert(`Você atingiu o limite de estoque para ${item.product.name}.`);
            }
        }
        updateCartCount();
        renderCart();
    }

    // Renderizar os itens no modal do carrinho
    function renderCart() {
        cartItemsContainer.innerHTML = ''; // Limpa itens existentes
        let total = 0;

        if (cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            clearCartButton.style.display = 'none';
        } else {
            emptyCartMessage.style.display = 'none';
            clearCartButton.style.display = 'block';
            cart.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('cart-item');
                
                const itemTotal = item.product.price * item.quantity;
                total += itemTotal;

                const firstImage = item.product.images.length > 0 ? item.product.images[0] : 'https://via.placeholder.com/60/cccccc/ffffff?text=';

                itemElement.innerHTML = `
                    <img src="${firstImage}" alt="${item.product.name}">
                    <div class="cart-item-details">
                        <div class="name">${item.product.name}</div>
                        <div class="price">R$ ${item.product.price.toFixed(2).replace('.', ',')} x ${item.quantity}</div>
                    </div>
                    <div class="cart-item-controls">
                        <button class="decrease-quantity" data-id="${item.product.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="increase-quantity" data-id="${item.product.id}">+</button>
                    </div>
                `;
                cartItemsContainer.appendChild(itemElement);
            });
        }
        
        cartTotalSpan.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        
        // Adiciona event listeners aos novos botões de quantidade
        document.querySelectorAll('.decrease-quantity').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.id;
                updateItemQuantity(productId, -1);
            });
        });

        document.querySelectorAll('.increase-quantity').forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.id;
                updateItemQuantity(productId, 1);
            });
        });
    }

    // Atualizar o contador no ícone do carrinho
    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountSpan.textContent = totalItems;
    }

    // --- LÓGICA DA BUSCA ---
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = allProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
        displayProducts(filteredProducts);
    });

    // --- INICIALIZAÇÃO ---
    fetchProducts();
    updateCartCount(); // Atualiza a contagem do carrinho ao carregar a página
});