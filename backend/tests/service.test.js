const test = require('node:test');
const assert = require('node:assert');
const ProductService = require('../src/services/productService');

test('ProductService - createProduct success', async () => {
  const mockProduct = {
    _id: 'product-123',
    shopId: 'shop-abc',
    name: 'Apple',
    sku: 'AAPL',
    price: 1.5,
    category: 'Fruits',
    stock: 100,
    isActive: true
  };

  const mockProductRepository = {
    findBySku: async (shopId, sku) => null, // no existing product with this SKU
    save: async (productData) => {
      return {
        _id: 'product-123',
        ...productData
      };
    }
  };

  const productService = new ProductService({ productRepository: mockProductRepository });

  const result = await productService.createProduct('shop-abc', {
    name: 'Apple',
    sku: 'AAPL',
    price: 1.5,
    category: 'Fruits',
    stock: 100
  });

  assert.strictEqual(result._id, 'product-123');
  assert.strictEqual(result.sku, 'AAPL');
  assert.strictEqual(result.price, 1.5);
});

test('ProductService - createProduct SKU duplicate throws error', async () => {
  const mockProductRepository = {
    findBySku: async (shopId, sku) => ({ _id: 'product-existing' }),
    save: async (productData) => productData
  };

  const productService = new ProductService({ productRepository: mockProductRepository });

  await assert.rejects(
    async () => {
      await productService.createProduct('shop-abc', {
        name: 'Apple',
        sku: 'AAPL',
        price: 1.5,
        category: 'Fruits',
        stock: 100
      });
    },
    (err) => {
      assert.strictEqual(err.message, "SKU 'AAPL' already exists in your shop");
      return true;
    }
  );
});
