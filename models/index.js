const sequelize = require("../config/db");
const User = require("./User");
const Form = require("./Form");
const Question = require("./Question");
const Response = require("./Response");
const Answer = require("./Answer");

// Associations
// User ↔ Form
User.hasMany(Form, { foreignKey: "created_by", onDelete: "CASCADE" });
Form.belongsTo(User, { foreignKey: "created_by" });

// Form ↔ Question
Form.hasMany(Question, { foreignKey: "form_id", onDelete: "CASCADE" });
Question.belongsTo(Form, { foreignKey: "form_id" });

// Form ↔ Response
Form.hasMany(Response, { foreignKey: "form_id", onDelete: "CASCADE" });
Response.belongsTo(Form, { foreignKey: "form_id" });

// User ↔ Response
User.hasMany(Response, { foreignKey: "user_id", onDelete: "CASCADE" });
Response.belongsTo(User, { foreignKey: "user_id" });

// Response ↔ Answer
Response.hasMany(Answer, { foreignKey: "response_id", onDelete: "CASCADE" });
Answer.belongsTo(Response, { foreignKey: "response_id" });

// Question ↔ Answer
Question.hasMany(Answer, { foreignKey: "question_id", onDelete: "CASCADE" });
Answer.belongsTo(Question, { foreignKey: "question_id" });

module.exports = { sequelize, User, Form, Question, Response, Answer };
