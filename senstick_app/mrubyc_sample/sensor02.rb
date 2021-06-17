# coding: utf-8
# SenStickIFクラスを使う例
# newの引数にセンサを1つ指定しています

t = SenStickIF.new(:temperature)

while true do
  $temp = t.get(:temperature)
  sleep 1
end
