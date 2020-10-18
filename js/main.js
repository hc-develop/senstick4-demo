'use strict';

const MRUBY_SERVICE_UUID   = 'f0001523-0451-4000-b000-000000000000';
const MRUBY_CHAR_UUID      = 'f0001525-0451-4000-b000-000000000000';

const TEMP_SH_VAL_NAME   = 'tempSH';
const LX_SH_VAL_NAME   = 'lxSH';
const TEMP_VAL_NAME   = 'tempVal';
const HM_VAL_NAME   = 'hmVal';
const LX_VAL_NAME   = 'lxVal';
const UV_VAL_NAME   = 'uvVal';

// 値取得タイマー値
const GET_TIMER_VAL = 500;

const ble = new BlueJelly();

var getValTimer = null

$(function(){
    $("#connectBle").text("接続");
    ble.setUUID("mrubyc", MRUBY_SERVICE_UUID, MRUBY_CHAR_UUID)
    $("#connectBle").on("click", function() {
        var sts = $("#connectBle").text();
        if(sts == "接続"){
            $("#message").text("スキャン中です");
            $("#connectBle").text("接続中");
            ble.scan('mrubyc').then( () => {
                if (!ble.bluetoothDevice) {
                    console.log('No Bluetooth Device');
                }else{
                    console.log('scan ok.');
                }
            }).catch( error => {
                console.log('error in scan');
                $("#message").text("接続に失敗しました。");
                $("#connectBle").text("接続");
                this.onError(error)
            })
        }else{
            ble.reset();
        }
    });

    $('#tempRange').on('input change', function() {
        // 温度しきい値変更
        var sh = $(this).val();
        $('#tempSH').text(sh);
        set_variable_write(TEMP_SH_VAL_NAME, sh);
    });

    $('#lxRange').on('input change', function() {
        // 照度しきい値変更
        var sh = $(this).val();
        $('#lxSH').text(sh);
        set_variable_write(LX_SH_VAL_NAME, sh);
    });
});

// SenStickからの返り値を値に変換する
function convert_from_senstick_value(buffer) {
    var src = new Uint8Array(buffer);
    var conv = new ArrayBuffer(8);
    var dst_uint8 = new Uint8Array(conv);
    for( var i=0 ; i<8 ; i++ ) dst_uint8[i] = src[i+1];
    switch(src[0]){
        case 0:
            return 'null'
            break;
        case 1:
            var dst_int32 = new Int32Array(conv);
            return dst_int32[0];
            break;
        case 2:
            var dst_float64 = new Float64Array(conv);
            return dst_float64[0];
            break;
        default:
            return 'unknown';
            break;
    }
}

// SenStickへ送る値に変換する
// typeでデータ型を指定する
function convert_to_senstick_value(value) {
    // データ型チェック
    var num = Number(value)
    console.log(num)
    var datatype = null  // nil
    if( !Number.isNaN(num) ){
    	if( value.indexOf('.') >= 0 ){
    	    datatype = "float";
        } else {
            datatype = "int";
        }
    }
    // データ型ごとの値設定
    var buffer = new ArrayBuffer(9);
    var conv = new ArrayBuffer(8);
    var dst_uint8 = new Uint8Array(conv);
    switch(datatype){
        case "int":  // int
            var dst_int32 = new Int32Array(conv);
            buffer[0] = 1;
            dst_int32[0] = num;
            break;
        case "float":  // float
            var dst_float64 = new Float64Array(conv);
            buffer[0] = 2;
            dst_float64[0] = num;
            break;
        default:
            buffer[0] = 0;
            break;
    }
    // データをコピー
    for( var i=0 ; i<8 ; i++ ) buffer[i+1] = dst_uint8[i];
    return buffer;
}

function variable_write(name, shVal) {
    var cmd = [0x11, 0x24];
    // 変数名を格納する
    var len = name.length;
    if( len > 8 ) len = 8;
    for( i=0 ; i<len ; i++ ){
    	cmd.push( name.charCodeAt(i) );
    }
    cmd.push( 0 );
    //
    var buffer = convert_to_senstick_value(shVal);
    // 値を格納する
    for( var i=0 ; i<9 ; i++ ){
    	cmd.push( buffer[i] );
    }
    console.log("write:" + cmd);
    // 書き込み
    isWrite = true;
    ble.write("mrubyc", cmd).then( () => {
        console.log('write');
    })
    .catch(error => {
        console.log('Error : ' + error);
        startTimer();
    });
    return;
}

function variable_read(name)  {
    var cmd = [0x10, 0x24];
    // 変数名を格納する
    var len = name.length;
    if( len > 8 ) len = 8;
    for( var i=0 ; i<len ; i++ ){
    	cmd.push( name.charCodeAt(i) );
    }
    cmd.push( 0 );
    // 値を取得する
    ble.write("mrubyc", cmd).then( () => {
    	return ble.read("mrubyc");
    })
    .then( (data) => {
        console.log('read:' + data);
    })
    .catch(error => {
        console.log('Error : ' + error);
        startTimer();
    });
}

//--------------------------------------------------
// 値取得タイマー処理
//--------------------------------------------------
var gettingVal = TEMP_VAL_NAME;
var setSHvals = [];
var isWrite = false;
var settingValName = null;
var settingVal = null;

function set_variable_write(name, shVal) {
    var shVal = {name:name, val:shVal};
    setSHvals.push(shVal);
    // settingValName = name;
    // settingVal = shVal;
    // isWrite = true;
    // startTimer();
}

function startTimer() {
    if (!ble.bluetoothDevice) {
        console.error('No Bluetooth Device');
        return;
    }
    if(getValTimer){
        console.error('Already timer.');
        return;
    }
    getValTimer=setTimeout(function(){
        // 繰り返し処理させたいコード
        getValTimer = null;
        if(setSHvals.length != 0){
            var shVal = setSHvals[0];
            variable_write(shVal.name, shVal.val);
        }else{
            variable_read(gettingVal);
        }
        checkSH();
    } , GET_TIMER_VAL);
}

function stopTimer() {
    if(getValTimer){
        clearTimeout(getValTimer);
        getValTimer = null;
    }
}

function checkSH() {
    var temp = $("#tempVal").text();
    var tempSH = $('#tempSH').text();
    var lx = $("#luxVal").text();
    var lxSH = $('#lxSH').text();
    var logObj = {temp: temp, tempSH:tempSH, lx: lx, lxSH: lxSH};
    if(isNaN(temp) || isNaN(lx)){
        return;
    }
    console.log(logObj);
    var isHOT = false;
    var isBright = false;
    if(parseFloat(temp) > parseFloat(tempSH)){
        isHOT = true;
    }
    if(parseFloat(lx) > parseFloat(lxSH)){
        isBright = true;
    }
    $("#homeImage").removeClass();
    if(isHOT){
        if(isBright){
            // 暑い　＆　明るい
            $("#homeImage").addClass('hot-bright');
        }else{
            // 暑い　＆　暗い
            $("#homeImage").addClass('hot-dark');
        }
    }else{
        if(isBright){
            // 寒い　＆　明るい
            $("#homeImage").addClass('cool-bright');
        }else{
            // 寒い　＆　暗い
            $("#homeImage").addClass('cool-dark');
        }
    }
}


//--------------------------------------------------
//Connect状態時の処理
//--------------------------------------------------
ble.onConnectGATT = function(uuid) {
    $("#message").text("接続完了：" + uuid);
    $("#connectBle").text("切断");
    setSHvals.push({ name:TEMP_SH_VAL_NAME, val:$('#tempSH').text() });
    setSHvals.push({ name:LX_SH_VAL_NAME, val:$('#lxSH').text() });
    startTimer();
}

//--------------------------------------------------
//Disconnect状態時の処理
//--------------------------------------------------
ble.onDisconnect = function() {
    console.error("onDisconnect");
    stopTimer();
    $("#connectBle").text("接続");
    $("#message").text("切断されました。");
}
//--------------------------------------------------
//Error後の処理
//--------------------------------------------------
ble.onError = function(error){
    console.error("onError:" + error);
    $("#message").text("エラー：" + error);
}

//--------------------------------------------------
//Scan後の処理
//--------------------------------------------------
ble.onScan = function (deviceName) {
    $("#message").text("スキャン完了：" + deviceName);
    $("#deviceName").text(deviceName);
    ble.connectGATT('mrubyc');
}

ble.onRead = function(data, uuid) {
    console.log("onRead:" + data);
    var val = null;
    if(data){
        val = convert_from_senstick_value(data.buffer);
    }
    switch(gettingVal){
        case TEMP_VAL_NAME:
            // 少数第2位までにする
            var r = Math.round(val * 100) / 100
            $("#tempVal").text(r);
            gettingVal = HM_VAL_NAME;
            break;
        case HM_VAL_NAME:
            // 少数第2位までにする
            var r = Math.round(val * 100) / 100
            $("#humidityVal").text(r);
            gettingVal = LX_VAL_NAME;
            break;
        case LX_VAL_NAME:
            $("#luxVal").text(val);
            gettingVal = UV_VAL_NAME;
            break;
        case UV_VAL_NAME:
            $("#uvVal").text(val);
            gettingVal = TEMP_VAL_NAME;
            break;
    }
    startTimer();
};

ble.onWrite = function(uuid) {
    //console.log("onWrite");
        
    if(isWrite){
        isWrite = false;
        var shVal = setSHvals.shift();
        console.log("onWrite name:" + shVal.name + " val:" + shVal.val );
        startTimer();
    }
}


ble.onReset = function () {
    stopTimer();
    $("#connectBle").text("接続");
    $("#message").text("切断しました。");
    $("#deviceName").text("-");
};

