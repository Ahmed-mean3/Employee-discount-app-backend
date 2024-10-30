const CourseModel = require("../models/DiscountModel");
const sendResponse = require("../Helper/Helper");
const EmployeeModel = require("../models/EmployeeModel");
const shopify = require("../Helper/connectedShopify");
const axios = require("axios");
var dotenv = require("dotenv");
dotenv.config();

const Controller = {
  //add order discount
  AddOrderDiscount: async (req, res) => {
    try {
      const { employeeEmail, totalShoppingAmount } = req.body;
      let errArr = [];

      //validation part

      if (!employeeEmail) {
        errArr.push("Required employee email");
      }
      if (!totalShoppingAmount) {
        errArr.push("Required employee total shopping amount");
      }
      if (errArr.length > 0) {
        res
          .send(sendResponse(false, errArr, null, "Required All Fields"))
          .status(400);
      } else {
        //match fetched employeeEmail with our mongo db employee email
        let userExist = await EmployeeModel.findOne({ email: employeeEmail });
        const user = await shopify.customer.search({
          query: `email:${employeeEmail}`,
        });
        if (userExist && user) {
          // console.log("user", userExist);

          //if emp match found get its grade and find discount % based on grades
          // const discountValue = getDiscountPercentage(
          //   parseInt(userExist.grade)
          // );

          //scenario 3
          //if user remaining cap is 0 check right now order's date
          //does it ahead of allocated month of an employee
          //if so then re-allocated total cap to remaining cap. otherwise return message
          //your current month quota has been reached.

          const extractMonth =
            new Date(userExist.allocatedMonth).getUTCMonth() + 1;
          const extractCurrentApiCallMonth = new Date().getUTCMonth() + 1;

          console.log(
            "current month ",
            extractCurrentApiCallMonth,
            "allocated month",
            extractMonth
          );

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

          // if (
          //   userExist.userCapRemain === 0 &&
          //   extractMonth < extractCurrentApiCallMonth
          // ) {
          //   console.log(
          //     "current month ",
          //     extractCurrentApiCallMonth,
          //     "allocated month",
          //     extractMonth,
          //     "user exist total cap to check",
          //     userExist.userCapTotal
          //   );
          //   //update allocation month date as well
          //   const payload = {
          //     userCapRemain: userExist.userCapTotal,
          //     allocatedMonth: Date.now(),
          //   };

          //   await EmployeeModel.findByIdAndUpdate(userExist.id, payload, {
          //     new: true,
          //   });
          // }
          // return;

          // check available employee cap is greater than its grade's correspond percentage.
          // userExist.userCapRemain

          // from total cap i.e 10000 find out how much cap is user wants to be allocated i.e grade 17's => 17%
          // 17% / 100 * 10000 = 1700 /= discount wanted to be allocated.

          //new game
          //discount value is fixed 35%
          const isAllocatable = (35 / 100) * totalShoppingAmount;

          // if (isAllocatable > userExist.userCapRemain) {

          //   // res
          //   //   .send(
          //   //     sendResponse(
          //   //       false,
          //   //       null,
          //   //       `Based on user's grade ${userExist.grade}, ${discountValue}% (${isAllocatable}) discount is greater then available cap of ${userExist.userCapRemain} /=`
          //   //     )
          //   //   )
          //   //   .status(404);
          //   return;
          // }

          //fetch user id through user email.
          const user = await shopify.customer.search({
            query: `email:${userExist.email}`,
          });

          console.log(
            "discount person id",
            user[0].id,
            "allocatable discount amount ",
            isAllocatable,
            "out of ",
            totalShoppingAmount,
            "at time",
            new Date()
          );
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
          const discountName = `employee ${
            isAllocatable > userExist.userCapRemain
              ? userExist.userCapRemain
              : isAllocatable
          } /= discount ${new Date().toLocaleString("en-GB", {
            hour12: false,
          })}`;
          const price_rule = {};
          price_rule.title = discountName;
          price_rule.target_type = "line_item";
          price_rule.target_selection = "all";
          price_rule.allocation_method = "across";
          price_rule.value_type = "percentage";
          //add that % in the payload
          price_rule.value = `-35.0`;
          price_rule.customer_selection = "prerequisite";
          price_rule.prerequisite_customer_ids = [user[0].id];
          price_rule.starts_at = new Date();
          price_rule.usage_limit = 1;

          // hit post rest api of order price rule
          const orderDiscountPriceRule = await shopify.priceRule.create(
            price_rule
          );
          console.log("price rule id", orderDiscountPriceRule.id);
          //hit post rest api of discount code

          const discountCodesUrl = `https://${process.env.SHOPIFY_STORE_URL}/admin/api/2024-07/price_rules/${orderDiscountPriceRule.id}/discount_codes.json`;
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
                  `${process.env.SHOPIFY_API_KEY}:${process.env.SHOPIFY_API_TOKEN}`
                ).toString("base64")}`,
              },
            }
          );

          console.log("Discount code created:", response_add_discount.data);

          //Scenario 01
          //deduct allocated discounted value from user cap remaining

          //scenario 02
          // 35% of 10000 /=
          // 3500 and available is only 2500 you give 2500 discount above but you need to update remain cap property
          //so make cap ramain 0 because you have remaining is only 2500 which you give above in the discount payload api
          // and now need to update remain cap. so make cap remain 0. cuz remaining cap you had already used.

          console.log(
            "is this scenario 3 is ",
            extractMonth < extractCurrentApiCallMonth,
            "user cap",
            userExist,
            "total cap"
          );
          const payload = {
            userCapRemain:
              extractMonth < extractCurrentApiCallMonth
                ? (userExist.userCapTotal - isAllocatable)
                    .toString()
                    .replace(/-/g, "")
                : isAllocatable > userExist.userCapRemain
                ? 0
                : userExist.userCapRemain - isAllocatable,
          };
          if (extractMonth < extractCurrentApiCallMonth) {
            payload.allocatedMonth = Date.now();
          }
          console.log(
            "user balance after discount amount deduction",
            payload.userCapRemain
          );
          // //no cap remaining
          // if (isAllocatable > userExist.userCapRemain) {

          //   // res
          //   //   .send(
          //   //     sendResponse(
          //   //       false,
          //   //       null,
          //   //       `Based on user's grade ${userExist.grade}, ${discountValue}% (${isAllocatable}) discount is greater then available cap of ${userExist.userCapRemain} /=`
          //   //     )
          //   //   )
          //   //   .status(404);
          //   return;
          // }

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
  ApplyOrderDiscount: async (req, res) => {
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
            console.log("responsess", JSON.stringify(response.data));
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

        return;
        //     const query = `mutation applyDiscountCodeToCheckout($checkoutId: ID!, $discountCode: String!) {
        //   checkoutDiscountCodeApplyV2(checkoutId: $checkoutId, discountCode: $discountCode) {
        //     checkout {
        //       discountApplications(first: 10) {
        //         edges {
        //           node {
        //             allocationMethod
        //             targetSelection
        //             targetType
        //           }
        //         }
        //       }
        //     }
        //     checkoutUserErrors {
        //       message
        //       code
        //       field
        //     }
        //   }
        // }`;

        //     // Variables for the automatic discount
        //     const variables = {
        //       checkoutId: `gid://shopify/Checkout/${checkoutId}`,
        //       discountCode: discountCode,
        //     };
        // Use the Shopify client to make a GraphQL request
        const resp = await shopify.graphql(query, variables);

        // Handle user errors from the Shopify API
        if (resp.userErrors && resp.userErrors.length > 0) {
          console.error("User Errors:", resp.userErrors);
          return res
            .status(400)
            .send(sendResponse(false, resp.userErrors, "User Errors occurred"));
        }
        // Success response
        // const { automaticDiscountNode } = resp.discountAutomaticBasicCreate;
        console.log("disocunt sucess apply", resp);
        res
          .status(201)
          .send(
            sendResponse(true, resp, "Automatic discount created successfully")
          );

        return;
        //   const query = `
        //   mutation {
        //     checkoutDiscountCodeApply(checkoutId: "${checkoutId}", discountCode: "${discountCode}") {
        //       checkout {
        //         id
        //         discountApplications(first: 5) {
        //           edges {
        //             node {
        //               ... on DiscountCodeApplication {
        //                 code
        //               }
        //             }
        //           }
        //         }
        //       }
        //       userErrors {
        //         field
        //         message
        //       }
        //     }
        //   }
        // `;

        // const resp = await shopify.graphql(query);

        // // Handle user errors from the Shopify API
        // if (resp.userErrors && resp.userErrors.length > 0) {
        //   console.error("User Errors:", resp.userErrors);
        //   return res
        //     .status(400)
        //     .send(sendResponse(false, resp.userErrors, "User Errors occurred"));
        // }

        // // Success response
        // // const { automaticDiscountNode } = resp.discountAutomaticBasicCreate;
        // console.log("success response", resp);
        // res
        //   .status(201)
        //   .send(
        //     sendResponse(true, resp, "Automatic discount created successfully")
        //   );
        // return;
        const response = await fetch(
          "https://your-shopify-store.myshopify.com/api/2023-04/graphql.json",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Storefront-Access-Token":
                "your-storefront-access-token",
            },
            body: JSON.stringify({ query }),
          }
        );
        const result = await response.json();
        console.log(result.data);
        res
          .send(sendResponse(true, result.data, "Save Successfully"))
          .status(200);
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
