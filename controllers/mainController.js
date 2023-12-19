require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("../config/dbConnection");

const getProfile = async(req,res)=>{
    let conn;
    try {
        const {id} = req.user;
        conn = await db.getConnection()
        const [profile] = await conn.query('SELECT * FROM user_profile WHERE user_id = ?',[
            id
        ])
        if(profile){
            return res.status(200).json({
                profile:profile[0]
            })
        }
    } catch (error) {
        console.log(error);
    }finally{
        if(conn){
            conn.release()
        }
    }
}
const getInfo = async(req,res)=>{
    let conn;
    try {
        conn = await db.getConnection()
        const {id} = req.user;
        const [info] = await conn.query('SELECT * FROM user_info WHERE user_id = ?',[
            id
        ])
        if(info){
            return res.status(200).json({
                info:info[0]
            })
        }
    } catch (error) {
        console.log(error);
    }finally{
        if(conn){
            conn.release
        }
    }
}
const updateInfo = async(req,res)=>{
    let conn;
    try {
        const {firstname,lastname,middlename,extention,age,gender} = req.body;
        const {id} = req.user
        conn = await db.getConnection()
        const result = await conn.query('UPDATE user_info SET firstname = ?,lastname=?,middlename = ?,extention=?,gender=?,age=? WHERE user_id = ?',[
            firstname,lastname,middlename,extention,gender,age,id
        ])
        if(result){
            return res.status(201).json({
                msg:'Info Updated'
            })
        }
    } catch (error) {
        console.log(error);
    }finally{
        if(conn){
            conn.release
        }
    }
}
const updateProfile = async(req,res)=>{
    let conn;
    try {
        const {image} = req.files;
        const {id} = req.user
        conn = await db.getConnection()
        const result = await conn.query('UPDATE user_profile SET image = ? WHERE user_id = ?',[
            `images/${image[0].originalname}`,id
        ])
        if(result){
            return res.status(201).json({
                msg:'profile is Updated'
            })
        }
    } catch (error) {
        console.log(error);
    }finally{
        if(conn){
            conn.release
        }
    }
}
const changePassword = async(req, res) => {
    let conn;
    try {
        conn = await db.getConnection();
        const {password} = req.body
        const {id} = req.user
      const [response1] = await conn.query("SELECT * FROM user_login WHERE id = ?", [
        id,
      ]);
      const comparePassword = await bcrypt.compare(
        password,
        response1[0].password
      );
      if (comparePassword == true) {
        return res.status(401).json({
          msg: "Password is already in use",
        });
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [response2] = await conn.query(
          "UPDATE user_login SET password=? WHERE id = ?",
          [hashedPassword, id]
        );
        if (response2.affectedRows > 0) {
             return res.status(200).json({
            msg: "Change Password Successfully",
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

  const insertTask = async(req,res)=>{
    let conn;
    try {
        const {task,time_duration}= req.body;
        const {id} = req.user
        conn = await db.getConnection();
        const result = await conn.query('INSERT INTO todo_list(user_id,task,time_duration,created)VALUES(?,?,?,now())',[
            id,task,time_duration
        ])
        if(result){
            return res.status(201).json({
                msg:'Task Inserted'
            })
        }else{
            return res.status(400).json({
                msg:'error Insertion'
            })
        }
    } catch (error) {
        console.error(error);
      return res.status(500).json({
        msg: "Internal Server Error",
      });
    }finally{
        if (conn) {
            conn.release();
          }
    }
  }
  const getTask = async(req,res)=>{
    let conn;
    try {
        const {timenow} = req.body
        const {id} = req.user;
        conn = await db.getConnection();
        const [result] = await conn.query('SELECT * FROM todo_list WHERE user_id = ? AND created = ?',[
            id,timenow
        ])
        if(result){
            return res.status(200).json({
                todoList:result
            })
        }else{
            return res.status(404).json({
                msg:'id Not Found'
            })
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          msg: "Internal Server Error",
        });
    }finally{
        if (conn) {
            conn.release();
          }
    }
  }
  const doneTask = async(req,res)=>{
    let conn;
    try {
        const {id} = req.body
        conn = await db.getConnection();
        const result = await conn.query('UPDATE todo_list SET is_done = 1,time_done = now() WHERE id = ?',[
            id
        ])
        if(result){
            return res.status(201).json({
                msg:'task Done!!!'
            })
        }else{
            return res.status(400).json({
                msg:'Failed Updated'
            })
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          msg: "Internal Server Error",
        });
    }finally{
        if (conn) {
            conn.release();
          }
    }
  }
  const removeTask = async(req,res)=>{
    let conn;
    try {
        const {id} = req.body
        conn = await db.getConnection();
        const result = await conn.query('DELETE FROM todo_list WHERE id = ?',[
            id
        ])
        if(result){
            return res.status(201).json({
                msg:'task remove!!!'
            })
        }else{
            return res.status(400).json({
                msg:'Failed Updated'
            })
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
          msg: "Internal Server Error",
        });
    }finally{
        if (conn) {
            conn.release();
          }
    }
  }
module.exports = {
    updateInfo,
    updateProfile,
    getInfo,
    getProfile,
    changePassword,
    insertTask,
    getTask,
    doneTask,
    removeTask
}