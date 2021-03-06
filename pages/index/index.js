//获得数据库引用
const db = wx.cloud.database();
const app = getApp();
var target_quan_wei = 1, target_quan = 1, target_ = 1;//用于分页查询起始位置,分别是 获得位置成功全局，获取位置失败全局，位置

var shouyefujin = [], shouyequanju = []; //附近，全局
// 引用百度地图微信小程序JSAPI模块 
var bmap = require('../../libs/bmap-wx.min.js');
let fujinmeiyou = false; //表示第一次获取位置成功却没有数据给一次提示
Page({
  /**
   * 页面的初始数据
   */
  data: {
    shouyefujin: [], //首页附近数组，用于展示首页附近信息
    shouyequanju: [], //首页全部数组，用于展示首页全部信息
    xianshi: 'shouye',
    sousuoValue: null,  //搜索框默认
    avatarUrl: '../../images/user-unlogin.png',
    qishiweizhiqiehuan: 'cur',//起始位置切换
    zhongdianweizhiqiehuan: '',//终点位置切换
  },
  //切换卡片
  tabSelect(e) {
    console.log(e);
    this.setData({
      TabCur: e.currentTarget.dataset.id,
      scrollLeft: (e.currentTarget.dataset.id - 1) * 60
    })
  }
  ,
  /**
   * 附近位置最大最小经纬度计算 
   * @param   longitude  经度
   * @param   latitude   纬度
   * @param   distince    距离（千米）
   * @returns 格式：经度最小值-经度最大值-纬度最小值-纬度最大值
   */
  getMaxMinLongitudeLatitude(longitude, latitude, distince) {
    console.log("查询经纬度最大最小奥MaxMinLongitudeLatitude", longitude, latitude);
    let r = 6371.393;    // 地球半径千米
    let lng = longitude;
    let lat = latitude;
    let dlng = 2 * Math.asin(Math.sin(distince / (2 * r)) / Math.cos(lat * Math.PI / 180));
    // 角度转为弧度
    dlng = dlng * 180 / Math.PI;
    let dlat = distince / r;
    dlat = dlat * 180 / Math.PI;
    let minlat = lat - dlat;
    let maxlat = lat + dlat;
    let minlng = lng - dlng;
    let maxlng = lng + dlng;
    return minlng + "-" + maxlng + "-" + minlat + "-" + maxlat;
  },

  /**
   * 
   * 获得当前位置
   */
  dangqianweizhi() {
    //打开当前位置侧边栏
    this.setData({
      modalName: 'menuSide'
    })
    this.weizhi("dangqianweizhi");
  },
  /**
   * 位置授权失败，给出相应引导授权
   */
  weizhishouquanshibai() {
    let that = this;
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.userLocation']) {
          wx.showModal({
            title: '是否需要打开设置页面',
            content: '你已取消授权位置，是否打开设置页面进行授权',
            confirmText: '确定',
            cancelText: '取消',
            success(ress) {
              //表示点击了取消
              if (ress.confirm == false) {
                return;
              } else {
                wx.openSetting({
                  success(resss) {
                    if (resss.authSetting['scope.userLocation']) {
                      //用户打开了位置授权，重新加载
                      //获得当前位置, 参数为空表示不是点击切换附近
                      shouyefujin = [];
                      that.weizhi('');
                    }
                  }
                })
              }
            }
          })


        }

      }
    })


  },
  /**
   * 获得位置
   */
  weizhi: function (dangqianweizhi) {
    var that = this;
    var BMap = new bmap.BMapWX({
      ak: "Z3MotXRHKMq5OzjNG1ukIxSQPrGYfpK0"
    });
    //获得当前位置，但没有获得经纬度
    BMap.weather({
      fail(data) {
        that.setData({
          dangqianweizhicurrentCity: "定位失败"
        });
        /**
         * 定位失败，可能是用户开始时取消了位置获取权限，这里加以判断
         * 1.获取位置授权信息
         * 2.判断是否授权
         * 3.没有授权给定相应提示信息
         */
        that.weizhishouquanshibai();
      },
      success: function (data) {
        var weatherData = data.currentWeather[0];
        that.setData({
          dangqianweizhicurrentCity: weatherData.currentCity,
          dangqianweizhiPM25: weatherData.pm25,
          dangqianweizhiwendu: weatherData.temperature,
          dangqianweizhitianqi: weatherData.weatherDesc,
          dangqianweizhifengli: weatherData.wind,
        });
      },
    });
    //获得当前位置经纬度
    BMap.regeocoding({
      fail(data) {
        //dangqianweizhi   当前位置不为空，表示是点击位置切换，不用查询数据库，
        if (dangqianweizhi == '') {
          //按附近位置查询信息
          console.log("---获取经纬度失败--开始按照获取位置失败时执行的全局查找！");
          //当获取经纬度失败时！！按照全局查找
          that.chaxundaijiaquan();
        }
      },
      success(data) {
        let longitude = data.wxMarkerData[0].longitude;
        let latitude = data.wxMarkerData[0].latitude;
        //获得附近N千米最大最小经纬度 (33千米)   经度最小值-经度最大值-纬度最小值-纬度最大值
        let MaxMinLongitudeLatitude = that.getMaxMinLongitudeLatitude(longitude, latitude, 33).split('-');
        that.setData({
          longitude: longitude,  //经度
          latitude: latitude,   //维度
          MaxMinLongitudeLatitude: MaxMinLongitudeLatitude, //经度最小值-经度最大值-纬度最小值-纬度最大值
        })
        //dangqianweizhi   当前位置不为空，表示是点击位置切换，不用查询数据库，
        if (dangqianweizhi == '') {
          //按附近位置查询信息
          console.log("---获取经纬度成功--开始按附近查找------！");
          that.weizhichaxundaijia();
          // console.log("---获取经纬度成功--开始按照获取位置成功时执行的全局查找！");
          // that.chaxundaijia();
        }
      },

    });


  },
  /**
   * 按附近位置查询信息
   * 查询发布的代驾信息
   */
  weizhichaxundaijia() {
    //查询数据库   起始位置
    let that = this;
    wx.request({
      url: app.globalData.url + 'orderAction_pagingQuery', //分页查询
      data: {
        ifFinish: false, //表示是否完成
        ifAccept: false, //表示是否被接单
        receivedBy: '', //表示此订单被谁接单,为空没有被指定
        currentPage: target_, //当前页
        pageSize: 10,//每页大小
        //附近查找
        initialPositionLatitudeMin: that.data.MaxMinLongitudeLatitude[2], //起始位置纬度附近最小值
        initialPositionLatitudeMax: that.data.MaxMinLongitudeLatitude[3], //起始位置纬度附近最大值
        initialPositionLongitudeMin: that.data.MaxMinLongitudeLatitude[0],//起始位置经度附近最小值
        initialPositionLongitudeMax: that.data.MaxMinLongitudeLatitude[1],//起始位置经度附近最大值
      },
      success(res) {
        target_ += 1; //当前页，表示一个页面，+1表示到第二个页面
        console.log(res.data)
        //获得附近信息，保存大数组shouyefujin
        for (let i = 0; i < res.data.dataLength; i++) {
          shouyefujin.push(res.data.data[i]);
        }
        //获得附近之外的全部信息，保存大数组shouyequanju
        for (let i = 0; i < res.data.dataQuanlength; i++) {
          shouyequanju.push(res.data.dataQuan[i]);
        }
        that.setData({
          shouyefujin: shouyefujin,
          shouyequanju, shouyequanju,
        })
        //判断是否加载完毕数据
        if (res.data.LoadUp) {
          that.setData({
            isLoad: true,//表示附近获取完了
          })
        }
      }
    })
  },
  /**
 * 
 * 查询发布的代驾信息
 * 获取位置失败时执行的全局查找
 */
  chaxundaijiaquan: function (fujin) {
    //查询数据库   起始位置
    let that = this;
    wx.request({
      url: app.globalData.url + 'orderAction_pagingQuery', //分页查询
      data: {
        ifFinish: false, //表示是否完成
        ifAccept: false, //表示是否被接单
        receivedBy: '', //表示此订单被谁接单,为空没有被指定
        currentPage: target_quan, //当前页
        pageSize: 10,//每页大小
        //起始位置经纬度附近最小值与起始位置经纬度附近最大值 相等表示全局,应为好的附近失败
        initialPositionLatitudeMin: 0, //起始位置纬度附近最小值
        initialPositionLatitudeMax: 0, //起始位置纬度附近最大值
        initialPositionLongitudeMin: 0,//起始位置经度附近最小值
        initialPositionLongitudeMax: 0,//起始位置经度附近最大值
      },         
      success(res) {
        target_quan += 1; //当前页，表示一个页面，+1表示到第二个页面
        console.log(res.data)
        //获得附近信息，保存大数组shouyefujin
        for (let i = 0; i < res.data.dataLength; i++) {
          shouyefujin.push(res.data.data[i]);
        }
        that.setData({
          shouyefujin: shouyefujin,
        })
        //判断是否加载完毕数据
        if (res.data.LoadUp) {
          that.setData({
            isLoad: true,//表示附近获取完了
          })
        }
      }
    })
  },

  /**
   * 
   * 搜索位置切换
   */
  weizhiqiehuan: function (e) {
    if (e.currentTarget.dataset.weizhiqiehuan == '终点位置') {
      this.setData({
        zhongdianweizhiqiehuan: "cur",
        qishiweizhiqiehuan: "",
      })
    } else {
      this.setData({
        qishiweizhiqiehuan: "cur",
        zhongdianweizhiqiehuan: "",
      })
    }
  },

  /**
   * 进入搜索详细页面
   * 也是从首页进入信息
   */
  sousuoxiangxi: function (e) {
    let sousuoid = e.currentTarget.dataset.sousuoid;
    //跳转编辑信息页面
    wx.navigateTo({
      url: 'information/information?pages=index&informationid=' + sousuoid,
    })
  },

  /**
   * 点击搜索叉叉，删除缓存
   */
  shanchusousuo: function () {
    //删除输入框里面内容
    this.obliterate();
  },
  /**
   * 
   * 清空搜索缓存
   */
  obliterate: function (e) {
    this.setData({
      sousuoValue: null,
      zhongdianweizhi: null,
      qishiweizhi: null,
      xianshi: 'shouye',
    })
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let that = this;
    /**
     * 执行云涵数，获得openid作为id
     * 设置全局openid ，当用户退出时，再次进来则加载云函数获得用户信息，保存到全局变量中
     * 
     * */
    wx.cloud.callFunction({
      name: 'login',
      complete: (res) => {
        app.globalDataOpenid.openid_ = res.result.openid;
        that.userAnd(); //获得用户信息
      }
    })
    /**
 * 查询代驾信息，先查询位置
 * 再在位置里面查询信息
 * 获得当前位置, 参数为空表示不是点击切换附近
 */
    this.weizhi('');
  },
  userAnd(){
      // 获取用户信息
      wx.getSetting({
        success: res => {
          if (res.authSetting['scope.userInfo']) {
            // 已经授权，可以直接调用 getUserInfo 获取头像昵称，不会弹框
            wx.getUserInfo({
              success: res => {
                this.setData({
                  avatarUrl: res.userInfo.avatarUrl,
                  userInfo: res.userInfo
                })
                let thiss = this;
                wx.request({
                  url: app.globalData.url + 'userAction_findOne', 
                  data: {
                    openid: app.globalDataOpenid.openid_, 
                  },      
                  success(res) {
                    console.log('-------app.globalDataOpenid.user_id-----------',res.data.id)
                    app.globalDataOpenid.user_id = res.data.id;
                  }
                })
              }
            })
          }
        }
      })
  },
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
  },
  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    //下拉刷新，相当于重新加载页面，全部数据恢复默认
    fujinmeiyou = false;
    target_quan_wei = 1;
    target_quan = 1; target_ = 1;//用于分页查询起始位置,分别是 获得位置成功全局，获取位置失败全局，位置
    shouyefujin = []; shouyequanju = [];
    /**
 * 把开始获得的数据清空，防止数据重复。
 * 如：当用户获得位置后获得附近数据，又在设置里面关闭了权限，重新返回首页时导致了附近位置数据还在。
 */
    this.setData({
      shouyefujin: [],
      shouyequanju: [],
      isLoad: false,
    })
    /**
 * 查询代驾信息，先查询位置
 * 再在位置里面查询信息
 * 获得当前位置, 参数为空表示不是点击切换附近
 */
    this.weizhi('');
  },
  /**
* 页面上拉触底事件的处理函数
*/
  onReachBottom: function () {
    //上拉刷新，表示前面已经加载过了，设置为true
    fujinmeiyou = true;
    this.weizhi('');
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    //隐藏清空缓存
    this.obliterate();
    this.closeModal();
  },
  /**
   * 
   * 进入个人详细信息
   */
  xiangxixinxi: function () {
    wx.getSetting({
      success(res) {
        console.log(res.authSetting)
        //没有授权
        if (!res.authSetting['scope.userInfo']) {
          wx.showModal({
            title: '请登录',
            content: '您好还没有登录，请先登录再操作！',
            confirmText: '确定',
            cancelText: '取消',
            success(res) {
              console.log(res)
              //表示点击了取消
              if (res.confirm == false) {
                //关闭当前页面返回主界面
                wx.switchTab({
                  url: '../index/index',
                })
              } else {
                //点击确认时,跳转到登录界面
                wx.switchTab({
                  url: '../user/user',
                })
              }
            }
          })
        } else {
          //跳转编辑信息页面
          wx.navigateTo({
            url: '../user/redact/redact?openid=' + app.globalDataOpenid.openid_,
          })
        }
      }
    })
  },
  /**
   * 输入是触发
   */
  shurushichufa: function (e) {
    let sousuo = e.detail.value.trim();
    this.setData({
      xianshi: 'sousuoxianshi',
      sousuoValue: sousuo,
    })
    //为空则不进行操作
    if (sousuo != '') {
      //查询数据库   起始位置
      //查询数据库   起始位置
      let that = this;
      wx.request({
        url: app.globalData.url + 'orderAction_fuzzyQuery', //分页查询
        data: {
          ifFinish: false, //表示是否完成
          ifAccept: false, //表示是否被接单
          receivedBy: '', //表示此订单被谁接单,为空没有被指定
          initialPosition: sousuo, //起始位置
        },
        method: 'POST',
        header: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        success(res) {
          that.setData({
            qishiweizhi: res.data,
          })
        }
      })
      //终点位置模糊查询
      wx.request({
        url: app.globalData.url + 'orderAction_fuzzyQuery', //分页查询
        data: {
          ifFinish: false, //表示是否完成
          ifAccept: false, //表示是否被接单
          receivedBy: '', //表示此订单被谁接单,为空没有被指定
          finalPosition: sousuo,//终点位置
        },
        method: 'POST',
        header: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        success(res) {
          that.setData({
            zhongdianweizhi: res.data,
          })
        }
      })
    } else {
      //隐藏清空缓存
      this.obliterate();
      console.log("--------- 输入是触发-为空---");
      return;
    }

  },
  /**
   * 全局点击触发
   */
  quanjudianji: function (e) {
    console.log()
    //先清除搜索缓存
    this.obliterate();
  }
  ,
  /**
   * 
   * 关闭侧边
   */
  closeModal: function (e) {
    this.setData({
      modalName: null
    })
  }
})