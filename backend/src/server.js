const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const DatabaseModel = require("./models/database.model");
const installRoutes = require("./routes/install.routes");
require("dotenv").config();

const app = express();

if (process.env.TRUST_PROXY) {
  const trustProxy = /^\d+$/.test(process.env.TRUST_PROXY)
    ? Number(process.env.TRUST_PROXY)
    : process.env.TRUST_PROXY;
  app.set("trust proxy", trustProxy);
}

app.use(helmet());

app.use(
  cors({
    origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    status: false,
    message: "Too many requests, please try again later.",
  },
});

app.use("/api", apiLimiter);

app.get("/", (req, res) => {
  res.json({
    status: true,
    message: "MHD Belize API running successfully",
  });
});

app.use("/install", installRoutes);

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/roles", require("./routes/role.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/departments", require("./routes/department.routes"));
app.use("/api/audit-logs", require("./routes/audit-log.routes"));
app.use("/api/public", require("./routes/public.routes"));
app.use("/api/complaints", require("./routes/complaint.routes"));



const PORT = process.env.PORT || 5000;

app.get("/db-test", async (req, res) => {
  try {
    const rows = await DatabaseModel.testConnection();

    res.json({
      status: true,
      message: "Database connected successfully",
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
