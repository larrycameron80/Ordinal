import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import cors from 'cors';
import transactionRoutes from './routes/transactionRoutes';
import dotenv from 'dotenv';
import path = require('path');
import mempoolRoutes from './routes/mempoolRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.static(path.join(__dirname, "./public")));
// Parse incoming JSON requests using body-parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use('/api', transactionRoutes);
app.use('/api/mempool', mempoolRoutes)

// Debug log for MongoDB URI
console.log("MongoDB URI:", process.env.MONGODB_URI);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI as string)
    .then(() => {
        console.log("MongoDB connected");
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(err => console.error("MongoDB connection error:", err));


    