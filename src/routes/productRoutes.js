// Express router for product endpoints
const express = require('express');
const ProductController = require('../controllers/ProductController');
const router = express.Router();

router.post('/', ProductController.createProduct);
router.get('/:id', ProductController.getProduct);
router.get('/', ProductController.getProducts);
router.put('/:id', ProductController.updateProduct);
router.delete('/:id', ProductController.deleteProduct);

module.exports = router;
