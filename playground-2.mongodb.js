// The current database to use.
use("ImageCompression");

// Find a document in a collection.
db.images.deleteMany({});
db.requests.deleteMany({});
db.getCollection("requests").find({});
