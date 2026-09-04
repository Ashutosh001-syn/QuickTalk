const UserModel = require('../models/UserModel');
const getUserDetailsFromToken = require('../helpers/getUserDetailsFromToken');

async function subscribePush(request, response) {
    try {
        const token = request.cookies.token || "";
        const user = await getUserDetailsFromToken(token);

        if (!user || user.logout) {
            return response.status(401).json({
                message: "Unauthorized",
                error: true
            });
        }

        const { subscription } = request.body;

        if (!subscription) {
            return response.status(400).json({
                message: "Missing subscription object",
                error: true
            });
        }

        // Add subscription to user if it doesn't already exist
        const dbUser = await UserModel.findById(user._id);
        
        // Ensure pushSubscriptions exists (for backward compatibility if old users don't have it)
        if (!dbUser.pushSubscriptions) {
            dbUser.pushSubscriptions = [];
        }

        // Check if this specific subscription endpoint already exists
        const exists = dbUser.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
        
        if (!exists) {
            dbUser.pushSubscriptions.push(subscription);
            await dbUser.save();
        }

        return response.status(200).json({
            message: "Successfully subscribed to push notifications",
            success: true
        });

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports = subscribePush;
