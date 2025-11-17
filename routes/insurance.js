const express = require('express');
const router = express.Router();
const bigcommerce = require('../services/bigcommerce');
const config = require('../config/config');

/**
 * Calculate insurance amount based on cart total
 */
function calculateInsuranceAmount(cartTotal) {
  const percentage = cartTotal > 200 
    ? config.insurance.percentageOver200 
    : config.insurance.percentageUnder200;
  
  return (cartTotal * percentage) / 100;
}

/**
 * Get total price of physical items in cart (excluding insurance product)
 * Handles both Admin API and Storefront API response formats
 */
function getCartPrice(cartData) {
  let listPrice = 0;
  
  // Storefront API format: cartData.data.line_items.physical_items
  // Admin API format: cartData.data.line_items.physical_items (same)
  const lineItems = cartData.data?.line_items || cartData.line_items;
  const physicalItems = lineItems?.physical_items || [];
  
  physicalItems.forEach(item => {
    // Exclude insurance product from calculation
    const productId = item.product_id || item.productId;
    if (productId !== config.products.insuranceProductId) {
      listPrice += (item.list_price || item.listPrice || 0) * (item.quantity || 0);
    }
  });
  
  return listPrice;
}

/**
 * Find insurance product in cart
 * Handles both Admin API and Storefront API response formats
 */
function findInsuranceProduct(cartData) {
  // Storefront API format: cartData.data.line_items.digital_items
  // Admin API format: cartData.data.line_items.digital_items (same)
  const lineItems = cartData.data?.line_items || cartData.line_items;
  const digitalItems = lineItems?.digital_items || [];
  
  return digitalItems.find(
    item => (item.product_id || item.productId) === config.products.insuranceProductId
  );
}

/**
 * POST /api/insurance/add
 * Add or remove insurance product
 */
router.post('/add', async (req, res) => {
  try {
    const { cartId, protection, cartTotal, cartData: frontendCartData } = req.body;

    console.log('Insurance add request:', { cartId, protection, cartIdType: typeof cartId, hasCartTotal: !!cartTotal, hasCartData: !!frontendCartData });

    if (!cartId) {
      return res.status(400).json({ success: 0, error: 'Cart ID is required' });
    }

    const protectionValue = parseInt(protection);
    if (protectionValue !== 0 && protectionValue !== 1) {
      return res.status(400).json({ success: 0, error: 'Protection must be 0 or 1' });
    }

    // Calculate insurance amount - ALWAYS use cartTotal from frontend (excludes insurance)
    // Don't recalculate from cart data as it might include insurance with wrong price
    let baseAmount;
    if (cartTotal !== undefined && cartTotal !== null) {
      baseAmount = parseFloat(cartTotal);
    } else if (frontendCartData) {
      baseAmount = getCartPrice(frontendCartData);
    } else {
      return res.status(400).json({ success: 0, error: 'Cart total or cart data is required' });
    }
    
    const insuranceAmount = protectionValue === 1 ? calculateInsuranceAmount(baseAmount) : 0;
    const formattedPrice = parseFloat(insuranceAmount.toFixed(2));
    
    console.log('Insurance calculation:', { baseAmount, insuranceAmount: formattedPrice, protection: protectionValue, cartTotalFromFrontend: cartTotal });

    // Backend handles cart operations using Admin API (supports custom prices)
    if (protectionValue === 1) {
      // Check if insurance already exists
      let cartData;
      try {
        cartData = await bigcommerce.getCart(cartId);
        const existingInsurance = findInsuranceProduct(cartData);
        
        if (existingInsurance) {
          // Remove existing insurance first
          await bigcommerce.removeCartItem(cartId, existingInsurance.id);
        }
      } catch (error) {
        // If cart fetch fails, try to add anyway (might be a new cart)
        console.log('Could not fetch cart, proceeding with add:', error.message);
      }
      
      // Add insurance with custom price
      await bigcommerce.addCartItem(
        cartId,
        config.products.insuranceProductId,
        1,
        formattedPrice
      );
    } else {
      // Remove insurance
      try {
        const cartData = await bigcommerce.getCart(cartId);
        const existingInsurance = findInsuranceProduct(cartData);
        
        if (existingInsurance) {
          await bigcommerce.removeCartItem(cartId, existingInsurance.id);
        }
      } catch (error) {
        console.log('Could not remove insurance (may not exist):', error.message);
      }
    }

    res.json({ 
      success: 1,
      insuranceAmount: formattedPrice,
      productId: config.products.insuranceProductId,
      action: protectionValue === 1 ? 'add' : 'remove',
      cartId: cartId
    });
  } catch (error) {
    console.error('Error in /insurance/add:', error);
    const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Internal server error';
    const statusCode = error.response?.status || 500;
    
    // Log detailed error for debugging
    console.error('Error details:', {
      message: errorMessage,
      status: statusCode,
      response: error.response?.data,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: 0, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        status: statusCode,
        response: error.response?.data
      } : undefined
    });
  }
});

/**
 * POST /api/insurance/update
 * Update insurance product price based on current cart total
 * Returns instructions for frontend to handle cart operations
 */
router.post('/update', async (req, res) => {
  try {
    const { cartId, cartTotal, cartData: frontendCartData } = req.body;

    console.log('Insurance update request:', { cartId, hasCartTotal: !!cartTotal, hasCartData: !!frontendCartData });

    if (!cartId) {
      return res.status(400).json({ success: 0, error: 'Cart ID is required' });
    }

    // Calculate insurance amount - ALWAYS use cartTotal from frontend (excludes insurance)
    let baseAmount;
    if (cartTotal !== undefined && cartTotal !== null) {
      baseAmount = parseFloat(cartTotal);
    } else if (frontendCartData) {
      baseAmount = getCartPrice(frontendCartData);
    } else {
      return res.status(400).json({ success: 0, error: 'Cart total or cart data is required' });
    }
    
    const insuranceAmount = calculateInsuranceAmount(baseAmount);
    const formattedPrice = parseFloat(insuranceAmount.toFixed(2));
    
    console.log('Insurance update calculation:', { baseAmount, insuranceAmount: formattedPrice });

    // Backend handles cart update using Admin API (supports custom prices)
    try {
      const cartData = await bigcommerce.getCart(cartId);
      const existingInsurance = findInsuranceProduct(cartData);
      
      if (existingInsurance) {
        // Remove existing insurance
        await bigcommerce.removeCartItem(cartId, existingInsurance.id);
        
        // Add insurance with updated price
        await bigcommerce.addCartItem(
          cartId,
          config.products.insuranceProductId,
          1,
          formattedPrice
        );
      }
    } catch (error) {
      console.error('Error updating insurance in cart:', error);
      return res.status(500).json({ 
        success: 0, 
        error: error.message || 'Failed to update insurance in cart' 
      });
    }

    res.json({ 
      success: 1,
      insuranceAmount: formattedPrice,
      productId: config.products.insuranceProductId,
      action: 'update',
      cartId: cartId
    });
  } catch (error) {
    console.error('Error in /insurance/update:', error);
    res.status(500).json({ 
      success: 0, 
      error: error.message || 'Internal server error' 
    });
  }
});

/**
 * GET /api/insurance/calculate
 * Calculate insurance amount for a given cart total
 */
router.get('/calculate', (req, res) => {
  try {
    const cartTotal = parseFloat(req.query.cartTotal);

    if (isNaN(cartTotal) || cartTotal < 0) {
      return res.status(400).json({ error: 'Valid cartTotal is required' });
    }

    const insuranceAmount = calculateInsuranceAmount(cartTotal);
    const formattedAmount = parseFloat(insuranceAmount.toFixed(2));

    res.json({
      cartTotal,
      insuranceAmount: formattedAmount,
      percentage: cartTotal > 200 
        ? config.insurance.percentageOver200 
        : config.insurance.percentageUnder200
    });
  } catch (error) {
    console.error('Error in /insurance/calculate:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;

