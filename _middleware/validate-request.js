module.exports = validateRequest;

function validateRequest(req, next, schema) {
  const options = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: true,
  };

  const { error, value } = schema.validate(req.body, options);
  if (error) {
   // console.log("Request Body if Error: " + req.body);
    next(`Validation error: ${error.details.map((x) => x.message).join(", ")}`);
  } else {
    // console.log("Request Body if Success: " + req.body);
    req.body = value;
    next();
  }
}
