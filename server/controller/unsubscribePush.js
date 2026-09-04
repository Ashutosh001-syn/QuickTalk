const UserModel = require('../models/UserModel');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');

async function unsubscribePush(request, response) {
    try {
        const token = request.cookies.token || "";
        const user = await getUserDetailsFromToken(token);

        if (!user || user.logout) {
            return response.status(401).json({
                message: "Unauthorized",
                error: true
            });
        }

        const { endpoint } = request.body;

        if (endpoint) {
            await UserModel.updateOne(
                { _id: user._id },
                { $pull: { pushSubscriptions: { endpoint: endpoint } } }
            );
        }

        return response.status(200).json({
            message: "Successfully unsubscribed",
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = unsubscribePush;
