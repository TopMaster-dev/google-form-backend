const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Question = sequelize.define("Question", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    form_id: { type: DataTypes.INTEGER, allowNull: false },
    question_text: { type: DataTypes.TEXT, allowNull: false },

    question_type: {
        type: DataTypes.ENUM(
            "short_answer",
            "paragraph",
            "multiple_choice",
            "checkboxes",
            "dropdown",
            "date",
            "time",
            "file_upload",
            "image",
            "image_upload",
            "section"
        ),
        allowNull: false
    },


    options: { type: DataTypes.JSON, allowNull: true },
    required: { type: DataTypes.BOOLEAN, defaultValue: true },
    image_only: { type: DataTypes.BOOLEAN, defaultValue: false },
    placeholder: { type: DataTypes.STRING, allowNull: true },
    text_number: { type: DataTypes.INTEGER, allowNull: true },
    max_images: { type: DataTypes.INTEGER, defaultValue: 1, allowNull: false },

    enable_checkboxes: { type: DataTypes.BOOLEAN, defaultValue: false },
    enable_multiple_choice: { type: DataTypes.BOOLEAN, defaultValue: false },

    multiple_choice_label: { type: DataTypes.STRING, allowNull: true },
    multiple_choice_options: { type: DataTypes.JSON, allowNull: true },

    image_url: { type: DataTypes.STRING },
    content: { type: DataTypes.TEXT, allowNull: true },

    checkbox_options: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: true
    },

    choice_question: { type: DataTypes.STRING, allowNull: true },
    choice_options: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: true
    },

    admin_images: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: true
    },

    enable_admin_images: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: true
    },

    annotations: {
        type: DataTypes.JSON,
        defaultValue: [],
        allowNull: true
    },

    image_options: {
        type: DataTypes.JSON,
        defaultValue: { checkboxes: [], multiple_choice: [] },
        allowNull: true
    },
}, {
    tableName: "questions",
    timestamps: false,
});

module.exports = Question;
