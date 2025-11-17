const express = require('express');
const router = express.Router();
const bigcommerce = require('../services/bigcommerce');

/**
 * GET /api/cart/:cartId
 * Get cart data
 */
router.get('/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;
    const { include } = req.query;

    const cartData = await bigcommerce.getCart(cartId);
    
    res.json(cartData);
  } catch (error) {
    console.error('Error in /cart/:cartId:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
});

module.exports = router;

