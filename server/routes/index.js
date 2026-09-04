const express = require('express')
const registerUser = require('../controller/registerUser')
const checkEmail = require('../controller/checkEmail')
const checkPassword = require('../controller/checkPassword')
const userDetails = require('../controller/userDetails')
const logout = require('../controller/logout')
const updateUserDetails = require('../controller/updateUserDetails')
const getUsers = require('../controller/getUsers')
const sendMessage = require('../controller/sendMessage')
const getMessages = require('../controller/getMessages')
const deleteChat = require('../controller/deleteChat')
const sendFriendRequest = require('../controller/sendFriendRequest')
const respondFriendRequest = require('../controller/respondFriendRequest')
const getFriendRequests = require('../controller/getFriendRequests')
const searchUsers = require('../controller/searchUsers')
const subscribePush = require('../controller/subscribePush')
const unsubscribePush = require('../controller/unsubscribePush')
const changePassword = require('../controller/changePassword')

const router = express.Router()

router.post('/register', registerUser)
router.post('/email', checkEmail)
router.post('/password', checkPassword)
router.get('/user-details', userDetails)
router.get('/logout', logout)
router.post('/update-user', updateUserDetails)

router.get('/users', getUsers)
router.post('/message', sendMessage)
router.get('/messages/:userId', getMessages)
router.delete('/delete-chat/:userId', deleteChat)

// Friend Request System
router.post('/friend-request', sendFriendRequest)
router.post('/friend-request/respond', respondFriendRequest)
router.get('/friend-requests', getFriendRequests)
router.get('/search-users', searchUsers)

// Web Push Subscriptions
router.post('/subscribe-push', subscribePush)
router.post('/unsubscribe-push', unsubscribePush)

// Profile
router.post('/change-password', changePassword)

module.exports = router
