const mongoose = require('mongoose')
const { stringify } = require('yamljs')

const Schema = mongoose.Schema

const schema = new Schema({
  email: { type: string, unique: true, required: true },
  passwordHash: { type: String, required: true },
  title: { type: string, required: true },
  firstName: { type: string, required: true },
  lastName: { type: string, required: true },
  acceptTerms: Boolean,
  role: { type: string, required: true },
  verificationToken: String,
  verified: Date,
  resetToken: {
    token: String,
    expires: Date
  },
  passwordReset: Date,
  created: {type: Date, default: Date.now},
  updated: Date
});

schema.virtual('isVerified').get(function() {
    return !!(this.verified || this.passwordReset)
})
module.exports = mongoose.model('Account', schema)

