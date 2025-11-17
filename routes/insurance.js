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
 * Get total price of physical items in cart
 */
function getCartPrice(cartData) {
  let listPrice = 0;
  if (cartData.data && cartData.data.line_items && cartData.data.line_items.physical_items) {
    cartData.data.line_items.physical_items.forEach(item => {
      listPrice += (item.list_price * item.quantity);
    });
  }
  return listPrice;
}

/**
 * Find insurance product in cart
 */
function findInsuranceProduct(cartData) {
  if (!cartData.data || !cartData.data.line_items || !cartData.data.line_items.digital_items) {
    return null;
  }

  return cartData.data.line_items.digital_items.find(
    item => item.product_id === config.products.insuranceProductId
  );
}

/**
 * POST /api/insurance/add
 * Add or remove insurance product
 */
router.post('/add', async (req, res) => {
  try {
    const { cartId, protection } = req.body;

    if (!cartId) {
      return res.status(400).json({ success: 0, error: 'Cart ID is required' });
    }

    const protectionValue = parseInt(protection);
    if (protectionValue !== 0 && protectionValue !== 1) {
      return res.status(400).json({ success: 0, error: 'Protection must be 0 or 1' });
    }

    // Get cart data
    const cartData = await bigcommerce.getCart(cartId);
    const baseAmount = getCartPrice(cartData);
    const insuranceProduct = findInsuranceProduct(cartData);

    // Remove existing insurance product if it exists
    if (insuranceProduct) {
      await bigcommerce.removeCartItem(cartId, insuranceProduct.id);
    }

    // Add insurance if protection is enabled
    if (protectionValue === 1) {
      const listPrice = calculateInsuranceAmount(baseAmount);
      const formattedPrice = parseFloat(listPrice.toFixed(2));
      
      await bigcommerce.addCartItem(
        cartId,
        config.products.insuranceProductId,
        1,
        formattedPrice
      );
    }

    res.json({ success: 1 });
  } catch (error) {
    console.error('Error in /insurance/add:', error);
    res.status(500).json({ 
      success: 0, 
      error: error.message || 'Internal server error' 
    });
  }
});

/**
 * POST /api/insurance/update
 * Update insurance product price based on current cart total
 */
router.post('/update', async (req, res) => {
  try {
    const { cartId } = req.body;

    if (!cartId) {
      return res.status(400).json({ success: 0, error: 'Cart ID is required' });
    }

    // Get cart data
    let cartData = await bigcommerce.getCart(cartId);
    const baseAmount = getCartPrice(cartData);
    const insuranceProduct = findInsuranceProduct(cartData);

    if (insuranceProduct) {
      // Remove existing insurance product
      await bigcommerce.removeCartItem(cartId, insuranceProduct.id);

      // Re-fetch cart to ensure it's updated
      cartData = await bigcommerce.getCart(cartId);

      // Check if insurance still exists (in case of multiple)
      const remainingInsurance = findInsuranceProduct(cartData);
      if (remainingInsurance) {
        await bigcommerce.removeCartItem(cartId, remainingInsurance.id);
      }

      // Add insurance with updated price
      const listPrice = calculateInsuranceAmount(baseAmount);
      const formattedPrice = parseFloat(listPrice.toFixed(2));
      
      await bigcommerce.addCartItem(
        cartId,
        config.products.insuranceProductId,
        1,
        formattedPrice
      );
    }

    res.json({ success: 1 });
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

