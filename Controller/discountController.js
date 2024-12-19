const CourseModel = require("../models/DiscountModel");
const sendResponse = require("../Helper/Helper");
const getDiscountPercentage = require("../Helper/gradeToPercentDiscount");
const EmployeeModel = require("../models/EmployeeModel");
const Shopify = require("shopify-api-node");
const axios = require("axios");
var dotenv = require("dotenv");
const Hash = require("../Helper/hashing");
const StoreSchema = require("../models/StoreSchema");
dotenv.config();

const Controller = {
  //add order discount
  AddOrderDiscount: async (req, res) => {
    try {
      const { employeeEmail, employeeAssociation } = req.body;

      if (!employeeAssociation) {
        return res.status(404).send({
          status: false,
          message: "No employee association key found with data paylaod.",
        });
      }

      const store = await StoreSchema.findOne({
        shopName: employeeAssociation,
      });

      if (!store) {
        return res.status(404).send({
          status: false,
          message: "No credentials found for the shop.",
        });
      }

      let errArr = [];

      if (!employeeEmail) {
        errArr.push("Required employee email");
      }
      if (errArr.length > 0) {
        res
          .send(sendResponse(false, errArr, null, "Required All Fields"))
          .status(400);
      } else {
        const decryptedApiKey = await Hash.decrypt(store.apiKey);
        const decryptedApiSecret = await Hash.decrypt(store.apiSecret);

        if (!employeeAssociation && !decryptedApiKey && !decryptedApiSecret)
          return res.status(404).send({
            status: false,
            message: "No credentials found i.e decrypted api key or api secret",
          });

        const shopify = new Shopify({
          shopName: employeeAssociation,
          apiKey: decryptedApiKey,
          password: decryptedApiSecret,
        });

        //match fetched employeeEmail with our mongo db employee email
        let userExist = await EmployeeModel.findOne({ email: employeeEmail });
        if (userExist) {
          // console.log("user", userExist);

          //if emp match found get its grade and find discount % based on grades

          //if user remaining cap is 0 check right now order's date
          //does it ahead of allocated month of an employee
          //if so then re-allocated total cap to remaining cap. otherwise return message
          //your current month quota has been reached.

          const extractMonth =
            new Date(userExist.allocatedMonth).getUTCMonth() + 1;
          const extractCurrentApiCallMonth = new Date().getUTCMonth() + 1;

          if (
            userExist.userCapRemain === 0 &&
            extractMonth === extractCurrentApiCallMonth
          ) {
            res
              .send(
                sendResponse(
                  false,
                  null,
                  `Your Current Quota for this month (${new Date(
                    userExist.allocatedMonth
                  ).toDateString()}) has been reached ,cap remaining (${
                    userExist.userCapRemain
                  })`
                )
              )
              .status(404);
            return;
          }

          if (
            userExist.userCapRemain === 0 &&
            extractMonth < extractCurrentApiCallMonth
          ) {
            //update allocation month date as well
            const payload = {
              userCapRemain: userExist.userCapTotal,
              allocatedMonth: Date.now(),
            };

            await EmployeeModel.findByIdAndUpdate(userExist.id, payload, {
              new: true,
            });
          }
          // return;

          //check available employee cap is greater than its grade's correspond percentage.
          // userExist.userCapRemain

          //from total cap i.e 10000 find out how much cap is user wants to be allocated i.e grade 17's => 17%
          // 17% / 100 * 10000 = 1700 /= discount wanted to be allocated.

          if (parseInt(userExist.discountValue) > userExist.userCapRemain) {
            res
              .send(
                sendResponse(
                  false,
                  null,
                  `Based on user's designated discount value, ${
                    userExist.discountValue
                  }${
                    userExist.discountType.toLowerCase() === "percentage"
                      ? "%"
                      : "$"
                  } discount is greater then available cap of ${
                    userExist.userCapRemain
                  } /=`
                )
              )
              .status(404);
            return;
          }

          //fetch user id through user email.
          const user = await shopify.customer.search({
            query: `email:${userExist.email}`,
          });

          // console.log("discount value", user[0].id, discountValue, new Date());

          // const delay = (ms) =>
          //   new Promise((resolve) => setTimeout(resolve, ms));

          // //input user id. user[0].id
          // const allPriceRules = await shopify.priceRule.list();

          //Add another condition in that array that only filter discount price rules that ends date time is greater then the current date time
          // Filter price rules matching the user's ID
          // const matchedRules = allPriceRules.filter((rule) => {
          //   console.log("date check", new Date(`${rule.ends_at}`) > new Date());
          //   return (
          //     Array.isArray(rule.prerequisite_customer_ids) &&
          //     rule.prerequisite_customer_ids.includes(user[0].id) &&
          //     rule.ends_at &&
          //     new Date(`${rule.ends_at}`) > new Date()
          //   );
          // });

          // let discountCodesWithUsageLeft = [];

          // if (matchedRules.length > 0) {
          //   // Loop through each matched rule and fetch its discount codes
          //   for (const rule of matchedRules) {
          //     await delay(1000); // Add delay between requests
          //     const discountCodes = await shopify.discountCode.list(rule.id);

          //     // Filter discount codes based on usage count
          //     const filteredCodes = discountCodes.filter(
          //       (code) => code.usage_count <= 2
          //     );

          //     if (filteredCodes.length > 0) {
          //       discountCodesWithUsageLeft.push(filteredCodes[0]); // Take the first code
          //     }
          //   }
          // }

          // if (discountCodesWithUsageLeft.length > 0) {
          //   res
          //     .send(
          //       sendResponse(
          //         true,
          //         { discount_code: discountCodesWithUsageLeft[0] },
          //         "Order Discount Fetched Successfully"
          //       )
          //     )
          //     .status(200);
          //   return;
          // }

          // return;

          // 2018-03-22T00:00:00-00:00
          if (user.length === 0) {
            res
              .send(
                sendResponse(
                  false,
                  null,
                  "User with this email does not exist in shopify"
                )
              )
              .status(404);
            return;
          }
          const discountName = `${userExist.discountValue}${
            userExist.discountType.toLowerCase() === "percentage" ? "%" : "$"
          }_discount_${
            new Date().toLocaleDateString() +
            "-" +
            new Date().toLocaleTimeString()
          }`;
          const price_rule = {};
          price_rule.title = discountName;
          price_rule.target_type = "line_item";
          price_rule.target_selection = "all";
          price_rule.allocation_method = "across";
          price_rule.value_type = userExist.discountType.toLowerCase();
          price_rule.value = `-${userExist.discountValue}.0`;
          price_rule.customer_selection = "prerequisite";
          price_rule.prerequisite_customer_ids = [user[0].id];
          price_rule.starts_at = new Date();
          price_rule.usage_limit = 1;
          price_rule.allocation_limit = 1;
          const endDate = new Date(price_rule.starts_at);
          endDate.setMinutes(endDate.getMinutes() + 30);
          price_rule.ends_at = endDate;
          const orderDiscountPriceRule = await shopify.priceRule.create(
            price_rule
          );
          // console.log("price rule id", orderDiscountPriceRule.id);

          const discountCodesUrl = `https://${employeeAssociation}/admin/api/2024-07/price_rules/${orderDiscountPriceRule.id}/discount_codes.json`;
          const discountCodeData = {
            discount_code: {
              code: discountName,
            },
          };

          const response_add_discount = await axios.post(
            discountCodesUrl,
            discountCodeData,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(
                  `${decryptedApiKey}:${decryptedApiSecret}`
                ).toString("base64")}`,
              },
            }
          );

          // console.log("Discount code created:", response_add_discount.data);

          //deduct allocated discounted value from user cap remaining
          const payload = {
            userCapRemain:
              userExist.userCapRemain - parseInt(userExist.discountValue),
          };

          await EmployeeModel.findByIdAndUpdate(userExist.id, payload, {
            new: true,
          });
          res
            .send(
              sendResponse(
                true,
                response_add_discount.data,
                "Order Discount Created Successfully"
              )
            )
            .status(200);
        } else {
          res
            .send(sendResponse(false, null, "User not eligible for discount"))
            .status(400);
        }
      }
    } catch (error) {
      console.log("error", error);
      let errorMessage = "An unexpected error occurred";
      if (error.response && error.response.data && error.response.data.errors) {
        // Extract and format dynamic errors
        errorMessage = Object.entries(error.response.data.errors)
          .map(([key, messages]) => `${key}: ${messages}`)
          .join("\n");
      }
      res
        .status(500)
        .send(
          sendResponse(
            false,
            null,
            `Failed to create discount code.${errorMessage}`
          )
        );
    }
  },
  ApplyOrderDiscount: (req, res) => {
    const { checkoutId, discountCode } = req.body;
    try {
      let errArr = [];

      //validation Part
      if (!checkoutId) {
        errArr.push("Required checkout id");
      }
      if (!discountCode) {
        errArr.push("Required discount code");
      }

      if (errArr.length > 0) {
        res
          .send(sendResponse(false, errArr, null, "Required All Fields"))
          .status(400);
        return;
      } else {
        // const token = await shopify.storefrontAccessToken.list();
        // console.log("list", token);
        // return;
        const query = `mutation applyDiscountCodeToCheckout($checkoutId: ID!, $discountCode: String!) {
  checkoutDiscountCodeApplyV2(
    checkoutId: $checkoutId
    discountCode: $discountCode
  ) {
    checkout {
      discountApplications(first: 10) {
        edges {
          node {
            allocationMethod
            targetSelection
            targetType
          }
        }
      }
    }
    checkoutUserErrors {
      message
      code
      field
    }
  }
}`;
        const variables = {
          checkoutId: `gid://shopify/Checkout/${checkoutId}`,
          discountCode: discountCode,
        };

        let data = JSON.stringify({
          query: `mutation applyDiscountCodeToCheckout($checkoutId: ID!, $discountCode: String!) {
  checkoutDiscountCodeApplyV2(
    checkoutId: $checkoutId
    discountCode: $discountCode
  ) {
    checkout {
      discountApplications(first: 10) {
        edges {
          node {
            allocationMethod
            targetSelection
            targetType
          }
        }
      }
    }
    checkoutUserErrors {
      message
      code
      field
    }
  }
}`,
          variables: {
            checkoutId: `gid://shopify/Checkout/${checkoutId}`,
            discountCode: discountCode,
          },
        });

        let config = {
          method: "post",
          maxBodyLength: Infinity,
          url: `https://${process.env.SHOPIFY_STORE_URL}/api/2023-04/graphql.json`,
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": `ad9b5e141f7f38a6e222fb5ead396971`,
          },
          data: data,
        };

        axios
          .request(config)
          .then((response) => {
            // console.log("responsess", JSON.stringify(response.data));
            res.send(sendResponse(true, "ok", "applying")).status(200);
          })
          .catch((error) => {
            console.log(error);
            let errorMessage = "An unexpected error occurred";

            // Check if there is a response from the API with errors
            if (
              error.response &&
              error.response.data &&
              error.response.data.errors
            ) {
              // Extract and format dynamic errors
              errorMessage = error.response.data.errors
                .map((err) => `${err.message}`)
                .join("\n");
            }

            // Send the response with the error message and a 400 status
            res
              .status(400)
              .send(
                sendResponse(false, null, errorMessage, "Internal Server Error")
              );
          });
      }
    } catch (e) {
      console.log(e);
      res.send(sendResponse(false, null, "Internal Server Error")).status(400);
    }
  },
  GetCourse: async (req, res) => {
    try {
      let { page, limit, sort, asc } = req.query;
      if (!page) page = 1;
      if (!limit) limit = 10;

      const skip = (page - 1) * limit;
      const result = await CourseModel.find()
        .sort({ [sort]: asc })
        .skip(skip)
        .limit(limit);
      if (!result) {
        res.send(sendResponse(false, null, "No Data Found")).status(404);
      } else {
        res
          .send(sendResponse(true, result, "Data Found", "", page, limit))
          .status(200);
      }
    } catch (e) {
      console.log(e);
      res.send(sendResponse(false, null, "Server Internal Error")).status(400);
    }
  },
  SingleCourse: async (req, res) => {
    try {
      let id = req.params.id;
      const result = await CourseModel.findById(id);
      console.log(result);
      if (!result) {
        res.send(sendResponse(false, null, "No Data Found")).status(404);
      } else {
        res.send(sendResponse(true, result, "Data Found")).status(200);
      }
    } catch (e) {
      console.log(e);
      res.send(sendResponse(false, null, "Server Internal Error")).status(400);
    }
  },
  SeachCourseWithPagination: async (req, res) => {
    try {
      const { pageSize, PageNo, searchByVal, searchKey } = req.body;

      let result = await CourseModel.find({ [searchKey]: searchByVal })
        .skip((PageNo - 1) * pageSize)
        .limit(PageNo);

      if (result) {
        res.send(sendResponse(true, result)).status(200);
      } else {
        res.send(sendResponse(false, null, "record not found !")).status(404);
      }
    } catch (error) {
      console.log(error);
      res.send(sendResponse(false, null, "Internal Server Error")).status(400);
    }
  },
  PostCourse: async (req, res) => {
    let { name, duration, fees, shortName } = req.body;
    try {
      let errArr = [];

      //validation Part
      if (!name) {
        errArr.push("Required FirstName");
      }
      if (!duration) {
        errArr.push("Required duration");
      }
      if (!fees) {
        errArr.push("Required fees");
      }
      if (!shortName) {
        errArr.push("Required shortName");
      }

      if (errArr.length > 0) {
        res
          .send(sendResponse(false, errArr, null, "Required All Fields"))
          .status(400);
        return;
      } else {
        let obj = { name, duration, fees, shortName };
        let Course = new CourseModel(obj);
        await Course.save();
        if (!Course) {
          res.send(sendResponse(false, null, "Data Not Found")).status(404);
        } else {
          res.send(sendResponse(true, Course, "Save Successfully")).status(200);
        }
      }
    } catch (e) {
      console.log(e);
      res.send(sendResponse(false, null, "Internal Server Error")).status(400);
    }
    res.send("Post single Student Data");
  },
  SearchCourse: async (req, res) => {
    let { firstName, lastName } = req.body;
    try {
      let result = await CourseModel.find({
        firstName: firstName,
        lastName: lastName,
      });
      if (!result) {
        res.send(sendResponse(false, null, "No Data Found")).status(404);
      } else {
        res.send(sendResponse(true, result), "Data found").status(200);
      }
    } catch (e) {
      res.send(sendResponse(false, null, "Internal Server Error")).status(400);
    }
  },
  EditCourse: async (req, res) => {
    try {
      let id = req.params.id;
      let result = await CourseModel.findById(id);
      if (!result) {
        res.send(sendResponse(false, null, "No Data Found")).status(404);
      } else {
        let updateResult = await CourseModel.findByIdAndUpdate(id, req.body, {
          new: true,
        });
        if (!updateResult) {
          res.send(sendResponse(false, null, "No Data Found")).status(404);
        } else {
          res
            .send(sendResponse(true, updateResult, "Data updated SucessFully"))
            .status(200);
        }
      }
    } catch (e) {
      res.send(sendResponse(false, null, "Internal Server Error")).status(400);
    }
  },
  DeleteCourse: async (req, res) => {
    try {
      let id = req.params.id;
      let result = await CourseModel.findById(id);
      if (!result) {
        res
          .send(sendResponse(false, null, "No Data Found on this id"))
          .status(404);
      } else {
        let deleteById = await CourseModel.findByIdAndDelete(id);
        if (!deleteById) {
          res.send(sendResponse(false, null, "Error")).status(404);
        } else {
          res
            .send(sendResponse(true, deleteById, "Data Deleted SucessFully"))
            .status(200);
        }
      }
    } catch (e) {
      res
        .send(sendResponse(true, deleteById, "Internal Server Error"))
        .status(400);
    }
  },
};

module.exports = Controller;

// BACKUP PLAN

//query shopify db to get employee details using abover emp id.
//match getted employee email with our mongo db employee email
//if emp match found get its grade and find discount % based on grades
//add that % in the payload then hit post rest api of order price rule
//hit post rest api of discount code
//return back user that discount code
