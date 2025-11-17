const axios = require('axios');
const config = require('../config/config');

class BigCommerceService {
  constructor() {
    this.baseURL = config.bigcommerce.apiUrl;
    this.headers = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-auth-token': config.bigcommerce.authToken
    };
  }

  /**
   * Get cart data by cart ID
   */
  async getCart(cartId) {
    try {
      const response = await axios.get(`${this.baseURL}/carts/${cartId}`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching cart:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addCartItem(cartId, productId, quantity = 1, listPrice = null) {
    try {
      const lineItem = {
        line_items: [{
          quantity: quantity,
          product_id: productId
        }]
      };

      // Add list_price if provided (for insurance products)
      if (listPrice !== null) {
        lineItem.line_items[0].list_price = parseFloat(listPrice);
      }

      const response = await axios.post(
        `${this.baseURL}/carts/${cartId}/items`,
        lineItem,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding cart item:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeCartItem(cartId, itemId) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/carts/${cartId}/items/${itemId}`,
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      console.error('Error removing cart item:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get product by ID (using GraphQL)
   */
  async getProductCategories(productId, storefrontApiToken) {
    try {
      // Note: This requires Storefront API token, not Admin API token
      // The client will need to make this call directly or pass the token
      const query = `query productById { 
        site { 
          product(entityId: ${productId}) { 
            categories (first: 50) { 
              edges { 
                node { 
                  entityId 
                  name 
                } 
              } 
            } 
          } 
        } 
      }`;

      // This would typically be called from the frontend with storefront API token
      // Returning the query for frontend use
      return { query, productId };
    } catch (error) {
      console.error('Error getting product categories:', error.message);
      throw error;
    }
  }
}

module.exports = new BigCommerceService();

