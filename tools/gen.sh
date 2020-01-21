#!/bin/sh

pids=""
for dice in 'New' 'Old' 'Big'; do
    for offset in $(seq 0 15); do
        node ./gen.js $dice $1 $offset > results/$dice-$1-$offset.json &
        pids="$pids $!"
    done
done
wait $pids
