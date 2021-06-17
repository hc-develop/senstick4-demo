# SenStick4 mruby/c デモ
---
## 概要
mruby/cを搭載したセンサーデバイス(SenStick4)を利用したデモアプリです。  
### SenStick4 側でmrubyアプリを実行
- センサー(温度・湿度・照度・UV)値を取得  
- しきい値判定しLED点灯
### ブラウザでBLE通信
- mrubyで取得したセンサー値を取得  
- ブラウザで設定したしきい値をmrubyに設定  

## デモmrubyソース書き込み
- 書き込みページ遷移  
- scan & connect 押下し SenStickを選択しConnected になることを確認  
- SCANで表示されないときはSenStickのリセットスイッチを押下する  
- Flash Erase を押下し、赤LEDが点滅することを確認  
- デモバイトコード(demo_led.mrb,demo_sensore.mrb)をドラッグ  
- Transfer を押下  
- 赤LEDが５秒点灯することを確認  
- SenStickのリセットスイッチを押下後、赤LEDが５秒点灯することを確認  

## セットアップ
- `npm install` 実行  

## 実行
- `npm start` 実行  
`http://localhost:3000/`でブラウザが起動
- ナビバーの接続ボタンを押下
- デバイスが表示されるのでSenStickを選択
 環境に合わせて温度と明るさのしきい値を変更

## 情報
SenStick4について  
http://senstick.ruby-b.com/
