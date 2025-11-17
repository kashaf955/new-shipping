# Shipping Protection Backend

Node.js/Express backend for managing shipping protection insurance for BigCommerce stores.

## Features

- **Insurance Management**: Add, update, and remove shipping protection insurance products
- **Cart Integration**: Seamless integration with BigCommerce Storefront API
- **Dynamic Pricing**: Insurance percentage adjusts based on cart total (1.5% for orders over $200, 2% for orders under $200)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- BigCommerce store with API credentials

## Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your BigCommerce credentials:
```env
BC_STORE_HASH=your_store_hash
BC_AUTH_TOKEN=your_auth_token
BC_CLIENT_ID=your_client_id
INSURANCE_PRODUCT_ID=your_insurance_product_id
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `BC_STORE_HASH`: Your BigCommerce store hash
- `BC_AUTH_TOKEN`: BigCommerce Admin API auth token
- `BC_CLIENT_ID`: BigCommerce client ID
- `INSURANCE_PRODUCT_ID`: Product ID for shipping protection insurance
- `INSURANCE_PERCENTAGE_OVER_200`: Insurance percentage for orders over $200 (default: 1.5)
- `INSURANCE_PERCENTAGE_UNDER_200`: Insurance percentage for orders under $200 (default: 2)
- `CORS_ORIGIN`: CORS origin (default: `*` - allows all origins)
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins (e.g., `https://store1.com,https://store2.com`)
- `CORS_ALLOW_BIGCOMMERCE`: Allow all BigCommerce store domains (default: `true`, set to `false` to disable)
- `SERVER_URL`: Backend server URL for client-side references

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## API Endpoints

### Insurance Endpoints

#### `POST /api/insurance/add`
Add or remove insurance product from cart.

**Request Body:**
```json
{
  "cartId": "cart_id_here",
  "protection": 1
}
```
- `protection`: 1 to add insurance, 0 to remove

**Response:**
```json
{
  "success": 1
}
```

#### `POST /api/insurance/update`
Update insurance product price based on current cart total.

**Request Body:**
```json
{
  "cartId": "cart_id_here"
}
```

**Response:**
```json
{
  "success": 1
}
```

#### `GET /api/insurance/calculate?cartTotal=150`
Calculate insurance amount for a given cart total.

**Response:**
```json
{
  "cartTotal": 150,
  "insuranceAmount": 3.00,
  "percentage": 2
}
```

### Cart Endpoints

#### `GET /api/cart/:cartId`
Get cart data from BigCommerce.

**Response:**
```json
{
  "data": {
    "id": "cart_id",
    "line_items": {
      "physical_items": [...],
      "digital_items": [...]
    }
  }
}
```

### Health Check

#### `GET /health`
Check server status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## Client-Side Integration

Update your client-side script to use the new backend:

1. Update `server_url` in `client/shipping_protection.js` to point to your backend server
2. Include the updated client script in your BigCommerce theme

The client script will automatically call the backend API endpoints instead of the PHP endpoints.

## Project Structure

```
.
├── server.js                 # Main Express server
├── config/
│   └── config.js            # Configuration management
├── routes/
│   ├── insurance.js         # Insurance API routes
│   └── cart.js              # Cart routes
├── services/
│   └── bigcommerce.js       # BigCommerce API service
├── client/
│   └── shipping_protection.js  # Updated client-side script
├── public/
│   └── css/                 # Static CSS files (if needed)
├── package.json
├── .env.example
└── README.md
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": 0,
  "error": "Error message here"
}
```

## Security Notes

- Never commit your `.env` file to version control
- Use environment variables for all sensitive credentials
- Consider implementing rate limiting for production
- Use HTTPS in production
- Validate and sanitize all input data

## Troubleshooting

### Common Issues

1. **CORS Errors**: 
   - For development: Set `CORS_ORIGIN=*` in `.env` (allows all origins)
   - For production: Set `CORS_ALLOWED_ORIGINS=https://yourstore.com` or enable `CORS_ALLOW_BIGCOMMERCE=true` to allow all BigCommerce domains
   - The server automatically allows requests from `.mybigcommerce.com` and `.bigcommerce.com` domains by default
2. **BigCommerce API Errors**: Verify your `BC_AUTH_TOKEN` and `BC_STORE_HASH` are correct
3. **Product Not Found**: Ensure `INSURANCE_PRODUCT_ID` is correct

## License

ISC

## Support

For issues or questions, please check the code comments or create an issue in your repository.

