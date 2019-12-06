
This is a demo app used for my dotJS 2019 talk "CRDTs for Mortals".

Slides here: https://jlongster.com/s/dotjs-crdt-slides.pdf

View this app here: https://crdt.jlongster.com

It contains a full implementation of [hybrid logical clocks](https://cse.buffalo.edu/tech-reports/2014-04.pdf) to generate timestamp for causal ordering of messages. Using these timestamps, CRDTs can be easily used to change local data that also syncs to multiple devices. This also contains an implementation of a merkle tree to check consistency of the data to make sure all clients are in sync.

It provides a server to store and retrieve messages, so that clients don't have to connect peer-to-peer.

The entire implementation is tiny, but provides a robusy mechanism for writing distributed apps:

* Server: 132 lines of JS
* Client: 639 lines of JS

(This does not include `main.js` in the client which is the implementation of the app. This is just showing the tiny size of everything needed to build an app)


Links:

* Actual: https://actualbudget.com/
* Hybrid logical clocks: https://cse.buffalo.edu/tech-reports/2014-04.pdf
* CRDTs: https://bit.ly/2DMk0AD
* Live app: https://crdt.jlongster.com/
