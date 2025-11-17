// Simple script to test CSS file accessibility
const https = require('https');
const fs = require('fs');

const url = 'https://new-shipping-woad.vercel.app/css/shipping_protection.css';

console.log('Testing CSS file accessibility...');
console.log('URL:', url);
console.log('');

https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Content-Type:', res.headers['content-type']);
  console.log('Content-Length:', res.headers['content-length']);
  console.log('');

  if (res.statusCode === 200) {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('✅ CSS file is accessible!');
      console.log('File size:', data.length, 'bytes');
      console.log('First 200 characters:');
      console.log(data.substring(0, 200));
    });
  } else {
    console.log('❌ CSS file returned status:', res.statusCode);
    let errorData = '';
    res.on('data', (chunk) => {
      errorData += chunk;
    });
    res.on('end', () => {
      console.log('Response:', errorData);
    });
  }
}).on('error', (err) => {
  console.error('❌ Error:', err.message);
});

