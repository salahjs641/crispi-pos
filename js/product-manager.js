// js/product-manager.js — Add, edit, delete products with image upload

const ProductManager = {
    currentImageData: null,

    init() {
        document.getElementById('btnAddProduct').addEventListener('click', () => this.openAdd());

        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.save();
        });

        document.getElementById('btnDeleteProduct').addEventListener('click', () => this.deleteProduct());

        // Image upload
        const uploadArea = document.getElementById('imageUploadArea');
        const imageInput = document.getElementById('productImage');

        uploadArea.addEventListener('click', () => imageInput.click());

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            this.processImage(file);
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--accent)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.processImage(file);
            }
        });
    },

    processImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 300;
                let w = img.width;
                let h = img.height;

                if (w > maxSize || h > maxSize) {
                    if (w > h) {
                        h = Math.round((h * maxSize) / w);
                        w = maxSize;
                    } else {
                        w = Math.round((w * maxSize) / h);
                        h = maxSize;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);

                this.currentImageData = canvas.toDataURL('image/jpeg', 0.7);

                const preview = document.getElementById('imagePreview');
                const text = document.getElementById('imageUploadText');
                preview.src = this.currentImageData;
                preview.style.display = 'block';
                text.style.display = 'none';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    openAdd() {
        document.getElementById('productModalTitle').textContent = 'Ajouter un Produit';
        document.getElementById('productForm').reset();
        document.getElementById('productEditId').value = '';
        document.getElementById('btnDeleteProduct').style.display = 'none';
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('imageUploadText').style.display = '';
        this.currentImageData = null;
        App.openModal('productModal');
    },

    openEdit(productId) {
        const product = Storage.getProducts().find(p => p.id === productId);
        if (!product) return;

        document.getElementById('productModalTitle').textContent = 'Modifier le Produit';
        document.getElementById('productEditId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('btnDeleteProduct').style.display = '';

        const preview = document.getElementById('imagePreview');
        const text = document.getElementById('imageUploadText');
        if (product.image && product.image !== PLACEHOLDER_IMG) {
            preview.src = product.image;
            preview.style.display = 'block';
            text.style.display = 'none';
            this.currentImageData = product.image;
        } else {
            preview.style.display = 'none';
            text.style.display = '';
            this.currentImageData = null;
        }

        App.openModal('productModal');
    },

    save() {
        const editId = document.getElementById('productEditId').value;
        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const category = document.getElementById('productCategory').value;
        const image = this.currentImageData || PLACEHOLDER_IMG;

        if (!name || isNaN(price) || price < 0) return;

        if (editId) {
            Storage.updateProduct(editId, { name, price, category, image });
            App.showToast('Produit modifié');
        } else {
            const products = Storage.getProducts();
            const categoryProducts = products.filter(p => p.category === category);
            Storage.addProduct({
                name,
                price,
                category,
                image,
                position: categoryProducts.length + 1
            });
            App.showToast('Produit ajouté');
        }

        App.closeModal('productModal');
        Products.renderGrid();
    },

    deleteProduct() {
        const editId = document.getElementById('productEditId').value;
        if (!editId) return;

        App.confirm('Supprimer ce produit ?', () => {
            Storage.deleteProduct(editId);
            App.closeModal('productModal');
            Products.renderGrid();
            App.showToast('Produit supprimé');
        });
    }
};
