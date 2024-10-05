const express = require("express");
const route = express.Router();
// const sendResponse = require("../Helper/Helper");
// const UserModel = require("../models/EmployeeModel");
// const bcrypt = require("bcryptjs");
const EmployeeController = require("../Controller/employeeController");
// const multer = require("multer");
// const cloudinary = require("cloudinary").v2;
var dotenv = require("dotenv");
dotenv.config();
const authMiddleware = require("../Helper/middleware");
// const { uploader } = require("../Helper/fileUploadHelper");

// // Multer storage configuration (memory storage)
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// // Cloudinary configuration
// cloudinary.config({
//   cloud_name: process.env.CLOUDNAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

route.use(authMiddleware);
route.get("/", EmployeeController.getEmployees);
route.get("/:id", EmployeeController.getSingleEmployees);
// route.get("/test", EmployeeController.protected);
// route.get("/", EmployeeController.getUsers);
// route.post("/createDiscount", EmployeeController.createAutomaticDiscount);
// route.post("/signup", EmployeeController.registerUser);
// route.post("/login", EmployeeController.login);
// route.post("/confirmUserRegistration", EmployeeController.confirmRegistration);
route.post("/", EmployeeController.addEmployee);
// //upload any type of asset to Cloudinary Service and get live url of your asset.
// route.post("/upload", upload.single("image"), EmployeeController.uploadImage);
// //upload any type of asset i.e pdf,video,image to owned server
// route.post(
//   "/uploadFile",
//   uploader.array("files"),
//   EmployeeController.fileUploaderController
// );
// route.post("/changePassword", EmployeeController.changePassword);
// route.post("/forgotPassword", EmployeeController.forgotPassword);
// route.post("/resetPassword", EmployeeController.resetPassword);
// route.post("/deleteUser/:id", EmployeeController.deleteUser);
route.patch("/:id", EmployeeController.editEmployee);
route.delete("/:id", EmployeeController.deleteEmployee);

module.exports = route;
