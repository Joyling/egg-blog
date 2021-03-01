const Controller = require('egg').Controller;
const fs = require('mz/fs');

class UserController extends Controller{
    async logout(){
        this.ctx.session = null;
        this.ctx.redirect('/login.htm')
    }

    async login(){
        const ctx = this.ctx;
        ctx.logger.info('req body:: %j',ctx.request.body);
        const { username, password, rememberMe } = ctx.request.body;
        const user = await ctx.service.user.loginAndGetUser(username, password);
        if (!user){
            ctx.body = {
                successFlag:'N',
                errorMsg:'用户名或密码错误！'
            }
        }else {
            // 设置 Session
            ctx.session.user = {username:user.username};
            ctx.cookies.set('avatarUrl',user.avatar_url,{httpOnly:false,maxAge:this.config.rememberMe});
            // 如果用户勾选了 `记住我`，设置 的过期时间
            if (rememberMe) ctx.session.maxAge = this.config.rememberMe;
            ctx.body = {
                successFlag:'Y',
                errorMsg:'登录成功！'
            };
            ctx.redirect('/')
        }
    }

    async register(){
        const ctx = this.ctx;
        const { username, password, phone } = ctx.request.body;
        const avatar = ctx.request.files[0];
        //默认头像
        let filepathNew = this.config.baseDir+'\\app\\public\\avatar\\default.jpg';
        //如果用户上传了头像
        if (avatar) {
            console.log('file:%j', avatar);
            let filenameNew = ctx.helper.uuid() +'.'+  avatar.filename.split('.').pop();
            filepathNew = this.config.baseDir+'\\app\\public\\avatar\\'+filenameNew;
            //把临时文件剪切到新目录去
            await fs.rename(avatar.filepath, filepathNew);
        }

        const nowTime = new Date();
        const userNew = {
            id : ctx.helper.uuid(),
            username : username,
            password : password,
            phone : phone,
            avatar_url : filepathNew.split("\\app")[1],
            create_time : nowTime,
            update_time : nowTime,
            role: 'user'
        };
        const flag = await ctx.service.user.save(userNew);
        if (flag){
            // 设置 Session
            ctx.session.user = {username:username};
            ctx.cookies.set('avatarUrl',userNew.avatar_url,{httpOnly:false,maxAge:this.config.rememberMe});
            ctx.body = {
                successFlag:'Y',
                errorMsg:'登录成功！'
            };
            ctx.redirect('/')
        }else {
            ctx.body = {
                successFlag:'N',
                errorMsg:'用户名已存在！'
            }
        }
    }

    async userInfo(){
        const ctx = this.ctx;
        const {id} = ctx.params.id;
        const userInfo = ctx.service.user.getUserInfoById(id);
        if (userInfo){
            ctx.body = {
                successFlag:'Y',
                errorMsg:'',
                userInfo:userInfo
            };
        } else {
            ctx.body = {
                successFlag:'N',
                errorMsg:'用户名不存在！'
            }
        }
    }

    async myInfo(){
        const {ctx, service} = this;
        const userInfo = await service.user.getUserInfoByUsername(ctx.session.user.username);
        await ctx.render('user/myinfo.tpl',{userInfo:userInfo})
    }

    async modifyInfo(){
        const {ctx , service} = this;
        const { newPassword, phone } = ctx.request.body;
        const avatar = ctx.request.files[0];
        const nowTime = new Date();
        const userModify = {
            username : ctx.session.user.username,
            update_time : nowTime
        };
        if (newPassword){
            userModify.password = newPassword;
        }
        if (phone){
            userModify.phone = phone;
        }
        //如果用户上传了头像
        if (avatar) {
            let filenameNew = ctx.helper.uuid() +'.'+  avatar.filename.split('.').pop();
            const filepathNew = this.config.baseDir+'\\app\\public\\avatar\\'+filenameNew;
            userModify.avatar_url = filepathNew.split("\\app")[1];
            //把临时文件剪切到新目录去
            await fs.rename(avatar.filepath, filepathNew);
            ctx.cookies.set('avatarUrl',userModify.avatar_url,{httpOnly:false,maxAge:this.config.rememberMe});
        }
        const flag =await service.user.modify(userModify);
        if (flag){
            ctx.redirect('/');
        }else {
            ctx.body = {
                successFlag:'N',
                errorMsg:'修改失败！'
            }
        }

    }

}

module.exports = UserController;