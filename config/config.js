require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  bigcommerce: {
    storeHash: process.env.BC_STORE_HASH,
    authToken: process.env.BC_AUTH_TOKEN,
    clientId: process.env.BC_CLIENT_ID,
    apiUrl: `https://api.bigcommerce.com/stores/${process.env.BC_STORE_HASH}/v3`
  },
  
  products: {
    insuranceProductId: parseInt(process.env.INSURANCE_PRODUCT_ID) || 6817
  },
  
  insurance: {
    percentageOver200: parseFloat(process.env.INSURANCE_PERCENTAGE_OVER_200) || 1.5,
    percentageUnder200: parseFloat(process.env.INSURANCE_PERCENTAGE_UNDER_200) || 2
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS 
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
      : [],
    allowBigCommerce: process.env.CORS_ALLOW_BIGCOMMERCE !== 'false'
  },
  
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000'
};

