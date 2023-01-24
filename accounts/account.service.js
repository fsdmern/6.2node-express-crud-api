const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");
const bcrypt = require("bcryptjs/dist/bcrypt");

const sendEmail = require("../_helpers/send-email");
const db = require("../_helpers/db");
const Role = require("../_helpers/role");
const jwtSecret = process.env.JWT_SECRET;

module.exports = {
  authenticate,
  refreshToken,
  revokeToken,
  register,
  verifyEmail,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getAll,
  getById,
  create,
  update,
  getAccount,
  getRefreshToken,
  hash,
  generateJwtToken,
  generateRefreshToken,
  randomTokenString,
  basicDetails,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAlreadyRegisteredEmail,
};

async function authenticate({ email, password, ipAddress }) {
  const account = await db.Account.findOne({ email });
  if (!account || !account.isVerified || !bcrypt.compareSync(password, account.passwordHash)) {
    throw "Email or password is incorrect";
  }

  const jwtToken = generateJwtToken(account);
  const refreshToken = generateRefreshToken(account, ipAddress);

  await refreshToken.save();

  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: refreshToken.token,
  };
}

async function refreshToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);
  const { account } = refreshToken;

  //replace an existing token
  const newRefreshToken = generateRefreshToken(account, ipAddress);
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newRefreshToken.token;
  await refreshToken.save();
  await newRefreshToken.save();

  //new jwt token
  const jwtToken = generateJwtToken(account);

  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: newRefreshToken.token,
  };
}

async function revokeToken({ token, ipAddress }) {
  const refreshToken = await getRefreshToken(token);

  //revoke and save
  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  await refreshToken.save();
}

async function register(params, origin) {
  if (await db.Account.findOne({ email: params.email })) {
    return await sendAlreadyRegisteredEmail(params.email, origin);
  }

  //create account object
  const account = new db.Account(params);

  const isFirstAccount = (await db.Account.countDocuments({})) === 0;
  account.role = isFirstAccount ? Role.Admin : Role.User;
  account.verificationToken = randomTokenString();

  // hash/encrypt pwd
  account.passwordHash = hash(params.password);

  //save account
  await account.save();

  //send email
  await sendVerificationEmail(account, origin);

}

async function verifyEmail({ token }) {
  const account = await db.Account.findOne({ verificationToken: token });

  if (!account) throw "Verification failed";
  account.verified = Date.now();
  account.verificationToken = undefined;
  await account.save();
}

async function forgotPassword({ email }, origin) {
  const account = await db.Account.findOne({ email });

  if (!account) return;

  account.resetToken = {
    token: randomTokenString(),
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
  await account.save();
  await sendPasswordResetEmail(account, origin);
}

async function validateResetToken({ token }) {
  const account = await db.Account.findOne({
    "resetToken.token": token,
    "resetToken.expires": { $gt: Date.now() },
  });

  if (!account) throw "Invalid token";
}

async function resetPassword({ token, password }) {
  const account = await db.Account.findOne({
    "resetToken.token": token,
    "resetToken.expires": { $get: Date.now() },
  });

  if (!account) throw "Invalid Token";

  account.passwordHash = hash(password);
  account.passwordReset = Date.now();
  account.resetToken = undefined;
  await account.save();
}

//CRUD Operations
//Get All & Get by Id
async function getAll() {
  const accounts = await db.Account.find();
  return accounts.map((x) => basicDetails(x));
}

async function getById(id) {
  const account = await getAccount(id);
  return basicDetails(account);
}

//Create

async function create(params) {
  if (await db.Account.findOne({ email: params.email })) {
    throw `Email ${params.email} is already registered`;
  }

  const account = new db.Account(params);
  account.verified = Date.now();
  account.passwordHash = hash(params.password);
  await account.save();
  return basicDetails(account);
}

//Update
async function update(id, params) {
  const account = await getAccount(id);

  //check if email has changed
  if (
    params.email &&
    account.email !== params.email &&
    (await db.Account.findOne({ email: params.email }))
  ) {
    throw 'Email "' + params.email + '" is already taken';
  }

  //if password entered/updated
  if (params.password) {
    params.passwordHash = hash(params.password);
  }

  Object.assign(account, params);
  account.updated = Date.now();
  await account.save();

  return basicDetails(account);
}

//Helper Functions
async function getAccount(id) {
  if (!db.isValidId(id)) throw "Account not found";
  const account = await db.Account.findById(id);

  if (!account) throw "Account not found";
  return account;
}

async function getRefreshToken(token) {
  const refreshToken = await db.RefreshToken.findOne({ token }).populate("account");
  if (!refreshToken || !refreshToken.isActive) throw "Invalid token";
  return refreshToken;
}

function hash(password) {
  return bcrypt.hashSync(password, 10);
}

//Jwt token with 15mins expiry period
function generateJwtToken(account, ipAddress) {
  return jwt.sign({ sub: account.id, id: account.id }, jwtSecret, { expiresIn: "15m" });
}

//Refresh token with 7 days expiry period
function generateRefreshToken(account, ipAddress) {
  return new db.RefreshToken({
    account: account.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress,
  });
}

function randomTokenString() {
  return crypto.randomBytes(40).toString("hex");
}

function basicDetails(account) {
  const { id, title, firstName, lastName, email, role, created, updated, isVerified } = account;
  return { id, title, firstName, lastName, email, role, created, updated, isVerified };
}

async function sendVerificationEmail(account, origin) {
  let message;

  if (origin) {
    const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
    message = `<p>Please click the below link to verify your email</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
  } else {
    message = `<p>Please click the below token to verify your email</p>
                   <p><code>${account.verificationToken}</code></p>`;
  }

  await sendEmail({
    to: account.email,
    subject: "Sign-up Verification Email",
    html: `<h4>Verify Email</h4>
               <p>Thanks for registering</p>
               ${message}`,
  });
  
}

async function sendAlreadyRegisteredEmail(email, origin) {
  let message;

  if (origin) {
    message = `<p>If you dont know your password please visit the <a href="${origin}/forgot-password">forgot password</a> page.</p>`;
  } else {
    message = `<p>If you dont know your password you can resit it via the <code>/account/forgot-password</code> api route</p>`;
  }

  await sendEmail({
    to: email,
    subject: "Email Already Registered",
    html: `<h4>Email Already Registered</h4>
           <p>Your email <strong>${email}</strong> is already registered</p>`,
  });
}

async function sendPasswordResetEmail(account, origin) {
  let message;
  if (origin) {
    const resetUrl = `${origin}/account/reset-password?token=${account.resetToken.token}`;
    message = `<p>Please click the below link to reset the pssword</p>
                  <p><a href="${resetUrl}">${resetUrl}</a></p>`;
  } else {
    message = `<p>Please use the token to reset your password <code></code>/account/reset-password</p>
        <p>${account.resetToken.token}</p>`;
  }

  await sendEmail({
    to: account.email,
    subject: "Reset Password Email",
    html: `<h4>Reset Password Link</h4><br>
                ${message}`,
  });
}
