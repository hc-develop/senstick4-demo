# coding: utf-8
# SenStickIFで複数のセンサを使う例
# newの引数に、使いたいセンサの配列を渡す

t = SenStickIF.new([:temperature,:brightness])

while true do
  $temp = t.get(:temperature)
  $bright = t.get(:brightness)
  sleep 1
end
