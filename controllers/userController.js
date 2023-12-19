require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("../config/dbConnection");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");


const transport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });


  const userRegistration = async (req, res) => {
    let conn; // Declare the connection variable outside the try-catch block.
    try {
        const {email,password,firstname,lastname,middlename,extention,gender,birthday,age} = req.body;
        const {image} = req.files
      conn = await db.getConnection();
      const [existingUser] = await conn.query(
        `SELECT * FROM user_login WHERE LOWER(email) = LOWER(?);`,
        [email]
      );
  
      if (existingUser.length > 0) {
        // Check if there are existing users with the same email.
        return res.status(409).json({
          msg: "This Email is already in use.",
        });
      } else {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUserResult = await conn.query(
          'INSERT INTO user_login(email,password,created)VALUES(?,?,now())',
          [email, hashedPassword]
        );
        console.log(newUserResult)
        console.log(image)
  
        await conn.query("INSERT INTO user_info(user_id,firstname,lastname,middlename,extention,gender,birthday,age,created)VALUES(?,?,?,?,?,?,?,?,now());", [
          newUserResult[0].insertId,firstname,lastname,middlename,extention,gender,birthday,age
        ]);
        await conn.query('INSERT INTO user_profile(user_id,image,created)VALUES(?,?,now())',[
            newUserResult[0].insertId,`images/${image[0].originalname}`
        ])
        // Insert the new user into the database
  
        // Ensure there is an insertId in the result
        if (!newUserResult[0].insertId) {
          return res.status(500).json({
            msg: "Failed to insert user data.",
          });
        }
  
        const verificationToken = generateToken(newUserResult[0].insertId);
  
        const verificationLink = `${process.env.ORIGIN_HOST}/verificationAccount/${verificationToken}`;
  
        const mailOptions = {
          from: process.env.MAIL_USER,
          to: email,
          subject: "Account Verification",
          text: `To verify your account, click on the following link: ${verificationLink}`,
        };
  
        transport.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error sending email:", error);
          } else {
            console.log("Email sent:", info.response);
          }
        });
        return res.status(200).json({
          msg: "The user has been registered with us.",
          Token: verificationToken,
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Internal Server Error",
      });
    } finally {
      if (conn) {
        conn.release();
      }
    }
  };

  const login = async (req, res) => {
    let conn;
  
    try {
        const {email,password} = req.body;
      conn = await db.getConnection();
  
      const [user] = await conn.query(
        `SELECT * from user_login WHERE email = ?`,
        [email]
      );
  
      if (!user) {
        return res.status(401).json({
          msg: "Email is incorrect",
        });
      }
  
      const hashedPassword = user[0].password; // Retrieve hashed password from the database
  
      if (!hashedPassword) {
        return res.status(404).json({
          msg: "Account is not Registered",
        });
      }
  
      const passwordMatch = await bcrypt.compare(
        password,
        hashedPassword
      );
  
      if (!passwordMatch) {
        return res.status(401).json({
          msg: "Password is incorrect",
        });
      }
  
      const accessToken = generateAccessToken(user);
  
      // Generate a refresh token with a longer expiration time
      const refreshToken = jwt.sign(
        { id: user[0].id },
        process.env.REFRESH_TOKEN,
        { expiresIn: "7d" }
      );
  
      // Store the refresh token in your database
      await conn.query(
        `INSERT INTO tokens (user_id, token, flag) VALUES (?, ?, 1);`,
        [user[0].id, refreshToken]
      );
  
      // Update last logged in time
      await conn.query(
        `UPDATE user_login SET  status = 1 WHERE id = ?;`,
        [user[0].id]
      );
  
      return res.status(200).json({
        msg: "Logged in",
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: {
          id: user[0].id,
          email: user[0].email,
          is_verified: user[0].is_verified,
          status: user[0].status,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Account is Not Registered",
      });
    } finally {
      if (conn) {
        conn.release();
      }
    }
  };

const generateToken = (user) => {
    return jwt.sign({ id: user }, process.env.ACCESS_TOKEN, { expiresIn: "24h" });
  };
  
  const generateAccessToken = (user) => {
    return jwt.sign({ id: user[0].id }, process.env.ACCESS_TOKEN, {
      expiresIn: "30m",
    });
  };

  const Token = async (req, res) => {
    let conn;
  
    try {
      conn = await db.getConnection();
      const authHeaders = req.headers["authorization"]; // Use lowercase 'authorization'
      const token = authHeaders && authHeaders.split(" ")[1];
  
      if (token === null) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const [refreshTokenResult] = await conn.query(
        'SELECT * FROM tokens WHERE token = ?',
        [token]
      );
  
      if (!refreshTokenResult || refreshTokenResult.length === 0) {
        return res.status(401).json({
          msg: "Invalid token",
        });
      }
  
      const refreshToken = refreshTokenResult[0].token;
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
      const [user] = await conn.query('SELECT * FROM user_login WHERE id = ?', [
        decoded.id,
      ]);
  
      if (!user) {
        return res.status(403).json({
          msg: "User Not Found",
        });
      }
  
      // Generate a new access token
      const accessToken = generateAccessToken(user);
  
      return res.status(200).json({
        accessToken: accessToken,
        user: {
          id: user[0].id,
          email: user[0].email,
          is_verified: user[0].is_verified,
          status: user[0].status,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Internal Server Error",
      });
    } finally {
      if (conn) {
        conn.release();
      }
    }
  };

  const logout = async (req, res) => {
    let conn;
    try {
      conn = await db.getConnection();
      const { id } = req.body;
      const removeTokenResult = await conn.query(
        `DELETE FROM tokens WHERE user_id = ?;`,
        [id]
      );
      const updateLogin = await conn.query(
        `UPDATE user_login SET status = 0 WHERE id = ?`,
        [id]
      );
      if (!removeTokenResult && !updateLogin) {
        return res.status(400).json({
          msg: "Error Logout",
        });
      }
  
      return res.status(200).json({
        msg: "Logout Successfully",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Internal Server Error",
      });
    } finally {
      if (conn) {
        conn.release();
      }
    }
  };

  const forgot_password = async (req, res) => {
    let conn;
    try {
      const { email } = req.body;
      conn = await db.getConnection();
  
      const query1 = "SELECT * FROM user_login WHERE email = ?";
      const [result1] = await conn.query(query1, [email]);
      if (result1) {
        const verificationToken = generateToken(result1[0].id);
  
        const verificationLink = `${process.env.ORIGIN_HOST}/changeForgotPass/${verificationToken}`;
  
        const mailOptions = {
          from: process.env.MAIL_USER,
          to: req.body.email,
          subject: "Forgot Password",
          text: `To change your account Password, click on the following link: ${verificationLink}`,
        };
  
        transport.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error sending email:", error);
          } else {
            console.log("Email sent:", info.response);
          }
        });
        return res.status(200).json({
          msg: "Goto your email and click the link for change New Password.",
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Internal Server Error",
      });
    } finally {
      if (conn) {
        conn.release();
      }
    }
  };
  const change_forgot_password = async (req, res) => {
    let conn;
    const { password } = req.body;
    try {
      conn = await db.getConnection();
      const query1 = "UPDATE user_login SET password =? WHERE id = ?";
      const authHeaders = req.headers["authorization"]; // Use lowercase 'authorization'
      const token = authHeaders && authHeaders.split(" ")[1];
  
      if (token === null) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
      if (decoded) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result1 = conn.query(query1, [hashedPassword, decoded.id]);
        if (result1) {
         return res.status(200).json({
            msg: "your Password has been Change please Proceed to the log in page",
          });
        }
        return res.status(404).json({
          msg: "Your account is not found",
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Internal Server Error",
      });
    } finally {
      if (conn) {
        conn.release();
      }
    }
  };

  const sendEmailtoVerify = async (req, res) => {
    let conn;
    try {
      conn = await db.getConnection();
      const authHeaders = req.headers['authorization']; // Use lowercase 'authorization'
    const token = authHeaders && authHeaders.split(' ')[1]
  
    if(token != null){
     const decoded =  jwt.verify(token, process.env.ACCESS_TOKEN)
     const verificationToken = generateToken(decoded.id)
    const [user] = await conn.query('SELECT * FROM user_login WHERE id = ?',[
      decoded.id
    ])
  
    const verificationLink = `${process.env.ORIGIN_HOST}/verificationAccount/${verificationToken}`;
  
    const mailOptions = {
      from: process.env.MAIL_USER,
      to: user[0].email,
      subject: "Account Verification",
      text: `To verify your account, click on the following link: ${verificationLink}`,
    };
  
    transport.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
    return res.status(200).json({
      msg: "The check your Email. Please verify your account.",
    });
    }else{    
      return res.status(404).json({
        msg:'Token is not Available'
      })
    }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Internal Server Error",
      });
    } finally {
      if (conn) {
        conn.release();
      }
    }
  };
  const verifyEmail = async (req, res) => {
    let conn;
    try {
      conn = await db.getConnection();
      const authHeaders = req.headers['authorization']; // Use lowercase 'authorization'
      const token = authHeaders && authHeaders.split(' ')[1]
    
      if(token != null){
       const decoded =  jwt.verify(token, process.env.ACCESS_TOKEN)
      const [user] = await conn.query('SELECT * FROM user_login WHERE id = ?',[
        decoded.id
      ])
      const query1 = "UPDATE user_login SET is_verified = 1 WHERE id = ?";
        const result2 = await conn.query(query1, [decoded.id]);
  
        if (result2[0].affectedRows > 0) {
            return res.status(200).json({
              msg: "Email Successfully Verified",
            });
      } else {
        return res.status(404).json({
          msg: "Error",
        });
      }
    }
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        msg: "Internal Server Error",
      });
    } finally {
      if (conn) {
        conn.release();
      }
    }
  };
  

  module.exports = {
    userRegistration,
    login,
    forgot_password,
    Token,
    change_forgot_password,
    sendEmailtoVerify,
    logout,
    verifyEmail
  }