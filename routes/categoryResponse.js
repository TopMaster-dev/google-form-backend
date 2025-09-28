const express = require("express");
const path = require("path");
const fs = require("fs");
const { Form } = require("../models");

const router = express.Router();

router.get("/", async (req, res) => {    
    try {
        // Get all forms and select only id, title, category_id
        const forms = await Form.findAll({
            attributes: ['id', 'title', 'category_id']
        });        

        return res.status(200).json(forms);
    } catch (err) {
        console.error("Form fetch error:", err);
        return res.status(500).json({
            error: "Failed to fetch forms",
            details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
});

module.exports = router;