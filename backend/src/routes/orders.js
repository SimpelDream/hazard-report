const express = require('express');
const router = express.Router();

// 获取所有订单（示例）
router.get('/', async (req, res) => {
    res.json({ success: true, data: [] });
});

module.exports = router; 