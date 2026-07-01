const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
    console.log('--- Starting SQLite Integration Tests ---\n');

    try {
        const customerEmail = `customer-${Date.now()}@test.com`;
        const sellerEmail = `seller-${Date.now()}@test.com`;

        // 1. Register Customer
        console.log('1. Registering Customer...');
        const customerRes = await axios.post(`${BASE_URL}/users/register`, {
            name: 'Test Customer',
            email: customerEmail,
            password: 'password123',
            role: 'customer',
            latitude: 40.7128,
            longitude: -74.0060
        });
        const customerToken = customerRes.data.token;
        const customerId = customerRes.data.user.id;
        console.log(`✅ Customer registered. ID: ${customerId}\n`);

        // 2. Register Seller
        console.log('2. Registering Seller (Nearby)...');
        const sellerRes = await axios.post(`${BASE_URL}/users/register`, {
            name: 'Test Seller',
            email: sellerEmail,
            password: 'password123',
            role: 'seller',
            latitude: 40.7130,
            longitude: -74.0065
        });
        const sellerToken = sellerRes.data.token;
        const sellerId = sellerRes.data.user.id;
        console.log(`✅ Seller registered. ID: ${sellerId}\n`);

        // 3. Create Request (Customer)
        console.log('3. Creating Request (Customer)...');
        const demoImage = 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png';
        const reqRes = await axios.post(`${BASE_URL}/requests`, {
            description: 'Looking for a vintage camera',
            image_url: demoImage,
            latitude: 40.7128,
            longitude: -74.0060
        }, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        const requestId = reqRes.data.id;
        console.log(`✅ Request created. ID: ${requestId}`);
        console.log(`   AI Category detected: ${reqRes.data.ai_category}\n`);

        // 4. Fetch Open Requests (Seller)
        console.log('4. Seller checking open requests...');
        const openRes = await axios.get(`${BASE_URL}/requests/open?latitude=40.7130&longitude=-74.0065`, {
            headers: { Authorization: `Bearer ${sellerToken}` }
        });
        console.log(`✅ Found ${openRes.data.length} open requests nearby.\n`);

        // 5. Submit Offer (Seller)
        console.log('5. Seller submitting offer...');
        const offerRes = await axios.post(`${BASE_URL}/offers`, {
            request_id: requestId,
            price: 150.00,
            cod_available: true,
            delivery_available: false,
            seller_lat: 40.7130,
            seller_lon: -74.0065,
            request_lat: 40.7128,
            request_lon: -74.0060
        }, {
            headers: { Authorization: `Bearer ${sellerToken}` }
        });
        const offerId = offerRes.data.id;
        console.log(`✅ Offer submitted. Distance: ${offerRes.data.distance_km.toFixed(2)} km\n`);

        // 6. Fetch Offers (Customer)
        console.log('6. Customer checking offers...');
        const offersRes = await axios.get(`${BASE_URL}/offers/request/${requestId}`, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log(`✅ Found ${offersRes.data.length} offers for request.\n`);

        // 7. Accept Offer (Customer)
        console.log('7. Customer accepting offer...');
        const acceptRes = await axios.post(`${BASE_URL}/offers/${offerId}/accept`, {}, {
            headers: { Authorization: `Bearer ${customerToken}` }
        });
        console.log(`✅ Offer accepted: ${acceptRes.data.message}\n`);

        console.log('--- All Tests Passed Successfully! ---');

    } catch (error) {
        console.error('❌ Test Failed:');
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

runTests();
