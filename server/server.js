import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import hackrxRoutes from "./routes/hackrx.js"; // add `.js` extension for ES module

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/v1", hackrxRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
