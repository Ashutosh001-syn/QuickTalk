const express = require('express')
const registerUser = require('../controller/registerUser')
const checkEmail = require('../controller/checkEmail')
const checkPassword = require('../controller/checkPassword')
const userDetails = require('../controller/userDetails')
const logout = require('../controller/logout')
const updateUserDetails = require('../controller/updateUserDetails')

const router = express.Router()

router.post('/register',registerUser)

router.post('/email',checkEmail)

router.post('/password',checkPassword)

router.get('/user-details',userDetails)

router.get('/logout',logout)

router.post('/update-user',updateUserDetails)

const getUsers = require('../controller/getUsers')
const sendMessage = require('../controller/sendMessage')
const getMessages = require('../controller/getMessages')
const deleteChat = require('../controller/deleteChat')

router.get('/users', getUsers)
router.post('/message', sendMessage)
router.get('/messages/:userId', getMessages)
router.delete('/delete-chat/:userId', deleteChat)

module.exports = router
