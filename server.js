const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const StudentRouter = require("./routes/studentRouter");
const TeacherRouter = require("./routes/teacherRouter");
const InstituteRouter = require("./routes/instituteRouter");
const discountRouter = require("./routes/discountRouter");
const employeeRoutes = require("./routes/employeeRouter");
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());
// Serve static files from the "storage" directory
app.use("/storage", express.static(path.join(__dirname, "storage")));

// ... your other routes

app.use("/api/student", StudentRouter);
app.use("/api/teacher", TeacherRouter);
app.use("/api/institute", InstituteRouter);
app.use("/api/discount", discountRouter);
app.use("/api/employee", employeeRoutes);

app.get("/", (req, res) => {
  res.send("Server Started");
});

// Make sure to include this route to handle other routes
app.get("*", (req, res) => {
  res.status(404).send("Not Found");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(port, () => {
      console.log(
        `Database Connected Successfully and server is listening on this port ${process.env.PORT}`
      );
    });
  })
  .catch((err) => {
    console.log(err);
  });
