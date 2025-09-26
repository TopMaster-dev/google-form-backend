const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Form = sequelize.define("Form", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    created_by: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    allow_multiple_responses: { type: DataTypes.BOOLEAN, defaultValue: true },
    require_email: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
    tableName: "forms",
    timestamps: false,  // since we already have created_at in SQL
});

module.exports = Form;
