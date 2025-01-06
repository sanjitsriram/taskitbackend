// Import required modules
const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Create an Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON
app.use(bodyParser.json());

// PostgreSQL configuration
const pool = new Pool({
  connectionString: process.env.PG_URL,
});

// Create table if not exists
const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log("Table created or already exists.");
  } catch (err) {
    console.error("Error creating table:", err);
  }
};

createTable();

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // Or another email service provider
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Route to handle form submission
app.post("/api/contact", async (req, res) => {
  const { name, email, description } = req.body;

  // Validate input
  if (!name || !email || !description) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    // Insert data into the database
    const query = "INSERT INTO submissions (name, email, description) VALUES ($1, $2, $3) RETURNING *";
    const values = [name, email, description];
    const result = await pool.query(query, values);

    // Send an email
    const mailOptions = {
      from: process.env.EMAIL,
      to: process.env.EMAIL, // Send to your email
      subject: "New Submission Received",
      text: `You have received a new submission:\n\nName: ${name}\nEmail: ${email}\nDescription: ${description}`,
    };

    await transporter.sendMail(mailOptions);

    // Respond with success
    res.status(200).json({ message: "Submission received and email sent.", data: result.rows[0] });
  } catch (err) {
    console.error("Error handling submission:", err);
    res.status(500).json({ error: "An error occurred." });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
