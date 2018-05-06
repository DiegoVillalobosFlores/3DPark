const admin = require('firebase-admin');

exports.getAllParkingSpots = function () {
    return admin.firestore().collection('spots').get()
        .then(spotsSnapshot => {
            const spots = [];
            spotsSnapshot.forEach(spotRef => {
                const spot = spotRef.data();
                spot.id = spotRef.id;
                spots.push(spot)
            });
            return spots
        })
        .catch(error => {
            console.log(error);
            throw error
        })
};