const admin = require('firebase-admin');
const request = require('request-promise');
const mapsUrl = 'https://maps.googleapis.com/maps/api/directions/json';
const mapsKey = 'AIzaSyAqKjmYQJ3mTTgbdv4hRFgvV2bw9HgNOZA';
const Logic = require('es6-fuzz/lib/logic');
const Trapezoid = require('es6-fuzz/lib/curve/trapezoid');
const Grade = require('es6-fuzz/lib/curve/grade');

const ErrorService = require('../Errors/Errors');

const collections = {
    spots: 'spots',
    cities: 'cities'
};

function calculateCurrentFare (spot) {
    const now = new Date();
    let hours = now.getHours() - 5;

    let logic = new Logic();
    let res = logic.init(spot.fares.night,new Trapezoid(0,0,3,6))
        .and(spot.fares.day,new Trapezoid(5,10,12,14))
        .and(spot.fares.afternoon,new Trapezoid(13,15,19,20))
        .and(spot.fares.night,new Trapezoid(18,20,22,24))
        .defuzzify(hours);

    console.log("RES FUZZY",res);

    return res.defuzzified;
   /* if(hours < 0){
        hours = 24 + hours;
    }
    console.log("NEW HOURS",hours);
    if(hours > 5 && hours < 14){
        return spot.fares.day
    }
    if(hours >= 14 && hours < 20){
        return spot.fares.afternoon
    }
    if((hours >= 20 && hours <= 23) || (hours => 0 && hours <= 5)){
        return spot.fares.night
    }*/
}

exports.getUserSpots = (from,uid) => {
    const query = admin.firestore().collection(collections.spots);
    query.where('owner','==',uid);
    const spots = [];
    return query.where('available','==',true).get()
        .then(spotsSnapshot => {
            const promises = [];
            spotsSnapshot.forEach(spotRef => {
                const spot = spotRef.data();
                spot.id = spotRef.id;
                spot.fares.current = calculateCurrentFare(spot);
                spots.push(spot);
                const spotCoordinates = spot.coordinates._latitude + "," + spot.coordinates._longitude;
                promises.push(this.estimateTimeToSpot(from.coordinates,spotCoordinates))
            });
            return Promise.all(promises)
        })
        .then(responses => {
            responses.forEach((response,dirIndex) => {
                const directions = {
                    route: response.routes[0]
                };
                directions.route.leg = response.routes[0].legs[0];
                spots[dirIndex].directions = directions
            });
            return spots
        })
        .catch(error => {
            console.log(error);
            error.status = 400;
            error.message = 'No spots in city';
            error['city'] = from.city;
            throw error
        })
};

exports.getAllParkingSpots = (from) => {
    const query = admin.firestore().collection(collections.spots);
    if(from.city){
        query.where('city','==',from.city);
    }
    const spots = [];
    return query.where('available','==',true).get()
        .then(spotsSnapshot => {
            const promises = [];
            spotsSnapshot.forEach(spotRef => {
                const spot = spotRef.data();
                spot.id = spotRef.id;
                spot.fares.current = calculateCurrentFare(spot);
                spots.push(spot);
                const spotCoordinates = spot.coordinates._latitude + "," + spot.coordinates._longitude;
                promises.push(this.estimateTimeToSpot(from.coordinates,spotCoordinates))
            });
            return Promise.all(promises)
        })
        .then(responses => {
            responses.forEach((response,dirIndex) => {
                const directions = {
                    route: response.routes[0]
                };
                directions.route.leg = response.routes[0].legs[0];
                spots[dirIndex].directions = directions
            });
            return spots
        })
        .catch(error => {
            console.log(error);
            error.status = 400;
            error.message = 'No spots in city';
            error['city'] = from.city;
            throw error
        })
};

exports.estimateTimeToSpot = (from,to) => {
    const options = {
        url: mapsUrl,
        qs: {
            origin: from,
            destination: to,
            key: mapsKey
        },
        json: true
    };
    return request(options)
        .then(response => {
            return response
        })
        .catch(error => {
            console.log(error);
            return error
        })
};

exports.getNearbySpots = (from,range) => {
    const spots = [];
    return admin.firestore().collection(collections.spots).where('address.city','==',from.city).where('available','==',true).get()
        .then(spotsSnapshot => {
            const promises = [];
            spotsSnapshot.forEach(spotRef => {
                const spot = spotRef.data();
                spot.id = spotRef.id;
                spots.push(spot);
                const spotCoordinates = spot.coordinates._latitude + "," + spot.coordinates._longitude;
                promises.push(this.estimateTimeToSpot(from.coordinates,spotCoordinates))
            });
            return Promise.all(promises)
        })
        .then(responses =>{
            const nearbySpots = [];
            responses.forEach((response,dirIndex) => {
                response.routes.forEach(route => {
                    route.legs.forEach(leg => {
                        const distance = leg.distance.value;
                        if(distance < range){
                            const directions = {
                                route: route
                            };
                            directions.route.leg = leg;
                            const spot = spots[dirIndex];
                            spot.directions = directions;
                            spot.fares.current = calculateCurrentFare(spot);
                            nearbySpots.push(spot)
                        }
                    });
                })
            });
            return nearbySpots
        })
        .catch(error => {
            console.log(error);
            return error
        })

};

exports.getAvailableCities = () => {
    return admin.firestore().collection(collections.cities).get()
        .then(citiesSnapshot => {
            const cities = [];
            citiesSnapshot.forEach(cityRef => {
                const city = cityRef.data();
                city.id = cityRef.id;
                cities.push(city)
            });
            return cities
        })
        .catch(error => {
            console.log(error);
            return error
        })
};

exports.reserveSpot = (spot,reservation) => {
    const spotRef = admin.firestore().collection('spots').doc(spot);
    const userRef = admin.firestore().collection('users').doc(reservation.uid);
    let spotRes = {};
    return spotRef.set({available: false},{merge: true})
        .then( () => {
            return spotRef.collection('reservations').add(reservation);
        })
        .then( (response) => {
            spotRes.reservation = response.id;
            const userReservation = reservation;
            userReservation.spot = spot;
            return userRef.collection('reservations').add(userReservation);
        })
        .then(response => {
            spotRes.userReservation = response.id;
            return spotRes;
        })
        .catch(error => {
            console.log(error);
            throw error
        })
};

exports.addSpot = (spot) => {
    return admin.firestore().collection('spots').add(spot)
        .then(response => {
            return response.id;
        })
        .catch(error => {
            console.log(error);
            const Error = error;
            Error.status = 400;
            throw Error
        })
};