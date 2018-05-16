const admin = require('firebase-admin');

exports.getUidWithToken = (token) => {
    return admin.auth().verifyIdToken(token)
        .then(user => {
            return user.uid
        })
        .catch(error => {
        const Error = error;
        Error.status = 403;
        console.log(Error);
        throw Error
        })
};

exports.setUser = (uid,user) => {
    return admin.firestore().collection('users').doc(uid).set(user,{merge: true})
        .then(result => {
            return result
        })
        .catch(error => {
            const Error = error;
            Error.status = 400;
            console.log(Error);
            throw Error
        })
};