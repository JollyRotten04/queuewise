import "dotenv/config";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../db.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// Register route
router.post("/register", async (req, res) => {
    try {
        const { firstName, lastName, email, username, password, confirmPassword } = req.body;

        if (!firstName || !lastName || !email || !username || !password || !confirmPassword) {
            return res.status(400).json({ error: "All fields are required" });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, email, username, password_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, first_name, last_name, email, username`,
            [
                firstName.trim(),
                lastName.trim(),
                email.trim().toLowerCase(),
                username.trim(),
                hashedPassword,
            ]
        );

        const newUser = result.rows[0];
        const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: "1h" });

        res.status(201).json({ message: "User registered successfully", token, user: newUser });
    } catch (error) {
        // 23505 = unique violation (email or username already taken)
        if (error.code === "23505") {
            return res.status(400).json({ error: "Email or username already exists" });
        }
        console.error("Error during user registration:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Login route
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const result = await pool.query(
            `SELECT id, first_name, last_name, email, username, password_hash
             FROM users
             WHERE email = $1`,
            [email.trim().toLowerCase()]
        );
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(400).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "1h" });

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                username: user.username,
            },
        });
    } catch (error) {
        console.error("Error during user login:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;