const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin:true});
const serviceAccount = require('./firebaseAdminSDKKey');

const ErrorService = require('./Errors/Errors');
const LoginService = require('./Login/Login');
const SpotsService = require('./Parking/Spots');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://dpark-4c6f8.firebaseio.com"
});

exports.createUserAccount = functions.auth.user().onCreate((data) => {
    const uid = data.uid;
    const user = {
        email: data.email,
        name: data.displayName,
        disabled: false,
        joined: new Date()
    };

    return LoginService.setUser(uid,user)
});

exports.getAllParkingSpots = functions.https.onRequest((req,res) => {
    cors(req,res,() => {
        SpotsService.getAllParkingSpots()
            .then(spots => {
                return res.status(200).send(spots)
            })
            .catch(error => {
                console.log(error);
                res.status(400).send(ErrorService.noParkingSpots(error))
            })
    })
});