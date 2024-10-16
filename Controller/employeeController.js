const { decode } = require("jsonwebtoken");
const sendResponse = require("../Helper/Helper");
const EmployeeModel = require("../models/EmployeeModel");
const imageUpload = require("../Helper/uploadImageToServer");
const handleUserRegister = require("../Helper/registerUserDynamicHandling");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../Helper/sendEmail");
const sendSMS = require("../Helper/sendSms");
const generateRandomToken = require("../Helper/randomToken");
const cloudinary = require("cloudinary").v2;
const fs = require("fs").promises; // Import the 'fs' module to work with the file system
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const path = require("path");
const whatsApp = require("../Helper/whatsAppVerification");
const { HandleFileUpload } = require("../Helper/fileUploadHelper");
const shopify = require("../Helper/connectedShopify");
const randomCode = require("../Helper/generateRandom");
const checkEmailValidity = require("../Helper/checkEmail");
const axios = require("axios");
var dotenv = require("dotenv");
dotenv.config();

const AuthController = {
  getEmployees: async (req, res) => {
    try {
      let { page, limit, employeeAssociation } = req.query;
      if (!page) page = 1;
      if (!limit) limit = 50;

      const skip = (page - 1) * limit;

      if (!employeeAssociation) {
        res
          .send(sendResponse(false, null, "Required employee shop domain"))
          .status(400);
        return;
      }
      const result = await EmployeeModel.find({
        employeeAssociation,
      })
        .skip(skip)
        .limit(limit);

      if (!result) {
        res
          .send(sendResponse(false, null, "No Employee Data Found"))
          .status(404);
      } else {
        res.send(sendResponse(true, result, "Employee Data Found")).status(200);
      }
    } catch (error) {
      console.log(error);
      res
        .send(sendResponse(false, null, "Server Internal Error", error))
        .status(400);
    }
  },
  addEmployee: async (req, res) => {
    let { email, grade, userCapTotal, employeeAssociation } = req.body;
    try {
      let errArr = [];

      //validation part
      if (!email) {
        errArr.push("Required employee email");
      }
      if (!grade) {
        errArr.push("Required employee grade");
      }
      if (!userCapTotal) {
        errArr.push("Required employee Total Cap");
      }
      const checkEmail = checkEmailValidity(email);
      if (!checkEmail.status) {
        errArr.push(`${checkEmail.message}`);
      }
      if (errArr.length > 0) {
        res
          .send(sendResponse(false, errArr, null, "Required All Fields"))
          .status(400);
        return;
      } else {
        let userExist = await EmployeeModel.findOne({ email: email });

        if (userExist) {
          console.log(userExist, "user");
          res
            .send(
              sendResponse(false, null, "User with this email already exist")
            )
            .status(400);
          return;
        } else {
          //add new user to mongodb
          let obj = { email, grade, userCapTotal, employeeAssociation };
          obj = {
            ...obj,
            userCapRemain: userCapTotal,
          };
          let Employee = new EmployeeModel(obj);
          await Employee.save();
          res
            .send(sendResponse(true, Employee, "Employee Added Successfully"))
            .status(200);
          return;
          //fetch user id through user email.
          const user = await shopify.customer.search({
            query: `email:${userExist.email}`,
          });

          // console.log("discount value", user[0].id, discountValue, new Date());
          // 2018-03-22T00:00:00-00:00
          if (user.length !== 0) {
            res
              .send(
                sendResponse(
                  false,
                  null,
                  "User with this email already exist at shopify"
                )
              )
              .status(404);
            return;
          }
          //add new user to shopify
          let data = JSON.stringify({
            customer: {
              first_name: email.split("@")[0],
              last_name: email.split("@")[0],
              email: email,
              verified_email: false,
              addresses: [
                {
                  address1: "123 Oak St",
                  city: "Ottawa",
                  province: "ON",
                  phone: "555-1212",
                  zip: "123 ABC",
                  last_name: "Lastnameson",
                  first_name: "Mother",
                  country: "CA",
                },
              ],
              password: "newpass@383",
              password_confirmation: "newpass@383",
              send_email_welcome: true,
            },
          });

          let config = {
            method: "post",
            maxBodyLength: Infinity,
            url: `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-07/customers.json`,
            headers: {
              "X-Shopify-Access-Token": `${process.env.SHOPIFY_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            data: data,
          };

          axios
            .request(config)
            .then((response) => {
              // console.log("shopifyDbResponse", JSON.stringify(response));
              const joinApisResponse = {
                mongoDbResponse: Employee,
                shopifyDbResponse: JSON.stringify(response.data),
              };
              res
                .send(
                  sendResponse(
                    true,
                    joinApisResponse,
                    "Employee Added Successfully"
                  )
                )
                .status(200);
            })
            .catch((error) => {
              console.log(error);
              let errorMessage = "An unexpected error occurred";
              if (
                error.response &&
                error.response.data &&
                error.response.data.errors
              ) {
                // Extract and format dynamic errors
                errorMessage = Object.entries(error.response.data.errors)
                  .map(([key, messages]) => `${key}: ${messages}`)
                  .join("\n");
              }
              res
                .send(
                  sendResponse(
                    false,
                    null,
                    errorMessage,
                    "Internal Server Error"
                  )
                )
                .status(400);
            });
        }
      }
    } catch (error) {
      console.log(error);
      let errorMessage = "An unexpected error occurred";
      if (error.response && error.response.data && error.response.data.errors) {
        // Extract and format dynamic errors
        errorMessage = Object.entries(error.response.data.errors)
          .map(([key, messages]) => `${key}: ${messages}`)
          .join("\n");
      }
      res
        .send(sendResponse(false, null, errorMessage, "Internal Server Error"))
        .status(400);
    }
  },
  editEmployee: async (req, res) => {
    try {
      let id = req.params.id;
      let result = await EmployeeModel.findById(id);
      if (!result) {
        res
          .send(sendResponse(false, null, "Employee with specified id Found"))
          .status(404);
      } else {
        let updateResult = await EmployeeModel.findByIdAndUpdate(id, req.body, {
          new: true,
        });
        if (!updateResult) {
          res
            .send(sendResponse(false, null, "Unable to update results"))
            .status(404);
        } else {
          res
            .send(
              sendResponse(
                true,
                updateResult,
                "Employee data updated SucessFully"
              )
            )
            .status(200);
        }
      }
    } catch (e) {
      res
        .send(sendResponse(false, null, e, "Internal Server Error"))
        .status(400);
    }
  },
  deleteEmployee: async (req, res) => {
    try {
      let id = req.params.id;
      let result = await EmployeeModel.findById(id);
      console.log("resultant", result);

      if (!result) {
        res
          .send(sendResponse(false, null, "Employee with specified id Found"))
          .status(404);
      } else {
        let deleteById = await EmployeeModel.findByIdAndDelete(id);
        if (!deleteById) {
          res.send(sendResponse(false, null, "Error")).status(404);
        } else {
          res
            .send(
              sendResponse(
                true,
                deleteById,
                "Employee Data Deleted SucessFully"
              )
            )
            .status(200);
        }
      }
    } catch (e) {
      res
        .send(sendResponse(false, null, e, "Internal Server Error"))
        .status(400);
    }
  },
  getSingleEmployees: async (req, res) => {
    let id = req.params.id;
    await EmployeeModel.findById(id)
      .then((result) => {
        res.send(sendResponse(true, result)).status(200);
      })
      .catch((err) => {
        console.log(err);
        res.send(sendResponse(false, err, "Employee not found")).status(404);
      });
  },
};

module.exports = AuthController;
