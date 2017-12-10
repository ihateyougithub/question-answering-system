var express = require('express')

var bodyParser = require('body-parser')
// 引入cookie模块  用来存储登陆状态
var cookieParser = require('cookie-parser')

var multer = require('multer')

var fs = require('fs')

var web = express();

web.use(cookieParser())

web.use(express.static('public'))

web.use(bodyParser.urlencoded({ extended: false }))
// 上传头像的配置信息
// disk    硬盘
// storage 存储
var headerConfig = multer.diskStorage({
    // 目的地
    destination: 'public/allHeaders',

    filename: function (req, file, callback) {
        // 图片名字 账号名字+类型
        // 获取登陆用户的账号
        var name = req.cookies.userName;
        // originalname 图片名字  666666.JPG
        var type = file.originalname.split('.');
        // .spli()  以括号里面的内容进行分割
        // 分割的结果是数组  JPG , PNG ,JPEG
        type = type[type.length - 1];
        // callback生成的是图片最终的名字
        // 里面有两个参数
        // 参数1：错误信息
        // 参数2：图片名字的拼接方式
        callback(null, name + '.' + type);
    }
})
// 图片进行存储的时候 使用headerConfig这个配置信息
var upLoad = multer({ storage: headerConfig });

// 注册
web.post('/regist', function (req, res) {

    var user = req.body.name;

    var psw = req.body.psw;

    // 账号创建成功或者失败的唯一标准
    // 数据堆里面有没有这个账号
    fs.exists('allUsers', function (isExists) {
        if (!isExists) {
            fs.mkdirSync('allUsers')
        }
    })

    // allUsers/123123.json
    fs.exists('allUsers/' + user + '.json',
        function (isExists) {
            // 如果用户存在
            if (isExists) {
                res.json({ status: 0, message: "该用户已经注册" })
            }
            else {
                fs.writeFile('allUsers/' + user + '.json',
                    JSON.stringify(req.body), function (err) {
                        if (err) {
                            res.json({ status: 1, message: err })
                            console.log(err);
                        }
                        else {
                            res.json({ status: 200, message: '注册成功' })
                        }
                    })
            }
        })

})


// 登陆
web.post('/login', function (req, res) {
    // 判断allUsers里面有没有这个账号
    // 有  读文件 判断密码是否一致
    //     读取成功 
    //        密码一致 res(ok)
    //        密码不一致 res(error)
    //     读取失败 res(失败)
    // 没有 res(失败)

    fs.exists('allUsers/' + req.body.user + '.json',
        function (isExists) {
            if (isExists) {
                fs.readFile('allUsers/' + req.body.user + '.json',
                    function (err, data) {
                        if (err) {
                            res.json({ status: 1, message: '服务器内部错误，登陆失败' })
                        }
                        else {
                            if (req.body.psw == JSON.parse(data).psw) {
                                //   保存cookie到浏览器当中
                                res.cookie("userName", req.body.user);
                                res.json({ status: 200, message: '登陆成功' })
                            }
                            else {
                                res.json({ status: 2, message: '密码错误,登陆失败' })
                            }
                        }
                    })
            }
            else {
                res.json({ status: 0, message: "该用户尚未注册" })
            }
        })
})

//上传头像
web.post('/upload', upLoad.single('photo'),
    function (req, res) {


        // 将头像和user信息绑定在一起
        // 1.获取头像
        // 头像名字 = 用户名 + . + 类型
        // req.cookies() 后台获取
        // res.cookie() 让前端存储
        // 获取图片名称
        var name = req.cookies.userName;
        // 获取类型
        var type = req.file.originalname.split('.');

        type = type[type.length - 1];

        var header = 'allHeaders/' + name + '.' + type;
        // 2.获取user
        fs.readFile('allUsers/' + name + '.json',
            function (err, data) {
                if (data) {
                    var user = JSON.parse(data);
                    // 将图片路径添加到属性当中
                    user.header = header;

                    fs.writeFile('allUsers/' + name + '.json',
                        JSON.stringify(user),
                        function (err) {
                            if (err) {
                                res.send('<script>alert("发生未知错误")</script>')
                            }
                            else {
                                res.send('<script>alert("上传成功");location.href="index.html"</script>')
                            }
                        })
                }
                else {
                    console.log(err)
                }
            })
    })

web.get('/myHeader', function (req, res) {
    // 获取用户名
    var name = req.cookies.userName;

    // 根据用户名获取对应的用户信息
    fs.readFile('allUsers/' + name + '.json',
        function (err, data) {
            if (err) {
                res.send('allHeaders/default.jpg')
            }
            else {
                var user = JSON.parse(data);

                if (user.header) {
                    res.send(user.header)
                }
                else {
                    res.send('allHeaders/default.jpg')
                }
            }
        })
})

// 用来存放所有的问题
var allQuestions = [];
if (fs.existsSync('allQuestions/question.json')) {
    var data = fs.readFileSync('allQuestions/question.json')

    allQuestions = JSON.parse(data)
}
else {
    fs.mkdirSync('allQuestions')
}

//提交问题
web.post('/question', function (req, res) {

    var asker = {};

    asker.name = req.cookies.userName;

    asker.content = req.body.content;

    asker.time = new Date();

    var data = fs.readFileSync('allUsers/' +
        asker.name + '.json')

    data = JSON.parse(data);
    if (data.header) {
        asker.header = data.header
    }
    else {
        asker.header = 'allHeaders/default.jpg'
    }


    //  将问题放进所有问题的数组当中
    console.log('333333')
    allQuestions.push(asker);

    fs.writeFile('allQuestions/question.json',
        JSON.stringify(allQuestions), function (err) {
            if (err) {
                console.log(err);
                res.send({ status: 0, message: '提问失败' })
            }
            else {
                res.send({ status: 200, message: '发表成功' })
            }
        })
})

// 获取所有问题
web.get('/getAllQuestions',function(req ,res){
    
    res.json(allQuestions);
})

// 提交答案
web.post('/answer',function(req ,res){

    // 获取被回答问题的索引
    var index = req.cookies.index;

    console.log('index='+ index)
    var question = allQuestions[index];

    if(!question.answers)
    {
        
        question.answers = [];
    }
    

    var answer = {};

    answer.name = req.cookies.userName;

    
    answer.content = req.body.content ;

   var data =  fs.readFileSync('allUsers/' +
    answer.name + '.json')
   
   data = JSON.parse(data);

   if(data.header) 
   {
       answer.header = data.header;
   }
   else 
   {
       answer.header = 'allHeaders/default.jpg'
   }


    answer.time = new Date();
    
    question.answers.push(answer);

    var quesStr = JSON.stringify(allQuestions);

    fs.writeFile('allQuestions/question.json',quesStr,
    function(err){
        if(err)
        {
            res.json({status:0,message:err})
        }
        else 
        {
            res.json({status:200,message:"回答成功"})
        }
    })

})
web.listen('3000', function () {
    console.log('服务器启动')
})