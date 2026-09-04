const getUserDetailFromToken = require("../helpers/getUserDetailsFromToken")
const UserModel = require("../models/UserModel")
const bcryptjs = require('bcryptjs')

async function changePassword(request, response) {
    try {
        const token = request.cookies.token || ""
        const user = await getUserDetailFromToken(token)

        if (!user || user.logout) {
            return response.status(401).json({
                message: "Unauthorized",
                error: true
            })
        }

        const { currentPassword, newPassword } = request.body

        if (!currentPassword || !newPassword) {
            return response.status(400).json({
                message: "Please provide current and new password",
                error: true
            })
        }

        if (newPassword.length < 6) {
            return response.status(400).json({
                message: "New password must be at least 6 characters",
                error: true
            })
        }

        // Verify current password
        const dbUser = await UserModel.findById(user._id)
        const isMatch = await bcryptjs.compare(currentPassword, dbUser.password)

        if (!isMatch) {
            return response.status(400).json({
                message: "Current password is incorrect",
                error: true
            })
        }

        // Hash new password and save
        const salt = await bcryptjs.genSalt(10)
        const hashedPassword = await bcryptjs.hash(newPassword, salt)

        await UserModel.updateOne({ _id: user._id }, { password: hashedPassword })

        return response.json({
            message: "Password changed successfully",
            success: true
        })

    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true
        })
    }
}

module.exports = changePassword
