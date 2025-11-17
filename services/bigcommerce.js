const axios = require('axios');
const config = require('../config/config');

class BigCommerceService {
  constructor() {
    this.baseURL = config.bigcommerce.apiUrl;
    this.adminHeaders = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-auth-token': config.bigcommerce.authToken
    };
    
    // Storefront API uses different authentication
    this.storefrontHeaders = {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-auth-token': config.bigcommerce.storefrontApiToken
    };
    
    // Log configuration (without sensitive data)
    console.log('BigCommerce Service initialized:', {
      baseURL: this.baseURL,
      hasAuthToken: !!config.bigcommerce.authToken,
      hasStorefrontToken: !!config.bigcommerce.storefrontApiToken,
      storeHash: config.bigcommerce.storeHash
    });
  }

  /**
   * Get cart data by cart ID
   * Tries Storefront API first (for Storefront cart IDs), falls back to Admin API
   */
  async getCart(cartId) {
    try {
      // Validate cartId format (should be a valid cart ID)
      if (!cartId || typeof cartId !== 'string') {
        throw new Error('Invalid cart ID format');
      }
      
      // Try Storefront API first (for Storefront cart IDs which are UUIDs)
      try {
        const storefrontUrl = config.bigcommerce.storefrontApiUrl || `${this.baseURL.replace('/v3', '/v3/storefront')}`;
        const endpointUrl = `${storefrontUrl}/carts/${cartId}`;
        console.log('Fetching cart from Storefront API URL:', endpointUrl);
        const response = await axios.get(endpointUrl, {
          headers: this.storefrontHeaders
        });
        return response.data;
      } catch (storefrontError) {
        // If Storefront API fails, try Admin API
        console.log('Storefront API failed, trying Admin API:', storefrontError.message);
        const adminEndpointUrl = `${this.baseURL}/carts/${cartId}`;
        console.log('Fetching cart from Admin API URL:', adminEndpointUrl);
        const response = await axios.get(adminEndpointUrl, {
          headers: this.adminHeaders
        });
        return response.data;
      }
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      console.error('Error fetching cart:', {
        cartId,
        status: error.response?.status,
        data: errorDetails,
        message: error.message
      });
      
      // Provide more helpful error message
      if (error.response?.status === 404) {
        throw new Error(`Cart not found: ${cartId}`);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('BigCommerce API authentication failed. Please check your credentials.');
      } else if (error.response?.status) {
        throw new Error(`BigCommerce API error: ${error.response.status} - ${JSON.stringify(errorDetails)}`);
      }
      throw error;
    }
  }

  /**
   * Add item to cart with custom price
   * Uses Admin API to support custom listPrice (Storefront API doesn't support custom prices)
   */
  async addCartItem(cartId, productId, quantity = 1, listPrice = null) {
    try {
      // Admin API uses snake_case (line_items) and supports custom list_price
      const lineItem = {
        line_items: [{
          quantity: quantity,
          product_id: productId
        }]
      };

      // Add list_price if provided (for insurance products) - Admin API uses snake_case
      if (listPrice !== null) {
        lineItem.line_items[0].list_price = parseFloat(listPrice);
      }

      // Use Admin API for cart operations (supports custom prices)
      // Note: Admin API can work with Storefront cart IDs
      const endpointUrl = `${this.baseURL}/carts/${cartId}/items`;
      console.log('Admin API URL:', endpointUrl);
      console.log('Request body:', JSON.stringify(lineItem));
      console.log('Using Admin API token for custom price support');
      
      const response = await axios.post(
        endpointUrl,
        lineItem,
        { headers: this.adminHeaders }
      );
      return response.data;
    } catch (error) {
      const errorDetails = error.response?.data || error.message;
      console.error('Error adding cart item:', {
        cartId,
        productId,
        listPrice,
        status: error.response?.status,
        data: errorDetails,
        message: error.message
      });
      
      // Provide more helpful error message
      if (error.response?.status === 404) {
        throw new Error(`Cart or product not found (404). Cart: ${cartId}, Product: ${productId}`);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('BigCommerce Admin API authentication failed. Please check your BC_AUTH_TOKEN.');
      } else if (error.response?.status) {
        throw new Error(`BigCommerce API error: ${error.response.status} - ${JSON.stringify(errorDetails)}`);
      }
      throw error;
    }
  }

  /**
   * Remove item from cart
   * Uses Admin API (works with both Admin and Storefront cart IDs)
   */
  async removeCartItem(cartId, itemId) {
    try {
      // Use Admin API for cart operations
      const response = await axios.delete(
        `${this.baseURL}/carts/${cartId}/items/${itemId}`,
        { headers: this.adminHeaders }
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

