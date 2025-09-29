const express = require("express");
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

router.get("/:formId", async (req, res) => {    
    try {
        const { formId } = req.params;

        // Find the form by id and select only id, title, category_id
        const form = await Form.findOne({
            where: { id: formId },
            attributes: ['id', 'title', 'category_id']
        });        

        if (!form) {
            return res.status(404).json({ message: "Form not found" });
        }

        return res.status(200).json({
            id: form.id,
            title: form.title,
            category_id: form.category_id
        });
    } catch (err) {
        console.error("Form fetch error:", err);
        return res.status(500).json({
            error: "Failed to fetch form",
            details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
});

router.post("/general", async (req, res) => {    
    try {
        // Find all forms where category_id is null
        const forms = await Form.findAll({
            where: { category_id: null },
            attributes: ['id', 'title', 'description']
        });

        if (!forms || forms.length === 0) {
            return res.status(404).json({ message: "No general forms found" });
        }

        // Return array of forms with id, title, description
        return res.json(forms);
    } catch (err) {
        console.error("Error fetching general forms:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;