function createUser () {
    return `INSERT INTO T_USER (first_name, last_name, username, pass, balance,token)
            VALUES ($1, $2, $3, $4, $5, $6)`;

}

function checkIfUserExist() {
    return `SELECT * FROM T_USER WHERE username=$1`;
}

function checkUsernameAndPass() {
    return `SELECT token FROM T_USER WHERE username=$1 AND pass=$2`;
}
module.exports = {
    createUser,
    checkIfUserExist,
    checkUsernameAndPass
}