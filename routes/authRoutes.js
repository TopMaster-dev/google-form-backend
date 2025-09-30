const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");
require("dotenv").config();

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "必須項目が不足しています",
                details: {
                    name: !name ? "名前は必須です" : null,
                    email: !email ? "メールアドレスは必須です" : null,
                    password: !password ? "パスワードは必須です" : null
                }
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "メールアドレスの形式が正しくありません" });
        }

        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(400).json({ message: "既に登録されているユーザーです" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || "user",
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({ message: "ユーザー登録が完了しました", user, token });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: "ユーザーが見つかりません" });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "メールアドレスまたはパスワードが正しくありません" });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({ token, user });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
