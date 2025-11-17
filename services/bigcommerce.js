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
   * Get cart data by cart ID (using Storefront API for Storefront cart IDs)
   */
  async getCart(cartId) {
    try {
      // Validate cartId format (should be a valid cart ID)
      if (!cartId || typeof cartId !== 'string') {
        throw new Error('Invalid cart ID format');
      }
      
      // Use Storefront API for cart operations (Storefront cart IDs are UUIDs)
      // Storefront API endpoint: /v3/storefront/carts/{cart_id}
      const storefrontUrl = config.bigcommerce.storefrontApiUrl || `${this.baseURL.replace('/v3', '/v3/storefront')}`;
      const endpointUrl = `${storefrontUrl}/carts/${cartId}`;
      console.log('Fetching cart from Storefront API URL:', endpointUrl);
      console.log('Storefront API base URL:', storefrontUrl);
      const response = await axios.get(endpointUrl, {
        headers: this.storefrontHeaders
      });
      return response.data;
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
   * Add item to cart (using Storefront API for Storefront cart IDs)
   */
  async addCartItem(cartId, productId, quantity = 1, listPrice = null) {
    try {
      // Storefront API uses camelCase (lineItems) not snake_case (line_items)
      const lineItem = {
        lineItems: [{
          quantity: quantity,
          productId: productId
        }]
      };

      // Add listPrice if provided (for insurance products) - Storefront API uses camelCase
      if (listPrice !== null) {
        lineItem.lineItems[0].listPrice = parseFloat(listPrice);
      }

      // Use Storefront API for cart operations
      const storefrontUrl = config.bigcommerce.storefrontApiUrl || `${this.baseURL.replace('/v3', '/v3/storefront')}`;
      const endpointUrl = `${storefrontUrl}/carts/${cartId}/items`;
      console.log('Storefront API URL:', endpointUrl);
      console.log('Request body:', JSON.stringify(lineItem));
      console.log('Using token:', config.bigcommerce.storefrontApiToken !== config.bigcommerce.authToken ? 'Storefront token' : 'Admin token (may not work)');
      
      const response = await axios.post(
        endpointUrl,
        lineItem,
        { headers: this.storefrontHeaders }
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
        const tokenType = config.bigcommerce.storefrontApiToken === config.bigcommerce.authToken ? 'Admin' : 'Storefront';
        throw new Error(`Cart or product not found (404). This usually means you need a Storefront API token (BC_STOREFRONT_API_TOKEN). Currently using ${tokenType} token which cannot access Storefront API. Cart: ${cartId}, Product: ${productId}`);
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error('BigCommerce Storefront API authentication failed. You need a Storefront API token (BC_STOREFRONT_API_TOKEN), not an Admin API token. Admin tokens cannot access Storefront API endpoints.');
      } else if (error.response?.status) {
        throw new Error(`BigCommerce API error: ${error.response.status} - ${JSON.stringify(errorDetails)}`);
      }
      throw error;
    }
  }

  /**
   * Remove item from cart (using Storefront API for Storefront cart IDs)
   */
  async removeCartItem(cartId, itemId) {
    try {
      // Use Storefront API for cart operations
      const storefrontUrl = config.bigcommerce.storefrontApiUrl || `${this.baseURL.replace('/v3', '/v3/storefront')}`;
      const response = await axios.delete(
        `${storefrontUrl}/carts/${cartId}/items/${itemId}`,
        { headers: this.storefrontHeaders }
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

