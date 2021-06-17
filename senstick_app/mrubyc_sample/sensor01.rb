# このサンプルは、SenStickIFクラスを使っていません

$tt = 123

initHumiditySensor
sleep 0.5

$tt = 3

while true do
  $tt += 10
  triggerTemperatureMeasurement
  sleep 0.5
  $temp = getTemperatureData 
  sleep 1
end
