const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin:true});
const serviceAccount = require('./firebaseAdminSDKKey');

const LoginService = require('./Login/Login');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://dpark-4c6f8.firebaseio.com"
});

exports.getHelloWorld = functions.https.onRequest((req,res) => {
    const data = {
        message: req.query.message
    };

    cors(req,res,() => {
        res.status(200).send("Hello" + LoginService.getHelloWorld(data.message))
    })
});