const admin = require('firebase-admin');
const request = require('request-promise');
const mapsUrl = 'https://maps.googleapis.com/maps/api/directions/json';
const mapsKey = 'AIzaSyAqKjmYQJ3mTTgbdv4hRFgvV2bw9HgNOZA';

const ErrorService = require('../Errors/Errors');

const collections = {
    spots: 'spots',
    cities: 'cities'
};

function calculateCurrentFare (spot) {
    const now = new Date();
    let hours = now.getHours() - 5;

    if(hours < 0){
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
    }
}

exports.getAllParkingSpots = (city) => {
    const query = admin.firestore().collection(collections.spots);
    if(city){
        query.where('city','==',city);
    }
    return query.get()
    .then(spotsSnapshot => {
        const spots = [];
        spotsSnapshot.forEach(spotRef => {
            const spot = spotRef.data();

            spot.id = spotRef.id;

            spot.fares.current = calculateCurrentFare(spot);
            spots.push(spot)
        });
        return spots
    })
    .catch(error => {
        console.log(error);
        error.status = 400;
        error.message = 'No spots in city';
        error['city'] = city;
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
    return admin.firestore().collection(collections.spots).where('address.city','==',from.city).get()
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