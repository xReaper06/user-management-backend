const express = require('express')
const router = express.Router();
const path = require('path')
const multer = require('multer')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/images'); // Adjust the destination folder as needed
    },
    filename: function (req, file, cb) {
      cb(null,file.originalname);
    },
  });
  const fileFilter = (req, file, cb) => {
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/png'
    ) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  };

  const upload = multer({ storage: storage, fileFilter: fileFilter });

  const userController = require('../controllers/userController')
  const mainController = require('../controllers/mainController')
const TokenValidity = require('../middleware/tokenValidition')

router.post('/userRegistration',upload.fields([
    {name:'image',maxCount:1}
]),
userController.userRegistration)
router.post('/login',userController.login);
router.post('/forgot-password',userController.forgot_password);
router.post('/change-forgot-pass',userController.change_forgot_password);
router.post('/logout',userController.logout);
router.post('/refresh-token',userController.Token);
router.post('/verify-acc',userController.verifyEmail);
router.post('/send-email-verification',userController.sendEmailtoVerify);
//maincontroller

router.get('/getProfile',TokenValidity.verifyToken,mainController.getProfile)
router.get('/getInfo',TokenValidity.verifyToken,mainController.getInfo);
router.post('/updateInfo',TokenValidity.verifyToken,mainController.updateInfo)
router.post('/updateProfile',upload.fields([
  {name:'image',maxCount:1}
]),TokenValidity.verifyToken,mainController.updateProfile);
router.post('/changePass',TokenValidity.verifyToken,mainController.changePassword);
router.post('/insertTask',TokenValidity.verifyToken,mainController.insertTask)
router.post('/getTask',TokenValidity.verifyToken,mainController.getTask);
router.post('/doneTask',TokenValidity.verifyToken,mainController.doneTask);
router.post('/removeTask',TokenValidity.verifyToken,mainController.removeTask);



  module.exports = router;