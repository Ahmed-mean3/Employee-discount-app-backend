const express = require("express");
const route = express.Router();
const EmployeeController = require("../Controller/employeeController");
var dotenv = require("dotenv");
dotenv.config();
const authMiddleware = require("../Helper/middleware");

route.use(authMiddleware);
route.get("/", EmployeeController.getEmployees);
route.get("/:id", EmployeeController.getSingleEmployees);
route.post("/", EmployeeController.addEmployee);
route.patch("/:id", EmployeeController.editEmployee);
route.delete("/:id", EmployeeController.deleteEmployee);

module.exports = route;
