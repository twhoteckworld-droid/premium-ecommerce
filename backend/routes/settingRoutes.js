const express = require('express');
const router = express.Router();
const { publicGet } = require('../controllers/adminSettingController');

router.get('/', publicGet);

module.exports = router;
