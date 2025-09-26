const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Response = sequelize.define("Response", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    form_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: true }, // Make user_id optional
    submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    respondent_email: { type: DataTypes.STRING, allowNull: true },
    ip_address: { type: DataTypes.STRING, allowNull: true },
}, {
    tableName: "responses",
    timestamps: false,
});

module.exports = Response;
