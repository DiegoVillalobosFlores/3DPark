const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin:true});
const serviceAccount = require('./firebaseAdminSDKKey');

const ErrorService = require('./Errors/Errors');
const LoginService = require('./User/Login');
const SpotsService = require('./Parking/Spots');
const ScoreService = require('./Scores/Users');
const UsersService = require('./User/Users');

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
        joined: new Date(),
        photo: "",
        score: "SS",
    };

    return LoginService.setUser(uid,user)
});

exports.getAllParkingSpots = functions.https.onRequest((req,res) => {

    const data = {
        token: req.header('authorization'),
        from: {
            coordinates: req.query.coordinates,
            city: req.query.city
        }
    };

    cors(req,res,() => {
        if(!data.token){
            return res.status(403).send(ErrorService.invalidToken("No token",""))
        }

        LoginService.getUidWithToken(data.token)
        .then(uid => {
            return SpotsService.getAllParkingSpots(data.from)
        })
        .then(spots => {
            return res.status(200).send(spots)
        })
        .catch(error => {
            console.log(error);
            res.status(error.status).send(error)
        })
    })
});

exports.estimateTimeToSpot = functions.https.onRequest((req,res) => {
    const data = {
        token: req.header('authorization'),
        from: req.query.from,
        to: req.query.to,
    };

    cors(req,res, () => {
        SpotsService.estimateTimeToSpot(data.from,data.to)
            .then(response => {
                return res.status(200).send(response)
            })
            .catch(error => {
                console.log(error);
                res.send(400).send(ErrorService.invalidCoordinates(error))
            })
    })
});

exports.reserveSpot = functions.https.onRequest((req,res) => {
    const data = {
        token: req.header('authorization'),
        hours: req.query.hours,
        spot: req.query.spot,
    };

    cors(req,res,() => {
        LoginService.getUidWithToken(data.token)
            .then(uid => {
                const date = new Date();
                const toDate = date;
                toDate.setHours(date.getHours() + data.hours);
                data.reservation = {
                    uid: uid,
                    from: date,
                    to: toDate,
                };
                data.reservation.uid = uid;
                return SpotsService.reserveSpot(data.spot,data.reservation)
            }).then(response => {
                return res.status(200).send({ok: response})
            })
            .catch(error => {
                console.log(error);
                return res.status(400).send(error)
            });
    })
});

exports.getUserSpots = functions.https.onRequest((req,res) => {
    const data = {
        token: req.header('authorization'),
        from: {
            coordinates: req.query.coordinates,
            city: req.query.city
        }
    };

    cors(req,res,() => {
        if(!data.token){
            return res.status(403).send(ErrorService.invalidToken("No token",""))
        }

        LoginService.getUidWithToken(data.token)
            .then(uid => {
                return SpotsService.getAllParkingSpots(data.from,uid)
            })
            .then(spots => {
                return res.status(200).send(spots)
            })
            .catch(error => {
                console.log(error);
                res.status(error.status).send(error)
            })
    })
});

exports.addSpot = functions.https.onRequest((req,res) => {
    const data = {
        token: req.header('authorization'),
        spot: req.body.spot
    };

    cors(req,res,() => {
        LoginService.getUidWithToken(data.token)
            .then(uid => {
                data.spot.owner = uid;
                data.spot.score = "SS";
                data.spot.photo = "https://firebasestorage.googleapis.com/v0/b/dpark-4c6f8.appspot.com/o/spots%2FGarage-View.jpg?alt=media&token=75087f51-2f93-4232-89da-23f0aecd2284";
                data.spot.available = true;
                return SpotsService.addSpot(data.spot)
            })
            .then(response => {
                return res.status(200).send(response)
            })
            .catch(error => {
                return res.status(error.status).send(error)
            })
    })
});

exports.getUserReservations = functions.https.onRequest((req,res) => {
    const data = {
        token: req.header('authorization')
    };

    cors(req,res,() => {
        LoginService.getUidWithToken(data.token)
            .then(uid => {
                return UsersService.getUserReservations(uid)
            })
            .then(reservations => {
                return res.status(200).send(reservations)
            })
            .catch(error => {
                console.log(error);
                return res.status(error.status).send(error)
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

exports.getNearbySpots = functions.https.onRequest((req,res) => {
    const data = {
        token: req.header('authorization'),
        from: {
            coordinates: req.query.coordinates,
            city: req.query.city
        },
        range: req.query.range
    };

    cors(req,res, () => {
        SpotsService.getNearbySpots(data.from,data.range)
            .then(response => {
                return res.status(200).send(response)
            })
            .catch(error => {
                console.log(error);
                res.status(400).send({error: {message: 'No nearby spots in that city'}})
            })
    })
});

exports.getAvailableCities = functions.https.onRequest((req,res) => {
    const data = {
        token: req.header('authorization')
    };

    cors(req,res, () => {
        return LoginService.getUidWithToken(data.token)
            .then(uid => {
                if(uid){
                    return SpotsService.getAvailableCities()
                }
                throw new Error('Invalid Token')
            })
            .then(response => {
                return res.status(200).send(response)
            })
            .catch(error => {
                console.log(error);
                res.send( new functions.https.HttpsError('not-found','Not found',error))
            })
    })
});

exports.rateUser = functions.https.onRequest((req,res) => {
    const data = {
        token: req.header('authorization'),
        score: req.body.score,
        uid: req.query.uid
    };

    cors(req,res,() => {
        return ScoreService.rateUser(data.uid,data.score)
            .then(response => {
                return res.status(200).send(response)
            })
            .catch(error => {
                console.log(error);
                return res.status(error.status).send(error)
            })
    })
});

exports.getUserData = functions.https.onRequest((req,res) => {
    const data = {
        token: req.header('authorization'),
        vehicles: req.query.vehicles,
    };

    let user = {};
    let uid;

    cors(req,res,() => {
        return LoginService.getUidWithToken(data.token)
        .then(uid => {
            this.uid = uid;
            return UsersService.getUserData(uid)
        })
        .then(userData => {
            user = userData;
            console.log("UID",uid);
            if(data.vehicles){
                return UsersService.getUserCars(user.uid);
            }
            return res.status(200).send(user)
        })
        .then(vehiclesData=> {
            user.vehicles = vehiclesData;
            return res.status(200).send(user)
        })
        .catch(error => {
            console.log(error);
            return res.status(error.status).send(error)
        })

    });
});