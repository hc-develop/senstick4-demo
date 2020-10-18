# しきい値判定LED制御
$tempSH = nil
$lxSH = nil

# センサーの初期化を丸待つ
sleep 1
while $isInit do
  sleep 1
end

while true do
  _led_on = 0
  # 温度センサー値判定
  if $tempSH != nil && $tempVal != nil
    if $tempSH < $tempVal
      # 温度がしきい値より高いとき赤LEDの点灯
      # puts "Temp Over"
      # puts $tempVal
      # puts $tempSH
      _led_on = 1
    end
  end
  # 照度センサー値判定
  if $lxSH != nil && $lxVal != nil
    if $lxSH < $lxVal
      # 照度がしきい値より高いとき赤LEDの点灯
      # puts "LX Over"
      # puts $lxVal
      # puts $lxSH
      _led_on = 1
    end
  end
  led _led_on
  sleep 1
end
