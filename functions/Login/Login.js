const admin = require('firebase-admin');

exports.getUidWithToken = (token) => {
    return admin.auth().verifyIdToken(token)
        .then(user => {
            return user.uid
        })
        .catch(error => {
            console.log(error);
            return error
        })
};

exports.setUser = (uid,user) => {
    return admin.firestore().collection('users').doc(uid).set(user,{merge: true})
        .then(result => {
            return result
        })
        .catch(error => {
            console.log(error);
            throw error
        })
};