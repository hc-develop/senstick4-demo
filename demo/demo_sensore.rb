# センサー値取得
$tempVal = nil
$hmVal = nil
$lxVal = nil
$uvVal = nil
$isInit = true
# 初期化（LEDを５秒点灯）
led 1
senstick = SenStickIF.new([:uv, :brightness, :temperature, :humidity])
sleep 5
led 0
$isInit = false
while true do
  # センサー値取得
  $uvVal = senstick.get(:uv)
  # puts $uvVal
  $lxVal = senstick.get(:brightness)
  # puts $lxVal
  $hmVal = senstick.get(:humidity)
  # puts $hmVal
  $tempVal = senstick.get(:temperature)
  # puts $tempVal
  sleep 1
end
