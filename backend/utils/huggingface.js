const axios = require('axios');

async function analyzeImage(imageInput) {
    try {
        const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
        const modelUrl = 'https://api-inference.huggingface.co/models/google/vit-base-patch16-224';

        let requestData;
        let headers = {};

        if (HUGGINGFACE_API_KEY) {
            headers['Authorization'] = `Bearer ${HUGGINGFACE_API_KEY}`;
        }

        if (Buffer.isBuffer(imageInput)) {
            requestData = imageInput;
            headers['Content-Type'] = 'application/octet-stream';
        } else if (typeof imageInput === 'string' && imageInput.startsWith('http')) {
            const fetch = (await import('node-fetch')).default;
            const getImg = await fetch(imageInput);
            requestData = await getImg.arrayBuffer();
            headers['Content-Type'] = 'application/octet-stream';
        } else {
            return "Unknown";
        }

        const response = await axios.post(modelUrl, requestData, {
            headers: headers,
        });

        if (response.data && response.data.length > 0) {
            return response.data[0].label;
        }

        return 'Unknown';
    } catch (error) {
        console.error('HuggingFace API Error:', error.response?.data || error.message);
        return 'Unknown (AI Unavailable)';
    }
}

module.exports = { analyzeImage };
