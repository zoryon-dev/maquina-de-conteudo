Instagram Search Scraper

import { ApifyClient } from 'apify-client';

// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: '<YOUR_API_TOKEN>',
});

// Prepare Actor input
const input = {
    "search": "restaurant",
    "searchType": "hashtag",
    "searchLimit": 1
};

(async () => {
    // Run the Actor and wait for it to finish
    const run = await client.actor("DrF9mzPPEuVizVF4l").call(input);

    // Fetch and print Actor results from the run's dataset (if any)
    console.log('Results from dataset');
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    items.forEach((item) => {
        console.dir(item);
    });
})();

# Set API token
API_TOKEN=<YOUR_API_TOKEN>

# Prepare Actor input
cat > input.json <<'EOF'
{
  "search": "restaurant",
  "searchType": "hashtag",
  "searchLimit": 1
}
EOF

# Run the Actor
curl "https://api.apify.com/v2/acts/DrF9mzPPEuVizVF4l/runs?token=$API_TOKEN" \
  -X POST \
  -d @input.json \
  -H 'Content-Type: application/json'

  ==================

  VIA API

  Run Actor
View API reference
Runs this Actor. The POST payload including its Content-Type header is passed as INPUT to the Actor (typically application/json). The Actor is started with the default options; you can override them using various URL query parameters.

POST
https://api.apify.com/v2/acts/apify~instagram-search-scraper/runs?token=<YOUR_API_TOKEN>


Hint: By adding the method=POST query parameter, this API endpoint can be called using a GET request and thus used in third-party webhooks.

Run Actor synchronously and get a key-value store record
View API reference
Runs this Actor and waits for it to finish. The POST payload, including its Content-Type, is passed as Actor input. The OUTPUT record (or any other specified with the outputRecordKey query parameter) from the default key-value store is returned as the HTTP response. The Actor is started with the default options; you can override them using various URL query parameters. Note that long HTTP connections might break.

POST
https://api.apify.com/v2/acts/apify~instagram-search-scraper/run-sync?token=<YOUR_API_TOKEN>


Hint: This endpoint can be used with both POST and GET request methods, but only the POST method allows you to pass input.

Run Actor synchronously and get dataset items
View API reference
Runs this Actor and waits for it to finish. The POST payload including its Content-Type header is passed as INPUT to the Actor (usually application/json). The HTTP response contains the Actor's dataset items, while the format of items depends on specifying dataset items' format parameter.

POST
https://api.apify.com/v2/acts/apify~instagram-search-scraper/run-sync-get-dataset-items?token=<YOUR_API_TOKEN>


Hint: This endpoint can be used with both POST and GET request methods, but only the POST method allows you to pass input.

Get Actor
View API reference
Returns settings of this Actor in JSON format.

GET
https://api.apify.com/v2/acts/apify~instagram-search-scraper?token=<YOUR_API_TOKEN>



Test endpoint

Get a list of Actor versions
View API reference
Returns a list of versions of this Actor in JSON format.

GET
https://api.apify.com/v2/acts/apify~instagram-search-scraper/versions?token=<YOUR_API_TOKEN>



Test endpoint

Get a list of Actor webhooks
View API reference
Returns a list of webhooks of this Actor in JSON format.

GET
https://api.apify.com/v2/acts/apify~instagram-search-scraper/webhooks?token=<YOUR_API_TOKEN>

