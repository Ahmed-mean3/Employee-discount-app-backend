const express = require("express");
const CourseModel = require("../models/DiscountModel");
const sendResponse = require("../Helper/Helper");
const Controller = require("../Controller/discountController");
const route = express.Router();

route.get("/", Controller.GetCourse);

route.post("/searchStd", Controller.SeachCourseWithPagination);

route.get("/:id", Controller.SingleCourse);

route.post("/", Controller.AddOrderDiscount);

route.post("/applyOrderDiscount", Controller.ApplyOrderDiscount);

route.get("/search", Controller.SearchCourse);

route.put("/:id", Controller.EditCourse);

route.delete("/:id", Controller.DeleteCourse);

//example http://localhost:5000/api/student/4

module.exports = route;
