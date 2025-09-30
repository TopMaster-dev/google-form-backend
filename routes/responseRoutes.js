const express = require("express");
const auth = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Response, Form, Question, Answer, User } = require("../models");

const router = express.Router();

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

        console.log("=== Backend Debug Info ===");
        console.log("req.body:", req.body);
        console.log("req.files:", req.files);
        console.log("Raw answers:", answers);
        console.log("============================");

        const parsedAnswers = JSON.parse(answers || '[]');
        const ipAddress = req.ip || req.connection.remoteAddress;

        console.log("Parsed answers: ", parsedAnswers);

        // Get form details
        const form = await Form.findByPk(formId);
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
            user_id: req.user?.id || null,
            respondent_email: email || null,
            ip_address: ipAddress
        });

        // Process uploaded files
        const uploadedFiles = req.files || [];
        const processedAnswers = [];

        console.log("Processing answers:", parsedAnswers.length);

        for (const answer of parsedAnswers) {
            try {
                const question = await Question.findByPk(answer.fieldUid);
                if (!question) {
                    console.error(`Question not found: ${answer.fieldUid}`);
                    continue;
                }

                console.log(`Processing answer for question ${answer.fieldUid}, type: ${answer.type}`);

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

                    console.log(`Found ${questionFiles.length} image files for question ${answer.fieldUid}`);

                    if (questionFiles.length > 0) {
                        const fileUrls = questionFiles.map(f => `/uploads/${f.filename}`);
                        const filePaths = questionFiles.map(f => f.path);

                        answerData.image_urls = JSON.stringify(fileUrls);
                        answerData.image_paths = JSON.stringify(filePaths);
                    }

                    // save selections too
                    answerData.image_responses = JSON.stringify(answer.checkboxSelections || []);
                    answerData.selected_choices = JSON.stringify(answer.multipleChoiceSelection || null);

                } else if (answer.type === "file_upload") {
                    const questionFiles = uploadedFiles.filter(file =>
                        file.fieldname.startsWith(`file_${answer.fieldUid}_`)
                    );

                    console.log(`Found ${questionFiles.length} regular files for question ${answer.fieldUid}`);

                    if (questionFiles.length > 0) {
                        const fileUrls = questionFiles.map(f => `/uploads/${f.filename}`);
                        const filePaths = questionFiles.map(f => f.path);

                        answerData.file_paths = JSON.stringify(filePaths);
                        answerData.answer_text = JSON.stringify(fileUrls);
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
                console.log(`Successfully saved answer for question ${answer.fieldUid}`);
            } catch (error) {
                console.error(`Error processing answer for question ${answer.fieldUid}:`, error);
            }
        }

        console.log("Answers processed: ", processedAnswers);
        console.log(`Total answers processed: ${processedAnswers.length}`);

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

// // Get Responses for a Form
// router.get("/:formId/responses", auth, async (req, res) => {
//     try {
//         const { formId } = req.params;

//         // Check if user has permission to view responses
//         const form = await Form.findByPk(formId);
//         if (!form) {
//             return res.status(404).json({ message: "Form not found" });
//         }

//         if (req.user.id !== form.created_by && req.user.role !== "admin") {
//             return res.status(403).json({ message: "Forbidden" });
//         }

//         // Get responses with user information
//         const responses = await Response.findAll({
//             where: { form_id: formId },
//             include: [
//                 {
//                     model: Form,
//                     attributes: ['title', 'description']
//                 },
//                 {
//                     model: Answer,
//                     include: [{
//                         model: Question,
//                         attributes: ['question_text', 'question_type', 'options']
//                     }]
//                 },
//                 {
//                     model: User,
//                     attributes: ['id', 'name', 'email'],
//                     required: false // Left join to include anonymous responses
//                 }
//             ],
//             order: [['submitted_at', 'DESC']]
//         });

//         // Format response data
//         const formattedResponses = responses.map(response => ({
//             id: response.id,
//             submittedAt: response.submitted_at,
//             respondent: response.User ? {
//                 name: response.User.name,
//                 email: response.User.email
//             } : {
//                 name: 'Anonymous',
//                 email: response.respondent_email || 'N/A'
//             },
//             answers: response.Answers.map(answer => {
//                 let parsedValue = null;
//                 try {
//                     parsedValue = JSON.parse(answer.value || '{}');
//                 } catch (e) {
//                     parsedValue = { text: answer.value };
//                 }

//                 return {
//                     question: answer.Question.question_text,
//                     type: answer.Question.question_type,
//                     answer: answer.value,
//                     parsedAnswer: parsedValue,
//                     fileUrls: parsedValue.fileUrls || null,
//                     files: parsedValue.files || null,
//                     checkboxSelections: parsedValue.checkboxSelections || null,
//                     multipleChoiceSelection: parsedValue.multipleChoiceSelection || null
//                 };
//             })
//         }));

//         return res.json(formattedResponses);
//     } catch (err) {
//         console.error('Error fetching responses:', err);
//         return res.status(500).json({ error: err.message });
//     }
// });

router.get("/:formId/responses", auth, async (req, res) => {
    try {
        const { formId } = req.params;

        // Check permission
        const form = await Form.findByPk(formId);
        if (!form) return res.status(404).json({ message: "フォームが見つかりませんでした" });
        if (req.user.id !== form.created_by && req.user.role !== "admin") {
            return res.status(403).json({ message: "許可されていません" });
        }

        // Fetch responses with answers
        const responses = await Response.findAll({
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
                }
            ],
            order: [['submitted_at', 'DESC']]
        });

        const formattedResponses = responses.map(r => ({
            id: r.id,
            submittedAt: r.submitted_at,
            respondent: r.User
                ? { name: r.User.name, email: r.User.email }
                : { name: 'Anonymous', email: r.respondent_email || 'N/A' },
            answers: r.Answers.map(a => {
                // Map each type of answer correctly
                return {
                    question: a.Question?.question_text,
                    type: a.Question?.question_type,
                    answerText: a.answer_text || null,
                    imageUrls: a.image_urls ? JSON.parse(a.image_urls) : null,
                    files: a.file_paths ? JSON.parse(a.file_paths) : null,
                    checkboxSelections: a.selected_options ? JSON.parse(a.selected_options) : null,
                    multipleChoiceSelection: a.selected_choices ? JSON.parse(a.selected_choices) : null,
                    imageResponses: a.image_responses ? JSON.parse(a.image_responses) : null
                };
            })
        }));

        return res.json(formattedResponses);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: err.message });
    }
});

// Export responses as CSV
router.get("/:formId/csv", auth, async (req, res) => {
    try {
        const { formId } = req.params;

        // Check permissions
        const form = await Form.findByPk(formId);
        if (!form) {
            return res.status(404).json({ message: "フォームが見つかりませんでした" });
        }

        if (req.user.id !== form.created_by && req.user.role !== "admin") {
            return res.status(403).json({ message: "許可されていません" });
        }

        // Get all responses
        const responses = await Response.findAll({
            where: { form_id: formId },
            include: [
                { model: User, attributes: ['name', 'email'], required: false },
                {
                    model: Answer,
                    include: [{
                        model: Question,
                        attributes: ['question_text', 'question_type']
                    }]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        // Get all questions for headers
        const questions = await Question.findAll({
            where: { form_id: formId },
            order: [['id', 'ASC']]
        });

        // Create CSV headers
        const headers = ['Submission ID', 'Submitted At', 'Respondent Name', 'Respondent Email']
            .concat(questions.map(q => q.question_text));

        // Create CSV rows
        const rows = responses.map(response => {
            const baseData = {
                id: response.id,
                submittedAt: response.submitted_at,
                respondentName: response.User ? response.User.name : 'Anonymous',
                respondentEmail: response.User ? response.User.email : (response.respondent_email || 'N/A')
            };

            // Add answers in the correct order
            const answerMap = {};
            response.Answers.forEach(answer => {
                let displayValue = '';

                try {
                    const parsedValue = JSON.parse(answer.value || '{}');

                    if (parsedValue.fileUrls && parsedValue.fileUrls.length > 0) {
                        displayValue = parsedValue.fileUrls.join(', ');
                    } else if (Array.isArray(parsedValue)) {
                        displayValue = parsedValue.join(', ');
                    } else if (parsedValue.text) {
                        displayValue = parsedValue.text;
                    } else {
                        displayValue = answer.value || '';
                    }
                } catch (e) {
                    displayValue = answer.value || '';
                }

                answerMap[answer.question_id] = displayValue || 'No response';
            });

            // Add answers in the same order as questions
            const answers = questions.map(q => answerMap[q.id] || 'No response');

            return [
                baseData.id,
                baseData.submittedAt,
                baseData.respondentName,
                baseData.respondentEmail,
                ...answers
            ];
        });

        // Generate CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell =>
                cell ? `"${String(cell).replace(/"/g, '""')}"` : '""'
            ).join(','))
        ].join('\n');

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=form_responses_${formId}.csv`);

        return res.send(csvContent);
    } catch (err) {
        console.error('Error generating CSV:', err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
