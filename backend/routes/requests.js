const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { verifyAuth } = require('../middleware/auth');
const { analyzeImage } = require('../utils/huggingface');
const { getDistance } = require('../utils/distance');
const fs = require('fs');

// Configure multer for local file uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Create a new request (Customer only)
router.post('/', verifyAuth, upload.single('image'), async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({ error: 'Only customers can create requests' });
        }

        const { description, latitude, longitude } = req.body;
        let imageUrl = null;
        let aiCategory = 'Unknown';

        if (req.file) {
            imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
            // Note: HuggingFace API ideally needs a public URL or base64. 
            // For a local file, we would need to read it as a Buffer and send it.
            // We will read the file buffer.
            try {
                const fileBuffer = fs.readFileSync(req.file.path);
                aiCategory = await analyzeImage(fileBuffer);
            } catch (aiErr) {
                console.error('AI Categorization Failed:', aiErr.message);
            }
        } else {
            // Allow passing a direct URL for testing, like in our previous script
            if (req.body.image_url) {
                imageUrl = req.body.image_url;
            }
        }

        const requestId = uuidv4();

        await db.runAsync(
            `INSERT INTO requests (id, customer_id, image_url, description, ai_category, latitude, longitude, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
            [requestId, req.user.id, imageUrl, description, aiCategory, latitude, longitude]
        );

        res.status(201).json({
            id: requestId,
            imageUrl,
            description,
            ai_category: aiCategory,
            status: 'open'
        });
    } catch (error) {
        console.error('Create request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get open requests based on seller location
router.get('/open', verifyAuth, async (req, res) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ error: 'Only sellers can search open requests' });
        }

        const { latitude, longitude } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }

        const requests = await db.allAsync(`
      SELECT r.*, u.name as customer_name 
      FROM requests r
      JOIN users u ON r.customer_id = u.id
      WHERE r.status = 'open'
      ORDER BY r.created_at DESC
    `);

        // Calculate distance and sort manually since SQLite lacks native Haversine
        const requestsWithDistance = requests.map(reqData => {
            const distance = getDistance(
                parseFloat(latitude),
                parseFloat(longitude),
                reqData.latitude,
                reqData.longitude
            );
            return { ...reqData, distance_km: distance };
        });

        requestsWithDistance.sort((a, b) => a.distance_km - b.distance_km);

        res.status(200).json(requestsWithDistance);
    } catch (error) {
        console.error('Fetch open requests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get specific request details
router.get('/:id', verifyAuth, async (req, res) => {
    try {
        const request = await db.getAsync(`
      SELECT r.*, u.name as customer_name 
      FROM requests r
      JOIN users u ON r.customer_id = u.id
      WHERE r.id = ?
    `, [req.params.id]);

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // if user is customer, they can only view if it's theirs
        if (req.user.role === 'customer' && request.customer_id !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.status(200).json(request);
    } catch (error) {
        console.error('Fetch request error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Customer: Get all requests for ME
router.get('/customer/me', verifyAuth, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({ error: 'Only customers can view their requests' });
        }

        const requests = await db.allAsync(`
      SELECT * FROM requests
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]);

        res.status(200).json(requests);
    } catch (error) {
        console.error('Fetch customer requests error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
