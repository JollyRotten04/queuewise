import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// Temporary in-mmeory storage, replace later
const users = [];
const JWT_SECRET = "your_jwt_secret_key";

// Register route
router.post("/register", async (req, res) => {
    try{

        const { email, username, password, confirmPassword } = req.body;

        if(!email || !username || !password || !confirmPassword){
            return res.status(400).json({ error: "All fields are required" });
        }

        const userExists = users.find(user => user.username === username);
        if(userExists){
            return res.status(400).json({ error: "Username already exists" });
        }

        const emailExists = users.find(user => user.email === email);
        if(emailExists){
            return res.status(400).json({ error: "Email already exists" });
        }

        const passwordMatch = password === confirmPassword;
        if(!passwordMatch){
            return res.status(400).json({ error: "Passwords do not match" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            email,
            username,
            password: hashedPassword
        };

        users.push(newUser);
        const token = jwt.sign({ username: newUser.username }, JWT_SECRET, { expiresIn: "1h" });
        res.status(201).json({ message: "User registered successfully", token });
    }

    catch(error){
        console.error("Error during user registration:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Login route
router.post("/login", async (req, res) => {
    try{

        const { username, password } = req.body;
    
        if(!username || !password){
            return res.status(400).json({ error: "Username and password are required" });
        }

        const user = users.find(user => user.username === username);
        if(!user){
            return res.status(400).json({ error: "Invalid username or password" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if(!passwordMatch){
            return res.status(400).json({ error: "Invalid username or password" });
        }

        const token = jwt.sign({ username: user.username}, JWT_SECRET, {expiresIn: "1h"});

        res.json({ message: "Login successful", token, user: { email: user.email, username: user.username }});
    }

    catch(error){
        console.error("Error during user login:", error);
        res.status(500).json({ error: "Internal server error"});
    }
});

export default router;