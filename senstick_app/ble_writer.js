var ble = new BlueJelly()

// 送信するバイト列を管理する
// bytecode: バイトコード列
// seq: 次に転送するシーケンス番号（seq>=0で転送中）
// num_seq: シーケンスの数
var transfer_data = { bytecode: null, seq: -1 , end_seq: -1 }

// 転送時のウェイト(ms)
var TRANSFER_WAIT_MS = 10

var SCAN_UUID            = '00000000-0000-0000-0000-000000000000'
var BATTERY_SERVICE_UUID = '0000180f-0000-1000-8000-00805f9b34fb'
var BATTERY_CHAR_UUID    = '00002a19-0000-1000-8000-00805f9b34fb'
var MRUBY_SERVICE_UUID   = 'f0001523-0451-4000-b000-000000000000'
var MRUBY_CHAR_UUID      = 'f0001525-0451-4000-b000-000000000000'



// BLEスキャン時の onScan イベントハンドラ
//　選択したデバイス名を表示する
ble.onScan = (deviceName) => {
    document.getElementById('device_name').innerHTML = deviceName
    document.getElementById('device_status').innerHTML = 'Connecting...'
}


// 転送中のプログレス表示
const transferProgress = (val) => {
    document.getElementById('transfer_progress').innerHTML = val + ' %'
}

// mrbを分割して 16バイト分を転送する
// 転送完了時には、コマンド 0x07 で実行させる
const transfer_mrb16 = () => {
    seq = transfer_data['seq']
    if( seq < 0 ) return
    if( seq < transfer_data['end_seq'] ){
	// 転送途中
	cmd = [0x06,
	       seq/256|0, seq%256,
	       0, 0, 0, 0, 0, 0, 0, 0,
	       0, 0, 0, 0, 0, 0, 0, 0
	      ]
	transfer_data['seq'] = seq+1
	// バイトコードをコピー
	var bytecode = new Uint8Array(transfer_data['bytecode'])
	for( var i=0 ; i<16 ; i++ ){
	    if( seq*16+i < bytecode.byteLength ){
		cmd[i+3] = bytecode[seq * 16 + i]
	    }
	}
	console.log('seq=', seq)
	ble.write('mrubyc', cmd).then( () => {
	    transferProgress( 100*seq/transfer_data['end_seq'] | 0 )
	})
    } else {
	// 転送完了＆実行
	transfer_data['seq'] = -1
	cmd = [0x07]
	console.log('cmd 0x07')
	ble.write("mrubyc", cmd).then( () => {
	    transferProgress( 100 )
	})
    }
}


// BLE書き込み時の onWrite イベントハンドラ
// バイトコード転送の際には、書き込みが連続するので、
// 書き込み完了を確認する必要がある
ble.onWrite = (deviceName) => {
    if( deviceName == 'mrubyc' ){
	if( transfer_data['seq'] < 0 ) return
	//	transfer_mrb16()
	window.setTimeout(transfer_mrb16, TRANSFER_WAIT_MS);
    }
}


// BLEからデータを取り出す
ble.onRead = (data,deviceName) => {
}

// GATT接続した
ble.onConnectGATT = (deviceName) => {
    document.getElementById('device_status').innerHTML = 'Connected'}

//　切断処理
ble.onDisconnect = (deviceName) => {
    document.getElementById('device_status').innerHTML = 'Disconnected'
}


// ドラッグ中
const handleDragOver = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy';
}

// ドロップした
const handleFileSelect = (evt) => {
    evt.stopPropagation();
    evt.preventDefault();
    
    var files = evt.dataTransfer.files; 

    var file_name = ""
    mrb_files = [];
    for( file of files ){
	mrb_files.push(file)
	console.log(file)
	if( file_name != "" ) file_name += ", "
	file_name += file.name
    }

    var mrb_files_text  = document.getElementById('mrb_files_text');
    mrb_files_text.innerHTML = file_name
}


// ページを表示した際に設定をする
const page_load = () => {
    //UUIDの設定
    ble.setUUID("battery", BATTERY_SERVICE_UUID, BATTERY_CHAR_UUID) 
    ble.setUUID("mrubyc", MRUBY_SERVICE_UUID, MRUBY_CHAR_UUID)
    // ドラッグ＆ドロップイベント
    var dropFrame = document.getElementById('drop_area');
    dropFrame.addEventListener('dragover', handleDragOver, false);
    dropFrame.addEventListener('drop', handleFileSelect, false);
}


// [scan & connect] ボタン
const scan_onclick = () => {
    ble.scan('mrubyc').then( () => {
	return ble.connectGATT('mrubyc')
    }).catch( error => {
	console.log('error in scan')
	this.onError(error)
    })
}

// [disconnect] ボタン
const disconnect_onclick = () => {
    ble.reset()
}

// [LED Off] ボタン
const led_off_onclick = () => {
    cmd = [0x00]
    ble.write("mrubyc", cmd)
}

// [LED On] ボタン
const led_on_onclick = () => {
    cmd = [0x01]
    ble.write("mrubyc", cmd)
}

// [Battery Level] ボタン
const battery_onclick = () => {
    ble.read('battery')
}

// [Flash Erase] ボタン
const flash_erase_onclick = () => {
    ble.write('mrubyc', [0x05]).then( () => {
	ble.write('mrubyc', [0x04])
    })
}

// [Version] ボタン
const version_onclick = () => {
    cmd = [0x02]
    ble.write("mrubyc", cmd).then( () => {
	return ble.read("mrubyc")
    }).then( (data) => {
	var ary = new Uint8Array(data.buffer)
	var i = 0
	var str = ""
	while( i<ary.length && ary[i] != 0 ){
	    str += String.fromCharCode(ary[i])
	    i++
	}
	document.getElementById('version_text').innerHTML = str
    })
}


// 符号なし整数を符号付きに変換する
const u2s = (u_val) => {
    if( u_val & 0x8000 != 0 ){
	return -1 * (u_val ^ 0xffff) + 1
    } else {
	return u_val
    }
}


// [Get sensor values1] ボタン
const getsensor1_onclick = () => {
    cmd = [0x20]
    ble.write("mrubyc", cmd).then( () => {
	return ble.read("mrubyc")
    }).then( (data) => {
	// センサデータ（RAWデータ）を取得
	// データの内容については、SenStickファームウェア
	// 最新の情報は sensor_manager.h の記載を参照すること
	//   ary[1,0]      湿度
	//   ary[3,2]      温度
	//   ary[5,4]      照度
	//   ary[7,6]      UV
	//   ary[10..8]    気圧
	//   ary[11]       (PADDING)
	const ary = new Uint8Array(data.buffer)
	// 湿度
	var v = 125.0 * (ary[0] + ary[1] * 256.0) / 65536.0 - 6.0;
	document.getElementById('sensor_value_humidity_text').innerHTML = v.toFixed(2)
	// 温度
	var v = 175.72 * (ary[2] + ary[3] * 256.0) / 65536.0 - 46.85;
	document.getElementById('sensor_value_temperature_text').innerHTML = v.toFixed(2)
	// 照度
	var v = ary[4] + ary[5] * 256.0;
	document.getElementById('sensor_value_brightness_text').innerHTML = v.toFixed(2)
	// UV
	var v = ary[6] + ary[7] * 256.0;
	document.getElementById('sensor_value_uv_text').innerHTML = v.toFixed(2)
	// 気圧
	var v = (ary[8] + (ary[9] + ary[10] * 256.0) * 256.0) / 4096.0;
	document.getElementById('sensor_value_airpressure_text').innerHTML = v.toFixed(2)
    })
}


// [Get sensor values2] ボタン
const getsensor2_onclick = () => {
    cmd = [0x21]
    ble.write("mrubyc", cmd).then( () => {
	return ble.read("mrubyc")
    }).then( (data) => {
	const ary = new Uint8Array(data.buffer)
	//   ary[5..0]   地磁気(x,y,z)
	//   ary[11..6]  加速度(x,y,z)
	// 地磁気(x,y,z)
	var vx = u2s( ary[1] + ary[0]*256 ) * 4912.0 / 32768.0;
	var vy = u2s( ary[3] + ary[2]*256 ) * 4912.0 / 32768.0;
	var vz = u2s( ary[5] + ary[4]*256 ) * 4912.0 / 32768.0;
	document.getElementById('sensor_value_magnetic_text').innerHTML = "( " + vx.toFixed(2) + " , " + vy.toFixed(2) + " , " +  vz.toFixed(2) + " )"
	// 加速度(x,y,z)
	var vx = u2s( ary[7] + ary[6]*256 ) * 2.0 / 32768.0;
	var vy = u2s( ary[9] + ary[8]*256 ) * 2.0 / 32768.0;
	var vz = u2s( ary[11] + ary[10]*256 ) * 2.0 / 32768.0;
	document.getElementById('sensor_value_acc_text').innerHTML = "( " + vx.toFixed(2) + " , " + vy.toFixed(2) + " , " +  vz.toFixed(2) + " )"
    })
}


// [Send] ボタン
const packet_send_onclick = () => {
    hex = document.getElementById('packet_hex').value
    if( hex.length < 2 || (hex.length % 2) == 1 ){
	console.error('Invalid hex value: ', hex)
	return
    }
    cmd = new Uint8Array(hex.length / 2)
    for( i=0 ; i<hex.length/2 ; i++ ){
	cmd[i] = parseInt(hex[i*2],16) * 16 + parseInt(hex[i*2+1],16)
    }
    console.log(cmd)
    ble.write("mrubyc", cmd);
}

// [Transfer] ボタン
const transfer_onclick = () => {
    var reader = new FileReader()
    if( mrb_files.length == 1 ){
	// 単一バイトコードの場合
	// 転送バイト列は mrbファイルそのまま
	reader.onload = () => {
	    transfer_data.bytecode = reader.result
	    transfer_data.seq = 0
	    transfer_data.end_seq = (reader.result.byteLength+15) / 16 | 0
	    // onWriteイベント発生
	    ble.write("mrubyc", [0x00])
	}
	reader.readAsArrayBuffer(mrb_files[0])
    } else {
	var seq = 0
	var bytecode_length = 0
	var bytecodes = []
	// 複数バイトコードの場合
	reader.onload = () => {
	    bytecode_length += reader.result.byteLength
	    bytecodes.push(reader.result)
	    seq++
	    if( seq < mrb_files.length ){
		// 次のファイルを読み込み開始する
		reader.readAsArrayBuffer(mrb_files[seq])
	    } else {
		// 最後のファイルを読み終わった
		// 転送するデータ長＝バイトコード(bytecode_length)＋ヘッダ情報(8)
		var buffer = new ArrayBuffer(bytecode_length + 8)
		var dst = new Uint8Array(buffer)
		// ヘッダ情報を初期化
		var offset = 8
		for( i=0 ; i<4 ; i++ ){
		    if( i >= mrb_files.length ){
			dst[i*2]   = 0
			dst[i*2+1] = 0
			continue
		    }
		    // ヘッダ情報
		    dst[i*2]   = bytecodes[i].byteLength % 256
		    dst[i*2+1] = bytecodes[i].byteLength / 256 | 0
		    // バイトコードをコピーする
		    var src = new Uint8Array(bytecodes[i])
		    for( j=0 ; j<src.length ; j++ ){
			dst[offset+j] = src[j]
		    }
		    offset += bytecodes[i].byteLength
		}
		transfer_data.bytecode = buffer
		transfer_data.seq = 0
		transfer_data.end_seq = (buffer.byteLength+15) / 16 | 0
		// onWriteイベント発生
		ble.write("mrubyc", [0x00])
	    }
	}
	// 最初のファイルを読み込み開始する
	reader.readAsArrayBuffer(mrb_files[seq])
    }
}


// SenStickからの返り値を値に変換する
const convert_from_senstick_value = (buffer) => {
    var src = new Uint8Array(buffer)
    var conv = new ArrayBuffer(8)
    var dst_uint8 = new Uint8Array(conv)
    for( i=0 ; i<8 ; i++ ) dst_uint8[i] = src[i+1]
    switch(src[0]){
    case 0:
	return 'null'
	break;
    case 1:
	var dst_int32 = new Int32Array(conv)
	return dst_int32[0]
	break;
    case 2:
	var dst_float64 = new Float64Array(conv)
	return dst_float64[0]
	break;
    default:
	return 'unknown'
	break;
    }
}



// SenStickへ送る値に変換する
// typeでデータ型を指定する
const convert_to_senstick_value = (value) => {
    // データ型チェック
    var num = Number(value)
    console.log(num)
    var datatype = null  // nil
    if( !Number.isNaN(num) ){
	if( value.indexOf('.') >= 0 ){
	    datatype = "float"
	} else {
	    datatype = "int"
	}
    }
    // データ型ごとの値設定
    var buffer = new ArrayBuffer(9)
    var conv = new ArrayBuffer(8)
    var dst_uint8 = new Uint8Array(conv)
    switch(datatype){
    case "int":  // int
	var dst_int32 = new Int32Array(conv)
	buffer[0] = 1
	dst_int32[0] = num
	break
    case "float":  // float
	var dst_float64 = new Float64Array(conv)
	buffer[0] = 2
	dst_float64[0] = num
	break
    default:
	buffer[0] = 0
	break
    }
    // データをコピー
    for( i=0 ; i<8 ; i++ ) buffer[i+1] = dst_uint8[i]
    return buffer
}


// [Read] ボタン
const variable_read_onclick = () => {
    var cmd = [0x10, 0x24]
    // 変数名を格納する
    var variable_name = document.getElementById('variable_name').value
    var len = variable_name.length
    if( len > 8 ) len = 8
    for( i=0 ; i<len ; i++ ){
	cmd.push( variable_name.charCodeAt(i) )
    }
    cmd.push( 0 )
    // 値を取得する
    ble.write("mrubyc", cmd).then( () => {
	return ble.read("mrubyc")
    }).then( (data) => {
	var value = convert_from_senstick_value(data.buffer)
	document.getElementById('variable_value_get').value = value	
    })
}

// [Write] ボタン
const variable_write_onclick = () => {
    var cmd = [0x11, 0x24]
    // 変数名を格納する
    var variable_name = document.getElementById('variable_name').value
    var len = variable_name.length
    if( len > 8 ) len = 8
    for( i=0 ; i<len ; i++ ){
	cmd.push( variable_name.charCodeAt(i) )
    }
    cmd.push( 0 )
    //
    buffer = convert_to_senstick_value(
	document.getElementById('variable_value_set').value
    )
    // 値を格納する
    for( i=0 ; i<9 ; i++ ){
	cmd.push( buffer[i] )
    }
    console.log(cmd)
    // 書き込み
    ble.write("mrubyc", cmd)
}
