#!/usr/bin/env ruby
require 'set'

CUTOFF = 275 #Float::INFINITY

def groups(f)
  result = []
  same = []
  num = 0
  File.open(f).each_line do |line|
    break if num >= CUTOFF
    line.chomp!
    if !same.empty?
      if same[0].chars.sort.join != line.chars.sort.join
        num += 1
        result << same[0].chars.sort.join
        same = [line]
        next
      end
    end
    same << line
  end
  num += 1
  if num < CUTOFF
    result << same[0].chars.sort.join
  end
  result
end

g4x4n = groups('data/new4x4.txt')
g4x4o = groups('data/old4x4.txt')
g5x5 = groups('data/5x5.txt')


total = Set.new
total.merge g4x4n
total.merge g4x4o
total.merge g5x5

common = g4x4n.filter {|w| g4x4o.include?(w) && g5x5.include?(w) }

p common
