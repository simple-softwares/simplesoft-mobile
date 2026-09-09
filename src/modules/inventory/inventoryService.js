import api from '../../services/api/httpClient';

const inventoryService = {
  async getProducts({ search = '', categoryId = null, limit = 80 } = {}) {
    try {
      const { data } = await api.get('/inventory/products', {
        params: { search: search || undefined, category_id: categoryId || undefined, limit },
      });
      return data || [];
    } catch { return []; }
  },

  async getProduct(id) {
    const { data } = await api.get(`/inventory/products/${id}`);
    return data;
  },

  async getCategories() {
    try { const { data } = await api.get('/inventory/categories'); return data || []; }
    catch { return []; }
  },

  async getStock(productId) {
    try { const { data } = await api.get(`/inventory/products/${productId}/stock`); return data; }
    catch { return null; }
  },

  async getMovements({ productId, limit = 50 } = {}) {
    try {
      const { data } = await api.get('/inventory/movements', {
        params: { product_id: productId || undefined, limit },
      });
      return data || [];
    } catch { return []; }
  },
};

export default inventoryService;
