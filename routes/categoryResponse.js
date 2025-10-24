const express = require("express");
const { Form, Question } = require("../models");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // Get all forms and select only id, title, category_id
    const forms = await Form.findAll({
      attributes: ["id", "title", "category_id"],
    });

    return res.status(200).json(forms);
  } catch (err) {
    console.error("Form fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch forms",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.get("/:formId", async (req, res) => {
  try {
    const { formId } = req.params;

    // Find the form by id and select only id, title, category_id
    const form = await Form.findOne({
      where: { id: formId },
      attributes: ["id", "title", "category_id"],
    });

    if (!form) {
      return res.status(404).json({ message: "フォームが見つかりません" });
    }

    return res.status(200).json({
      id: form.id,
      title: form.title,
      category_id: form.category_id,
    });
  } catch (err) {
    console.error("Form fetch error:", err);
    return res.status(500).json({
      error: "Failed to fetch form",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Utility function to safely parse JSON, returns null if parsing fails or value is falsy

// helper function
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

router.post("/general", async (req, res) => {
  try {
    const forms = await Form.findAll({
      where: { category_id: null },
      attributes: ["id", "title", "description"],
      include: [{ model: Question, as: "Questions" }],
    });

    if (!forms || forms.length === 0) {
      return res.status(404).json({ message: "一般フォームが見つかりません" });
    }

    const formsWithQuestions = forms.map((form) => ({
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
    }));

    return res.json(formsWithQuestions);
  } catch (err) {
    console.error("Error fetching general forms with questions:", err);
    return res
      .status(500)
      .json({ message: "サーバー内部でエラーが発生しました" });
  }
});

module.exports = router;
