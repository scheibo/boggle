#!/usr/bin/env ruby

CUTOFF = 275 #Float::INFINITY

$dict = {}
File.open('/usr/local/google/home/kjs/wordlists/data/csw.txt').each_line do |line|
  line.chomp!
  word, defn = line.split(' ', 2)
  $dict[word] = defn
end

def output(same, num)
  defns = same.map {|w| "#{w} = #{$dict[w]}"}.join("\n")
  puts "#{num}: #{same.join(' ')}\n-----------------\n#{defns}\n\n"
end

words = 0
same = []
num = 0
ARGF.each_line do |line|
  break if num >= CUTOFF
  line.chomp!
  if !same.empty?
    if same[0].chars.sort.join != line.chars.sort.join
      num += 1
      output(same, num)
      words += same.length
      same = [line]
      next
    end
  end
  same << line
end
num += 1
output(same, num) if num < CUTOFF
#p words
