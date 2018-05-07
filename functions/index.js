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

    const data = {
        token: req.header('authorization')
    };

    cors(req,res,() => {
        if(!data.token){
            return res.status(403).send(ErrorService.invalidToken("No token",""))
        }

        LoginService.getUidWithToken(data.token)
        .then(uid => {
            return SpotsService.getAllParkingSpots()
        })
        .then(spots => {
            return res.status(200).send(spots)
        })
        .catch(error => {
            console.log(error);
            return res.status(400).send(ErrorService.noParkingSpots(error))
        })
        .catch(error => {
            console.log(error);
            res.status(403).send(ErrorService.invalidToken(error,data.token))
        })
    })
});

exports.verifyIdToken = functions.https.onRequest((req,res) => {
    const data = {
        token: req.header('authorization')
    };

    cors(req,res,() => {
        LoginService.getUidWithToken(data.token)
            .then(uid => {
                return res.status(200).send(uid)
            })
            .catch(error => {
                console.log(error);
                res.status(403).send(ErrorService.invalidToken(error,data.token))
            })
    })
});