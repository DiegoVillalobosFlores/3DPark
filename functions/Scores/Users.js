const admin = require('firebase-admin');

const ErrorService = require('../Errors/Errors');
const collections = require('../Collections').Collections;

exports.rateUser = (uid,score) => {
    return admin.firestore().collection(collections.users).doc(uid).collection(collections.scores).add(score)
        .then(response => {
            console.log(response);
            return {
                ok: {
                    message: 'Added score to user with id',
                    id: response.id,
                    score: score
                }
            }
        })
};