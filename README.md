# 匿名评论、新闻发布平台


### 特性

  * 无须注册，可匿名自由评论， 评论可以回复可评分。
  
  * 后台手动更新新闻，前台自动展现。
  
  * 可以自由删除同一IP评论，当然可以取消这一特性。
  
---

### 技术栈

  * node.js
  
  * react.js
  
  * express.js
  
  * mongodb

---

### 运行方法
  1. <a href='https://fastdl.mongodb.org/win32/mongodb-win32-x86_64-2008plus-ssl-4.0.2.zip'>下载</a>并解压数据库服务器。
  
  2. 打开.../LocalExpressServer/index.js,  设置数据库服务器更目录地址到mongodbSvrPath变量，<br>
      比如: let mongodbSvrPath="C:/Users/Username/Desktop/mongodb"
      
  3. 在.../LocalExpressServer目录下 打开cmd。
  
  4. npm install
  
  5. npm start
  
  6. 会自动弹出两个窗口，一个是平台页面，一个是添加新闻的页面； 
  一开始平台页面是一片空白，当添加了第一个新闻后 刷新一下平台页面就能看到内容了。（截图在下面）
  
  <img src='https://github.com/kska32/NewsWebappWithCommentsSystem/blob/master/LocalExpressServer/public/images/captures.png' width=700 height=300>
 
  
 
  7. 这个平台样板在<a href="https://absolute.tk/news/">这里</a>。
  

  
  
