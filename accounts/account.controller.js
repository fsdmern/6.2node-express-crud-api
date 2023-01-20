//Used to define all account routes
const express = require("express");
const router = express.Router();
const Joi = require("joi");
const validateRequest = require("_middleware/validate-request");
const authorize = require("_middleware/authorize");
const Role = require("_helpers/role");
const accountService = require("./account.service");
const { request } = require("express");

//routes
// User Sign-in
router.post("/authenticate", authenticateSchema, authenticate);
router.post("/forgot-password", forgotPasswordSchema, forgotPassword);
// User Sign-up
router.post("/register", registerSchema, register);
router.post("/verify-email", verifyEmailSchema, verifyEmail);
router.post("/reset-password", resetPasswordSchema, resetPassword);
router.post("/validate-reset-token", validateResetTokenSchema, validateResetToken);
router.post("/refresh-token", refreshToken);
router.post("/revoke-token", authorize(), revokeTokenSchema, revokeToken);
router.get("/",authorize(Role.Admin),getAll)
router.get("/:id",authorize(),getById)
router.post("/",authorize(Role.Admin),createSchema, create)
router.put("/:id",authorize(),updateSchema,update)
router.delete("/:id", authorize(), _delete)

module.exports = router;

function authenticateSchema(req, res, next) {
  const schema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
  });
  validateRequest(req, next, schema);
}

function authenticate(req, res, next) {
  const { email, password } = req.body;
  const ipAddress = req.ip;
  accountService.authenticate({ email, password, ipAddress }).then((refreshToken, ...account) => {
    setTokenCookie(res, refreshToken);
    res.json(account);
  });
}

function registerSchema(req, res, next) {
  const schema = Joi.object({
    title: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required(),
    acceptTerms: Joi.boolean().valid(true).required(),
  });

  validateRequest(req, next, schema);
}

function register(req, res, next) {
  accountService
    .register(req.body, req.get("origin"))
    .then(() =>
      res.json({ message: "Registration Successful. Please check your email for verification" })
    )
    .catch(next);
}

function verifyEmailSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().required,
  });
  validateRequest(req, next, schema);
}

function verifyEmail(req, res, next) {
  accountService
    .verifyEmail(req.body)
    .then(() => res.json({ message: "Verification succcessful, you can now login" }))
    .catch(next);
}

function forgotPasswordSchema(req, res, next) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });
  validateRequest(req, next, schema);
}

function forgotPassword(req, res, next) {
  accountService
    .forgotPassword(req.body, req.get("origin"))
    .then(() => res.json({ message: "Please check your email for password reset instructions" }))
    .catch(next);
}

function resetPasswordSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password")).required,
  });
  validateRequest(req, next, schema);
}

function resetPassword(req, res, next) {
  accountService
    .resetPassword(req.body)
    .then(() => res.json({ message: "Password Reset Successful. You can now login" }))
    .catch(next);
}

function resetPasswordSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref("password").required()),
  });
}

function resetPassword(req, res, next) {
  accountService
    .resetPassword(req.body)
    .then(() => res.json({ message: "Password reset successful, you can login now" }));
}

function refreshToken(req, res, next) {
  const token = req.cookies.refreshToken;
  const ipAddress = req.ip;
  accountService.refreshToken({ token, ipAddress }).then(({ refreshToken, ...account }) => {
    setTokenCookie(res, refreshToken);
    res.json(account);
  });
}

function revokeTokenSchema(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().empty(""),
  });
}

function revokeToken(req, res, next) {
  const token = req.body.token || req.cookies.resfreshToken;
  const ipAddress = req.ip;

  if (!token) return res.status(400).json({ message: "Token is required" });

  if (!req.user.ownsToken(token) && req.user.role !== Role.Admin) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  accountService
    .revokeToken({ token, ipAddress })
    .then(() => res.json({ message: "Token Revoked" }))
    .catch(next);
}


function getAll(req,res,next) {
  //view list of accounts/users
  accountService.getAll()
    .then(accounts => res.json(accounts))
    .catch(next)
}

function getById(req,res, next) {
    if(req.params.id != req.user.id && req.user.role !=Role.Admin){
      return res.status(401).json({message: 'Unauthorized'})
    }

    accountService.getById(req.params.id)
      .then(account => account ? res.json(account) : res.sendStatus(404))
      .catch(next)
}


createSchema(req, res, next) {
    const schema = Joi.object({
      title: Joi.string().required(),
      firstName:Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
      role: Joi.string().valid(Role.Admin, Role.User).required()
    })
}

create(req,res,next) {
    accountService.create(req.body)
      .then(account => res.json(account))
      .catch(next)
}


function updateSchema(req,res,next){
    const schemaRules = {
      title: Joi.string().empty(''),
      firstName: Joi.string().empty(''),
      lastName: Joi.string().empty(''),
      email: Joi.string().email().empty(''),
      password: Joi.string().min(6).empty(''),
      confirmPassword: Joi.string().valid(Joi.ref('password')).empty(''),
    }

    if(req.user.role === Role.Admin) {
      schemaRules.role = Joi.string().valid(Role.Admin, Role.User).empty('')
    }

    const schema = Joi.object(schemaRules).with('password','confirmPassword')
    validateRequest(req,res,next)

}

function update(req,res,next){
   if(req.params.id != req.user.id && req.user.role !=Role.Admin) {
        return res.status(401).json({message: 'Unauthorized'})
   }

   accountService.update(req.params.id, req.body)
    .then(account => res.json(account))
    .catch(next)
}

function _delete(req,res,next){
     if(req.params.id != req.user.id && req.user.role !=Role.Admin) {
        return res.status(401).json({message: 'Unauthorized'})
   }

   accountService.delete(req.params.id)
    .then(()=> res.json({message: 'Account deleted successfully'}))
    .catch(next)
}


