const express = require("express");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadFile, getFiles, createFile } = require("../googleDrive");
const { Response, Form, Question, Answer, User } = require("../models");

const router = express.Router();
const categoryList = [
    'オープニングムービー',
    'プロフィールムービ',
    'エンドロール・レタームービーその他'
]
// Configure multer for permanent file storage
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept images and other files
    if (file.mimetype.startsWith('image/') ||
        file.mimetype.startsWith('application/') ||
        file.mimetype.startsWith('text/') ||
        file.mimetype.startsWith('video/') ||
        file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Submit Response (User or Anonymous) - Local Storage Only
router.post("/:formId/responses", upload.any(), async (req, res) => {
    try {
        const { formId } = req.params;
        const { answers, email } = req.body;
        const { userId, userEmail } = req.body;        

        const parsedAnswers = JSON.parse(answers || '[]');
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Get form details
        const form = await Form.findByPk(formId);
        const user_info = await User.findByPk(userId);
        
        if (!form) {
            return res.status(404).json({ message: "フォームが見つかりません" });
        }

        // Check for multiple submissions if not allowed
        if (!form.allow_multiple_responses) {
            if (form.require_email) {
                if (!email) {
                    return res.status(400).json({
                        message: "このフォームにはメールアドレスが必要です"
                    });
                }

                const existingResponseByEmail = await Response.findOne({
                    where: {
                        form_id: formId,
                        respondent_email: email
                    }
                });

                if (existingResponseByEmail) {
                    return res.status(403).json({
                        message: "このフォームはすでに送信されています"
                    });
                }
            }

            const existingResponseByIP = await Response.findOne({
                where: {
                    form_id: formId,
                    ip_address: ipAddress
                }
            });

            if (existingResponseByIP) {
                return res.status(403).json({
                    message: "このフォームでは複数回の送信はできません"
                });
            }
        }

        // Create response entry
        const response = await Response.create({
            form_id: formId,
            user_id: userId || null,
            respondent_email: userEmail || null,
            ip_address: ipAddress
        });

        // Process uploaded files
        const uploadedFiles = req.files || [];
        const processedAnswers = [];

        for (const answer of parsedAnswers) {
            try {
                const question = await Question.findByPk(answer.fieldUid);
                if (!question) {
                    console.error(`Question not found: ${answer.fieldUid}`);
                    continue;
                }

                let answerData = {
                    response_id: response.id,
                    question_id: answer.fieldUid,
                    answer_text: null,
                    image_paths: null,
                    image_responses: null,
                    file_paths: null,
                    selected_options: null,
                    selected_choices: null,
                    image_urls: null
                };

                if (answer.type === "image_upload") {
                    const questionFiles = uploadedFiles.filter(file =>
                        file.fieldname.startsWith(`image_${answer.fieldUid}_`)
                    );                   

                    if (questionFiles.length > 0) {
                        const localUrls = questionFiles.map(f => `/uploads/${f.filename}`);
                        const localPaths = questionFiles.map(f => f.path);
                        answerData.image_urls = JSON.stringify(localUrls);
                        answerData.image_paths = JSON.stringify(localPaths);
                    }

                    // save selections too
                    answerData.image_responses = JSON.stringify(answer.checkboxSelections || []);
                    answerData.selected_choices = JSON.stringify(answer.multipleChoiceSelection || null);

                } else if (answer.type === "file_upload") {
                    const questionFiles = uploadedFiles.filter(file =>
                        file.fieldname.startsWith(`file_${answer.fieldUid}_`)
                    );

                    if (questionFiles.length > 0) {
                        const localUrls = questionFiles.map(f => `/uploads/${f.filename}`);                        
                        const filePaths = questionFiles.map(f => f.path);
                        answerData.file_paths = JSON.stringify(filePaths);
                        answerData.answer_text = JSON.stringify(localUrls);
                    }

                } else if (Array.isArray(answer.text)) {
                    // Checkboxes
                    answerData.selected_options = JSON.stringify(answer.text);

                } else {
                    // All other answer types (short text, paragraph, dropdown, etc.)
                    answerData.answer_text = answer.text || "";
                }

                const savedAnswer = await Answer.create(answerData);                
                processedAnswers.push(savedAnswer);
            } catch (error) {
                console.error(`Error processing answer for question ${answer.fieldUid}:`, error);
            }
        }

        return res.status(201).json({
            message: "回答が正常に送信されました",
            response: {
                id: response.id,
                formId: formId,
                submittedAt: response.submitted_at
            },
            answersProcessed: processedAnswers.length
        });
    } catch (err) {
        console.error("Form submission error:", err);
        return res.status(500).json({
            error: "Failed to submit form response",
            details: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
});


// Serve uploaded files statically
router.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


router.get("/:formId/responses", auth, async (req, res) => {
    try {
        const { formId } = req.params;
        let responses;

        if (formId === "0" || formId === 0) {
            // Get all responses (admin/global view)
            responses = await Response.findAll({
                include: [
                    {
                        model: Answer,
                        include: [
                            {
                                model: Question,
                                attributes: ['question_text', 'question_type', 'options']
                            }
                        ]
                    },
                    {
                        model: User,
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: Form,
                        attributes: ['id', 'title', 'description'],
                        required: false
                    },
                ],
                order: [['submitted_at', 'DESC']]
            });
        } else {
            const form = formId ? await Form.findByPk(formId) : null;
            if (!form) return res.status(404).json({ message: "フォームが見つかりませんでした" });
            if (req.user.id !== form.created_by && req.user.role !== "admin") {
                return res.status(403).json({ message: "許可されていません" });
            }

            responses = await Response.findAll({
                where: { form_id: formId },
                include: [
                    {
                        model: Answer,
                        include: [
                            {
                                model: Question,
                                attributes: ['question_text', 'question_type', 'options']
                            }
                        ]
                    },
                    {
                        model: User,
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: Form,
                        attributes: ['id', 'title', 'description'],
                        required: false
                    },
                ],
                order: [['submitted_at', 'DESC']]
            });
        }

        const formattedResponses = responses.map(r => ({
            id: r.id,
            submittedAt: r.submitted_at,
            respondent: r.User
                ? { name: r.User.name, email: r.User.email }
                : { name: 'Anonymous', email: r.respondent_email || 'N/A' },
            answers: (r.Answers || []).map(a => ({
                question: a.Question?.question_text,
                type: a.Question?.question_type,
                answerText: a.answer_text || null,
                imageUrls: a.image_urls ? JSON.parse(a.image_urls) : null,
                files: a.file_paths ? JSON.parse(a.file_paths) : null,
                checkboxSelections: a.selected_options ? JSON.parse(a.selected_options) : null,
                multipleChoiceSelection: a.selected_choices ? JSON.parse(a.selected_choices) : null,
                imageResponses: a.image_responses ? JSON.parse(a.image_responses) : null
            })),
            form: r.Form
                ?{ title: r.Form.title, description: r.Form.description }
                :{ title: '無題のフォーム', email: 'フォームの説明' }
        }));      

        return res.json(formattedResponses);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
});

// Export responses as CSV
// router.get("/csv", async (req, res) => {
//     try {
        
//     } catch (err) {

//     }
// });

module.exports = router;