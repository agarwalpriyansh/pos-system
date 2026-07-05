class ProductService {
  constructor({ productRepository }) {
    this.productRepository = productRepository;
  }

  async getActiveProducts(shopId) {
    return this.productRepository.findByShopIdAndActive(shopId);
  }

  async createProduct(shopId, productData) {
    const { name, sku, price, category, stock } = productData;

    if (!name || !sku || price === undefined || stock === undefined) {
      throw new Error('Name, SKU, price, and stock are required');
    }

    const existingProduct = await this.productRepository.findBySku(shopId, sku);
    if (existingProduct) {
      throw new Error(`SKU '${sku}' already exists in your shop`);
    }

    return this.productRepository.save({ 
      shopId, 
      name, 
      sku, 
      price, 
      category: category || 'General', 
      stock 
    });
  }

  async updateProductStock(id, shopId, stock) {
    const product = await this.productRepository.findById(id, shopId);
    if (!product) {
      throw new Error('Product not found in this shop');
    }
    product.stock = stock;
    await product.save();
    return product;
  }

  async updateProductDetails(id, shopId, details) {
    const { name, sku, price, category, stock, isActive } = details;

    if (sku) {
      const existingProduct = await this.productRepository.findBySku(shopId, sku);
      if (existingProduct && existingProduct._id.toString() !== id) {
        throw new Error(`SKU '${sku}' already exists in your shop`);
      }
    }

    const product = await this.productRepository.findById(id, shopId);
    if (!product) {
      throw new Error('Product not found in this shop');
    }

    if (name !== undefined) product.name = name;
    if (sku !== undefined) product.sku = sku;
    if (price !== undefined) product.price = price;
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = stock;
    if (isActive !== undefined) product.isActive = isActive;

    await product.save();
    return product;
  }

  async deleteProductPermanently(id, shopId) {
    const product = await this.productRepository.findByIdAndDelete(id, shopId);
    if (!product) {
      throw new Error('Product not found in this shop');
    }
    return product;
  }
}

module.exports = ProductService;
