const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Answer = sequelize.define("Answer", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    response_id: { type: DataTypes.INTEGER, allowNull: false },
    question_id: { type: DataTypes.INTEGER, allowNull: false },
    answer_text: { type: DataTypes.TEXT },

    // Use TEXT instead of JSON for MariaDB compatibility
    image_paths: { type: DataTypes.TEXT, allowNull: true },
    file_paths: { type: DataTypes.TEXT, allowNull: true },
    selected_options: { type: DataTypes.TEXT, allowNull: true },
    selected_choices: { type: DataTypes.TEXT, allowNull: true },
    image_urls: { type: DataTypes.TEXT, allowNull: true },

    // image_responses duplicated → keep only once
    image_responses: { type: DataTypes.TEXT, allowNull: true }

}, {
    tableName: "answers",
    timestamps: false,
    hooks: {
        beforeSave: (answer) => {
            // stringify JSON fields before saving
            ["image_paths", "file_paths", "selected_options", "selected_choices", "image_urls", "image_responses"]
                .forEach(field => {
                    if (answer[field] && typeof answer[field] !== "string") {
                        answer[field] = JSON.stringify(answer[field]);
                    }
                });
        },
        afterFind: (result) => {
            const parseJSON = (val) => {
                if (!val) return null;
                try { return JSON.parse(val); } catch { return val; }
            };
            if (Array.isArray(result)) {
                result.forEach(r => {
                    ["image_paths", "file_paths", "selected_options", "selected_choices", "image_urls", "image_responses"]
                        .forEach(field => r[field] = parseJSON(r[field]));
                });
            } else if (result) {
                ["image_paths", "file_paths", "selected_options", "selected_choices", "image_urls", "image_responses"]
                    .forEach(field => result[field] = parseJSON(result[field]));
            }
        }
    }
});

module.exports = Answer;
