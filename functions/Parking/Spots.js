const admin = require('firebase-admin');
const request = require('request-promise');
const mapsUrl = 'https://maps.googleapis.com/maps/api/directions/json';
const mapsKey = 'AIzaSyAqKjmYQJ3mTTgbdv4hRFgvV2bw9HgNOZA';

const collections = {
    spots: 'spots',
    cities: 'cities'
};

exports.getAllParkingSpots = function (city) {
    const query = admin.firestore().collection(collections.spots);
    if(city){
        query.where('city','==',city);
    }
    return query.get()
    .then(spotsSnapshot => {
        const spots = [];
        spotsSnapshot.forEach(spotRef => {
            const spot = spotRef.data();
            const now = new Date();
            let hours = now.getHours() - 5;
            console.log("HOURS",hours);
            spot.id = spotRef.id;
            if(hours < 0){
                hours = 24 - hours;
            }
            if(hours > 5 && hours < 14){
                spot.fares.current = spot.fares.day
            }
            if(hours >= 14 && hours < 20){
                spot.fares.current = spot.fares.afternoon
            }
            if((hours >= 20 && hours < 23) || (hours => 0 && hours <= 5)){
                spot.fares.current = spot.fares.night
            }
            spots.push(spot)
        });
        return spots
    })
    .catch(error => {
        console.log(error);
        throw error
    })
};

exports.estimateTimeToSpot = function(from,to) {
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

exports.getNearbySpots = function(from,maxDistance) {
    const spots = [];
    return admin.firestore().collection(collections.spots).where('city','==',from.city).get()
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
                        if(distance < maxDistance){
                            const directions = {
                                route: route
                            };
                            directions.route.leg = leg;
                            const spot = spots[dirIndex];
                            spot.directions = directions;
                            nearbySpots.push(spot)
                        }
                    });
                    if(!spots[dirIndex].directions){
                        spots.splice(0,dirIndex)
                    }
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