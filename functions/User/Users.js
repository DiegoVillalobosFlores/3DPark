const admin = require('firebase-admin');

const Collections = require('../Collections').Collections();

exports.getUserCars = (uid) =>{
    return admin.firestore().collection(Collections.users).doc(uid).collection(Collections.vehicles).get()
        .then(vehiclesSnapshot => {
            const vehicles = [];
            vehiclesSnapshot.forEach(vehicleRef => {
                const vehicle = vehicleRef.data();
                vehicle.id = vehicleRef.id;
                vehicles.push(vehicle);
            });
            return vehicles
        })
        .catch(error => {
            const Error = error;
            Error.status = 400;
            throw Error
        })
};

exports.getUserReservations = (uid) => {
    const reservations = [];
    return admin.firestore().collection(Collections.users).doc(uid).collection('reservations').get()
        .then(reservationsSnapshot => {
            const promises = [];
            reservationsSnapshot.forEach(reservationRef => {
                const reservation = reservationRef.data();
                reservation.id = reservationRef.id;
                reservations.push(reservation);
                promises.push(admin.firestore().collection('spots').doc(reservation.spot).get())
            });
            return Promise.all(promises)
        })
        .then(spotsSnapshots => {
            console.log(spotsSnapshots);
            spotsSnapshots.forEach((spotRef,spotIndex) => {
                reservations[spotIndex].spot = spotRef.data()
            });
            return reservations
        })
        .catch(error => {
            const Error = error;
            Error.status = 400;
            throw Error
        })
};

exports.getUserData = (uid) => {
    console.log("Collections",Collections);
    return admin.firestore().collection(Collections.users).doc(uid).get()
        .then(userSnapshot => {
            const user = userSnapshot.data();
            user.uid = userSnapshot.id;
            return user;
        })
        .catch(error => {
            const Error = error;
            Error.status = 400;
            throw Error;
        })
};

exports.addUserVehicle = (uid,vehicle) => {
    return admin.firestore().collection(Collections.users).doc(uid).collection(vehicle).add()
};