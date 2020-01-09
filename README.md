# Boggle

[Boggle](https://en.wikipedia.org/wiki/Boggle) is a word game in which players
attempt attempt to find words in sequences of adjacent letters. Unlike the
numerous other online implementations of the Boggle game (which are often
released under various different names to avoid trademark infringement), this
application exists to provide a lightweight, minimalistic user interface and
power-user features which aim to help a player improve.

Boggle can played in any modern browser and any device with a minimum display of
at least 360x550px. The implementation relies on the [Service Worker
API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
to ensure it will work completely offline, and can be installed to one's desktop
or phone homescreen if desired.

The Boggle board game has been released with various **dice configurations**
over the years. This implementation supports the three most common English [dice
distributions](http://www.luke-g.com/boggle/dice.html), including the 5x5
distribution for 'Big Boggle'. The 6x6 'Super Big Boggle' distribution is not
supported.

4x4 configurations of Boggle typically mandate that a legal word must be at
least 3 characters long, with the 5x5 Big Boggle further restricting the legal
word size to at least 4 chracters. This implementation follows these defaults,
but also allows the player to change the **minimum word length** restriction
independent of board size, allowing 3, 4, or 5 letter words to be the minimum
allowed.

Boggle has no official **dictionary**, so instead this implementation relies on
the two canonical Scrabble dictionaries -
[TWL](https://en.wikipedia.org/wiki/NASPA_Word_List)
and [CSW](https://en.wikipedia.org/wiki/Collins_Scrabble_Words). By default, the
more restrictive American and Canadian TWL is used.


## WIP

```
## Implementation

- talk about efficiency of dictionary encoding/trie
http://stevehanov.ca/blog/?id=120

http://www.luke-g.com/boggle/index.html

images:

http://www.luke-g.com/boggle/index.html

0+) images of existing apps

1) main board (include underlines)
2) big boggle (include Qu)
3) settings pane
4) score pane
5) training pane
6) heatmap

gif showing
1) play word + show def
2) suffix shortcut
3) play invalid word (red)
4) play duplicate

heatmap
training
goals/grades

scoring breakdown
shortcut mode
timer continues past 0, score tracks what you got before and after
```

