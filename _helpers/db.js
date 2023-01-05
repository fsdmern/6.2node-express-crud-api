const mongoose = require("mongoose");

const connectionOptions = {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
};

mongoose.connect(process.env.MONGODB_URI || connectionOptions)

module.exports = {
    Account:,
    RefresToken: ,
    isValidId
}

function isValidId(id) {
    return mongoose.Types.ObjectId.isValid(id)
}