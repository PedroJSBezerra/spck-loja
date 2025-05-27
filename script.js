document.addEventListener('DOMContentLoaded', () => {
  // --- CONFIGURAÇÃO ---
  // Cole aqui o link da sua planilha publicada como CSV
  const googleSheetCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRY00iz3q4UEcZ0BUpYJ52EnLyKpAv2r37_UUS01aqb2GF1hWpxKEcmUYC1RslP-Kp-dUuJd_wTb2uq/pub?output=csv';
  
  // --- ELEMENTOS DO DOM ---
  const productGrid = document.getElementById('product-grid');
  const loader = document.getElementById('loader');
  const searchInput = document.getElementById('search-input');
  const modal = document.getElementById('modal');
  const closeModalBtn = document.getElementById('close-modal');
  
  let allProducts = [];
  let currentImageIndex = 0;
  let currentImages = [];
  
  // --- FUNÇÃO PARA BUSCAR E PROCESSAR OS DADOS ---
  async function fetchProducts() {
    if (!googleSheetCsvUrl || googleSheetCsvUrl === 'COLE_O_LINK_DA_SUA_PLANILHA_PUBLICADA_COMO_CSV_AQUI') {
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
      if (loader) loader.style.display = 'none';
    }
  }
  
  // --- FUNÇÃO PARA PARSEAR O CSV ---
  function parseCSV(text) {
    const rows = text.split(/\r?\n/).slice(1); // Ignora cabeçalho
    return rows.map(row => {
      // Use a more robust regex to split by comma, ignoring commas inside quotes
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
      values.push(currentField.trim()); // Add the last field
      
      if (values.length < 5) return null; // Ignora linhas mal formatadas
      
      // Clean and convert price and stock
      const priceString = values[2].replace(',', '.'); // Replace comma with dot for float parsing
      const stockString = values[3];
      
      return {
        name: values[0],
        description: values[1],
        price: parseFloat(priceString),
        stock: parseInt(stockString, 10),
        images: values[4].split(',').map(url => url.trim()).filter(url => url)
      };
    }).filter(Boolean); // Remove linhas nulas
  }
  
  // --- FUNÇÃO PARA EXIBIR OS PRODUTOS ---
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
      const firstImage = product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/200';
      
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
  
  // --- FUNÇÃO PARA DEFINIR STATUS DO ESTOQUE ---
  function getStockStatus(stock) {
    if (isNaN(stock) || stock === 0) { // Handle NaN for stock
      return { text: 'Esgotado', className: 'out' };
    } else if (stock <= 5) {
      return { text: `${stock} em estoque`, className: 'low' };
    } else {
      return { text: 'Em estoque', className: 'high' };
    }
  }
  
  // --- LÓGICA DO MODAL ---
  function showProductModal(product) {
    currentImages = product.images;
    currentImageIndex = 0;
    
    // Check if price is NaN before formatting
    const priceText = isNaN(product.price) ? 'N/A' : `R$ ${product.price.toFixed(2).replace('.', ',')}`;
    document.getElementById('modal-price').textContent = priceText;
    document.getElementById('modal-name').textContent = product.name;
    document.getElementById('modal-description').textContent = product.description;
    
    const stockStatus = getStockStatus(product.stock);
    const modalStock = document.getElementById('modal-stock');
    modalStock.textContent = stockStatus.text;
    modalStock.className = `stock ${stockStatus.className}`;
    
    updateSlider();
    modal.style.display = 'flex';
  }
  
  function updateSlider() {
    const slider = document.getElementById('modal-image-slider');
    // Remove existing images but keep buttons
    Array.from(slider.children).forEach(child => {
      if (child.tagName === 'IMG') {
        child.remove();
      }
    });
    
    currentImages.forEach((imgUrl, index) => {
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = `Imagem ${index + 1}`;
      if (index === currentImageIndex) img.classList.add('active');
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
  
  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  
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
});