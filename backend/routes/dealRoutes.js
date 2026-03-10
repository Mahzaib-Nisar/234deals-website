const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const controller = require('../controllers/dealController');
const qController = require('../controllers/dealsQueryController');

// Public listing and query features
router.get('/', qController.list);
router.get('/trending', qController.trending);
router.get('/ending-soon', qController.endingSoon);
router.get('/new', qController.newest);
router.get('/:id', qController.getById);

// Auth-required mutations (basic controller)
router.post('/', auth, controller.createDeal);
router.put('/:id', auth, controller.updateDeal);
router.delete('/:id', auth, controller.deleteDeal);

module.exports = router;
