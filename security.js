var Security = function (config) {
    var users = config.users || [];

    function isAllowed(userId) {
        return users.some(function (user) {
            return user.id === userId && user.isEnabled;
        });
    }

    function isAdmin(userId) {
        return users.some(function (user) {
            return user.id === userId && user.isAdmin;
        });
    }

    return {
        isAllowed: isAllowed,
        isAdmin: isAdmin,
        users: users
    };
};

module.exports = Security;