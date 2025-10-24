const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/authMiddleware");
const { Form, Question } = require("../models");
const { getFiles, createFile, deleteFile, renameFile } = require('../googleDrive');

const router = express.Router();
const categoryList = [
    'オープニングムービー',
    'プロフィールムービ',
    'エンドロール・レタームービーその他'
]

// Helper to parse JSON fields safely
const parseJSON = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    try {
        let parsed = JSON.parse(value);

        // If parsing again gives an array, do it
        if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
        }

        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.warn("parseJSON failed:", value, err.message);
        return [];
    }
};

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'public/uploads/';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Upload single image
router.post("/image", upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Return the relative file path (accessible via static serving)
        const filePath = `/uploads/${req.file.filename}`;

        res.json({
            success: true,
            filePath: filePath,
            fileName: req.file.filename
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Upload multiple images
router.post("/images", upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const filePaths = req.files.map(file => ({
            filePath: `/uploads/${file.filename}`,
            fileName: file.filename
        }));

        res.json({
            success: true,
            files: filePaths
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Delete image
router.delete("/image", async (req, res) => {
    try {
        const { fileName } = req.body;
        if (!fileName) {
            return res.status(400).json({ error: 'Filename is required' });
        }

        const filePath = path.join('public/uploads', fileName);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'ファイルが正常に削除されました' });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Delete failed' });
    }
});

// Create Form
router.post("/", auth, async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "許可されていません" });

        const { title, description, fields, category_id } = req.body;

        const form = await Form.create({
            title,
            description,
            created_by: req.user.id,   // match your schema
            category_id
        });    

        if (fields && fields.length > 0) {
            for (const field of fields) {
                await Question.create({
                    form_id: form.id,
                    question_text: field.label,   // schema mapping
                    question_type: field.type,
                    required: field.required,
                    placeholder: field.placeholder || '',  // Save placeholder
                    text_number: Number(field.text_number) || 0,  // Save placeholder
                    options: field.options ? JSON.stringify(field.options) : null,
                    content: field.content,
                    max_images: field.max_images || 1,
                    checkbox_options: field.checkbox_options ? JSON.stringify(field.checkbox_options) : null,
                    choice_question: field.choice_question,
                    choice_options: field.choice_options ? JSON.stringify(field.choice_options) : null,
                    image_only: field.image_only || false,
                    max_images: field.max_images || 1,
                    enable_checkboxes: field.enable_checkboxes || false,
                    enable_multiple_choice: field.enable_multiple_choice || false,
                    multiple_choice_label: field.multiple_choice_label,
                    multiple_choice_options: field.multiple_choice_options ? JSON.stringify(field.multiple_choice_options) : null,
                    max_images: field.max_images || 1,
                    image_options: field.image_options ? JSON.stringify(field.image_options) : null,
                    admin_images: field.adminImages ? JSON.stringify(field.adminImages) : "[]",
                    enable_admin_images: field.enableAdminImages || false
                });
            }
        }

        const createdForm = await Form.findByPk(form.id, {
            include: Question
        });

        return res.json({
            form: {
                id: createdForm.id,
                title: createdForm.title,
                description: createdForm.description,
                fields: createdForm.Questions.map((q) => ({
                    id: q.id,
                    label: q.question_text,
                    type: q.question_type,
                    required: q.required,
                    placeholder: q.placeholder,
                    text_number: Number(q.text_number) || 0,
                    options: parseJSON(q.options),
                    content: q.content,
                    max_images: q.max_images,
                    checkbox_options: parseJSON(q.checkbox_options),
                    choice_question: q.choice_question,
                    choice_options: parseJSON(q.choice_options),
                    image_only: q.image_only,
                    enable_checkboxes: q.enable_checkboxes,
                    enable_multiple_choice: q.enable_multiple_choice,
                    multiple_choice_label: q.multiple_choice_label,
                    multiple_choice_options: parseJSON(q.multiple_choice_options),
                    image_options: parseJSON(q.image_options),
                    adminImages: parseJSON(q.admin_images),
                    enableAdminImages: q.enable_admin_images || false,
                })),
                category_id: createdForm.category_id
            },
        });
    } catch (err) {
        console.error("Error creating form:", err);
        return res.status(500).json({ error: err.message });
    }
});


// Get public form by ID
router.get("/:formId/public", async (req, res) => {
    try {
        const form = await Form.findByPk(req.params.formId, {
            include: [Question],
            attributes: ['id', 'title', 'description']
        });

        if (!form) {
            return res.status(404).json({ message: "フォームが見つかりません" });
        }

        // Fix: Directly return the response, don't assign to variable
        return res.json({
            id: form.id,
            title: form.title,
            description: form.description,
            fields: form.Questions.map((q) => ({
                uid: q.id,
                label: q.question_text,
                type: q.question_type,
                required: q.required,
                placeholder: q.placeholder || "",
                text_number: Number(q.text_number) || 0,
                options: parseJSON(q.options),
                content: q.content || null,
                max_images: q.max_images || 1,
                checkbox_options: parseJSON(q.checkbox_options),
                choice_question: q.choice_question || "",
                choice_options: parseJSON(q.choice_options),
                adminImages: parseJSON(q.admin_images),
                enableAdminImages: q.enable_admin_images || false,
            })),
        });
    } catch (err) {
        console.error("Error fetching public form:", err);
        return res.status(500).json({ message: "サーバー内部でエラーが発生しました" });
    }
});


// Get All Forms
router.get("/", auth, async (req, res) => {
    try {
        const query = {
            include: [Question],
            order: [['created_at', 'DESC']]
        };

        // Only filter by userId if user is not admin
        if (req.user.role !== 'admin') {
            query.where = { created_by: req.user.id };
        }
        const forms = await Form.findAll(query);

        return res.json({
            forms: forms.map(f => ({
                id: f.id,
                title: f.title,
                description: f.description,
                created_at: f.created_at,
                created_by: f.created_by
            }))
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});


// Get Single Form by ID (debug version)
router.get("/:id", auth, async (req, res) => {
    try {
        const form = await Form.findByPk(req.params.id, { include: Question });
        if (!form) return res.status(404).json({ message: "フォームが見つかりませんでした" });

        return res.json({
            form: {
                id: form.id,
                title: form.title,
                description: form.description,
                category_id: form.category_id,
                fields: form.Questions.map((q) => ({
                    id: q.id,
                    label: q.question_text,
                    type: q.question_type,
                    required: q.required,
                    placeholder: q.placeholder || "",
                    text_number: Number(q.text_number) || 0,
                    options: parseJSON(q.options),
                    content: q.content || "",
                    max_images: q.max_images,
                    checkbox_options: parseJSON(q.checkbox_options),
                    choice_question: q.choice_question || "",
                    choice_options: parseJSON(q.choice_options),
                    image_only: q.image_only || false,
                    enable_checkboxes: q.enable_checkboxes || false,
                    enable_multiple_choice: q.enable_multiple_choice || false,
                    multiple_choice_label: q.multiple_choice_label || "",
                    multiple_choice_options: parseJSON(q.multiple_choice_options),
                    image_options: parseJSON(q.image_options),
                    adminImages: parseJSON(q.admin_images),
                    enableAdminImages: q.enable_admin_images || false,
                    extra: q.extra || null,
                })),
            },
        });
    } catch (err) {
        console.error("Error fetching form:", err);
        return res.status(500).json({ error: err.message });
    }
});


// Update Form
router.put("/:id", auth, async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "許可されていません" });

        const { title, description, fields, category_id } = req.body;
        const form = await Form.findByPk(req.params.id);
        if (!form) return res.status(404).json({ message: "フォームが見つかりませんでした" });
        
        form.title = title || form.title;
        form.category_id = category_id || form.category_id;
        form.description = description || form.description;
        await form.save();

        await Question.destroy({ where: { form_id: form.id } });
        
        if (fields && fields.length > 0) {
            for (const field of fields) {
                await Question.create({
                    form_id: form.id,
                    question_text: field.label,   // schema mapping
                    question_type: field.type,
                    required: field.required,
                    placeholder: field.placeholder || '',  // Save placeholder
                    text_number: Number(field.text_number) || 0,  // Save placeholder
                    options: field.options ? JSON.stringify(field.options) : null,
                    content: field.content,
                    max_images: field.max_images || 1,
                    checkbox_options: field.checkbox_options ? JSON.stringify(field.checkbox_options) : null,
                    choice_question: field.choice_question,
                    choice_options: field.choice_options ? JSON.stringify(field.choice_options) : null,
                    image_only: field.image_only || false,
                    max_images: field.max_images || 1,
                    enable_checkboxes: field.enable_checkboxes || false,
                    enable_multiple_choice: field.enable_multiple_choice || false,
                    multiple_choice_label: field.multiple_choice_label,
                    multiple_choice_options: field.multiple_choice_options ? JSON.stringify(field.multiple_choice_options) : null,
                    max_images: field.max_images || 1,
                    image_options: field.image_options ? JSON.stringify(field.image_options) : null,
                    admin_images: field.adminImages ? JSON.stringify(field.adminImages) : "[]",
                    enable_admin_images: field.enableAdminImages || false
                });
            }
        }

        const updatedForm = await Form.findByPk(form.id, { include: Question });
        return res.json({
            form: {
                id: updatedForm.id,
                title: updatedForm.title,
                description: updatedForm.description,
                category_id: updatedForm.category_id,
                fields: updatedForm.Questions.map((q) => ({
                    id: q.id,
                    label: q.question_text,
                    type: q.question_type,
                    required: q.required,
                    placeholder: q.placeholder,
                    text_number: Number(q.text_number) || 0,
                    options: parseJSON(q.options),
                    content: q.content,
                    max_images: q.max_images,
                    checkbox_options: parseJSON(q.checkbox_options),
                    choice_question: q.choice_question,
                    choice_options: parseJSON(q.choice_options),
                    image_only: q.image_only,
                    enable_checkboxes: q.enable_checkboxes,
                    enable_multiple_choice: q.enable_multiple_choice,
                    multiple_choice_label: q.multiple_choice_label,
                    multiple_choice_options: parseJSON(q.multiple_choice_options),
                    image_options: parseJSON(q.image_options),
                    adminImages: parseJSON(q.admin_images),
                    enableAdminImages: q.enable_admin_images || false,
                    extra: q.extra,
                })),
            },
        });
    } catch (err) {
        console.error("Error updating form:", err);
        return res.status(500).json({ error: err.message });
    }
});

// Delete Form
router.delete("/:id", auth, async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.status(403).json({ message: "許可されていません" });

        const form = await Form.findByPk(req.params.id);
        if (!form) return res.status(404).json({ message: "フォームが見つかりませんでした" });

        await form.destroy();
        return res.json({ message: "フォームが正常に削除されました" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
