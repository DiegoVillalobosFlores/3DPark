function formatError(error,field,value,message) {
    const formatedError = {
        error: {
            message: message,
            error: error
        }
    };
    if(field){
        formatedError[field] = field;
        formatedError[value] = value;
    }
    return formatedError
}

exports.noParkingSpots = (error) => {
    return formatError(error,{},{},'No se encontraron 3DSpots')
};

exports.invalidToken = (error,token) => {
    return formatError(error,'token',token,'Invalid token')
};