const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../database');
const { verifyAuth } = require('../middleware/auth');
const { getDistance } = require('../utils/distance');

// Submit an offer
router.post('/', verifyAuth, async (req, res) => {
    try {
        if (req.user.role !== 'seller') {
            return res.status(403).json({ error: 'Only sellers can submit offers' });
        }

        const { request_id, price, cod_available, delivery_available, seller_lat, seller_lon, request_lat, request_lon } = req.body;

        // Check request status
        const targetReq = await db.getAsync('SELECT status FROM requests WHERE id = ?', [request_id]);
        if (!targetReq || targetReq.status !== 'open') {
            return res.status(400).json({ error: 'Request is already closed or does not exist' });
        }

        // Check if offer already placed
        const existingOffer = await db.getAsync('SELECT id FROM offers WHERE request_id = ? AND seller_id = ?', [request_id, req.user.id]);
        if (existingOffer) {
            return res.status(400).json({ error: 'You have already submitted an offer for this request' });
        }

        // Calculate distance
        const distance_km = getDistance(seller_lat, seller_lon, request_lat, request_lon);
        const offerId = uuidv4();

        await db.runAsync(`
      INSERT INTO offers (id, request_id, seller_id, price, cod_available, delivery_available, distance_km)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [offerId, request_id, req.user.id, price, cod_available, delivery_available, distance_km]);

        res.status(201).json({ id: offerId, distance_km });
    } catch (error) {
        console.error('Submit offer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get offers for a specific request
router.get('/request/:requestId', verifyAuth, async (req, res) => {
    try {
        const offers = await db.allAsync(`
      SELECT o.*, u.name as seller_name, u.email as seller_email
      FROM offers o
      JOIN users u ON o.seller_id = u.id
      WHERE o.request_id = ?
      ORDER BY o.distance_km ASC, o.price ASC
    `, [req.params.requestId]);

        res.status(200).json(offers);
    } catch (error) {
        console.error('Fetch offers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Accept an offer
router.post('/:offerId/accept', verifyAuth, async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({ error: 'Only customers can accept offers' });
        }

        // Get the offer
        const offer = await db.getAsync('SELECT request_id FROM offers WHERE id = ?', [req.params.offerId]);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        // Verify ownership of the request
        const request = await db.getAsync('SELECT customer_id FROM requests WHERE id = ?', [offer.request_id]);
        if (request.customer_id !== req.user.id) {
            return res.status(403).json({ error: 'You do not own this request' });
        }

        // Mark request as closed
        await db.runAsync('UPDATE requests SET status = ? WHERE id = ?', ['closed', offer.request_id]);

        res.status(200).json({ message: 'Offer accepted, request closed.' });
    } catch (error) {
        console.error('Accept offer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
