const express = require('express');
const router  = express.Router();
const { getDue, update } = require('../controllers/revisionController');

router.get('/due',    getDue);
router.post('/update', update);

module.exports = router;
