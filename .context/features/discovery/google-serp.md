Google Search Results Scraper

apify/google-search-scraper

Run Actor
View API reference
Runs this Actor. The POST payload including its Content-Type header is passed as INPUT to the Actor (typically application/json). The Actor is started with the default options; you can override them using various URL query parameters.

POST
https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=***


Hint: By adding the method=POST query parameter, this API endpoint can be called using a GET request and thus used in third-party webhooks.

Run Actor synchronously and get a key-value store record
View API reference
Runs this Actor and waits for it to finish. The POST payload, including its Content-Type, is passed as Actor input. The OUTPUT record (or any other specified with the outputRecordKey query parameter) from the default key-value store is returned as the HTTP response. The Actor is started with the default options; you can override them using various URL query parameters. Note that long HTTP connections might break.

POST
https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync?token=***


Hint: This endpoint can be used with both POST and GET request methods, but only the POST method allows you to pass input.

Run Actor synchronously and get dataset items
View API reference
Runs this Actor and waits for it to finish. The POST payload including its Content-Type header is passed as INPUT to the Actor (usually application/json). The HTTP response contains the Actor's dataset items, while the format of items depends on specifying dataset items' format parameter.

POST
https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=***


Hint: This endpoint can be used with both POST and GET request methods, but only the POST method allows you to pass input.

Get Actor
View API reference
Returns settings of this Actor in JSON format.

GET
https://api.apify.com/v2/acts/apify~google-search-scraper?token=***



Test endpoint

Get a list of Actor versions
View API reference
Returns a list of versions of this Actor in JSON format.

GET
https://api.apify.com/v2/acts/apify~google-search-scraper/versions?token=***



Test endpoint

Get a list of Actor webhooks
View API reference
Returns a list of webhooks of this Actor in JSON format.

GET
https://api.apify.com/v2/acts/apify~google-search-scraper/webhooks?token=***



Test endpoint

Update Actor
View API reference
Updates settings of this Actor. The POST payload must be a JSON object with fields to update.

PUT
https://api.apify.com/v2/acts/apify~google-search-scraper?token=***


Update Actor version
View API reference
Updates version of this Actor. Replace the 0.0 with the updating version number. The POST payload must be a JSON object with fields to update.

PUT
https://api.apify.com/v2/acts/apify~google-search-scraper/versions/0.0?token=***


Delete Actor
View API reference
Deletes this Actor and all associated data.

DELETE
https://api.apify.com/v2/acts/apify~google-search-scraper?token=***


Get a list of builds
View API reference
Returns a list of builds of this Actor in JSON format.

GET
https://api.apify.com/v2/acts/apify~google-search-scraper/builds?token=***



Test endpoint

Build Actor
View API reference
Builds a specific version of this Actor and returns information about the build. Replace the 0.0 parameter with the desired version number.

POST
https://api.apify.com/v2/acts/apify~google-search-scraper/builds?token=***&version=0.0


Hint: By adding the method=POST query parameter, this API endpoint can be called using a GET request and thus used in third-party webhooks.

Get a list of runs
View API reference
Returns a list of runs of this Actor in JSON format.

GET
https://api.apify.com/v2/acts/apify~google-search-scraper/runs?token=***



Test endpoint

Get last run
View API reference
Returns the last run of this Actor in JSON format.

GET
https://api.apify.com/v2/acts/apify~google-search-scraper/runs/last?token=***



Test endpoint

Hint: Add the status=SUCCEEDED query parameter to only get the last successful run of the Actor.

Get last run dataset items
View API reference
Returns data from the default dataset of the last run of this Actor in JSON format.

GET
https://api.apify.com/v2/acts/apify~google-search-scraper/runs/last/dataset/items?token=***



Test endpoint

Hint: Add the status=SUCCEEDED query parameter to only get the last successful run of the Actor. This API endpoint supports all the parameters of the Dataset Get Items endpoint.

Get OpenAPI definition
View API reference
Returns the OpenAPI definition for the Actor's default build with information on how to run this Actor build using the API.

GET
https://api.apify.com/v2/acts/apify~google-search-scraper/builds/default/openapi.json



import { ApifyClient } from 'apify-client';

// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: '<YOUR_API_TOKEN>',
});

// Prepare Actor input
const input = {
    "queries": `javascript
        typescript
        python`,
    "resultsPerPage": 100,
    "maxPagesPerQuery": 1,
    "aiMode": "aiModeOff",
    "perplexitySearch": {
        "enablePerplexity": false,
        "returnImages": false,
        "returnRelatedQuestions": false
    },
    "maximumLeadsEnrichmentRecords": 0,
    "focusOnPaidAds": false,
    "searchLanguage": "",
    "languageCode": "",
    "forceExactMatch": false,
    "wordsInTitle": [],
    "wordsInText": [],
    "wordsInUrl": [],
    "mobileResults": false,
    "includeUnfilteredResults": false,
    "saveHtml": false,
    "saveHtmlToKeyValueStore": true,
    "includeIcons": false
};

(async () => {
    // Run the Actor and wait for it to finish
    const run = await client.actor("nFJndFXA5zjCTuudP").call(input);

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
  "queries": "javascript\ntypescript\npython",
  "resultsPerPage": 100,
  "maxPagesPerQuery": 1,
  "aiMode": "aiModeOff",
  "perplexitySearch": {
    "enablePerplexity": false,
    "returnImages": false,
    "returnRelatedQuestions": false
  },
  "maximumLeadsEnrichmentRecords": 0,
  "focusOnPaidAds": false,
  "searchLanguage": "",
  "languageCode": "",
  "forceExactMatch": false,
  "wordsInTitle": [],
  "wordsInText": [],
  "wordsInUrl": [],
  "mobileResults": false,
  "includeUnfilteredResults": false,
  "saveHtml": false,
  "saveHtmlToKeyValueStore": true,
  "includeIcons": false
}
EOF

# Run the Actor
curl "https://api.apify.com/v2/acts/nFJndFXA5zjCTuudP/runs?token=$API_TOKEN" \
  -X POST \
  -d @input.json \
  -H 'Content-Type: application/json'


  Exemplo de resultado: 

  [
  {
    "searchQuery": {
      "term": "inteligencia artificial",
      "url": "http://www.google.com/search?q=inteligencia+artificial",
      "device": "DESKTOP",
      "page": 1,
      "type": "SEARCH",
      "domain": "google.com",
      "countryCode": "US",
      "languageCode": null,
      "locationUule": null,
      "resultsPerPage": 10
    },
    "resultsTotal": null,
    "relatedQueries": [
      {
        "title": "Ejemplos de inteligencia artificial",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Ejemplos+de+inteligencia+artificial&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhGEAE"
      },
      {
        "title": "Chat con inteligencia artificial",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Chat+con+inteligencia+artificial&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhUEAE"
      },
      {
        "title": "Inteligencia artificial UNESCO",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Inteligencia+artificial+UNESCO&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhTEAE"
      },
      {
        "title": "Inteligencia Artificial Argentina",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Inteligencia+Artificial+Argentina&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhQEAE"
      },
      {
        "title": "Inteligencia artificial general",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Inteligencia+artificial+general&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhPEAE"
      },
      {
        "title": "Ventajas de la inteligencia artificial",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Ventajas+de+la+inteligencia+artificial&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhMEAE"
      },
      {
        "title": "Inteligencia artificial en la educación",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Inteligencia+artificial+en+la+educaci%C3%B3n&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhJEAE"
      },
      {
        "title": "Wikipedia inteligencia artificial",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Wikipedia+inteligencia+artificial&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhIEAE"
      },
      {
        "title": "Ejemplos de inteligencia artificial",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Ejemplos+de+inteligencia+artificial&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhGEAE"
      },
      {
        "title": "Chat con inteligencia artificial",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Chat+con+inteligencia+artificial&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhUEAE"
      },
      {
        "title": "Inteligencia artificial UNESCO",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Inteligencia+artificial+UNESCO&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhTEAE"
      },
      {
        "title": "Inteligencia Artificial Argentina",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Inteligencia+Artificial+Argentina&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhQEAE"
      },
      {
        "title": "Inteligencia artificial general",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Inteligencia+artificial+general&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhPEAE"
      },
      {
        "title": "Ventajas de la inteligencia artificial",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Ventajas+de+la+inteligencia+artificial&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhMEAE"
      },
      {
        "title": "Inteligencia artificial en la educación",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Inteligencia+artificial+en+la+educaci%C3%B3n&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhJEAE"
      },
      {
        "title": "Wikipedia inteligencia artificial",
        "url": "https://www.google.com/search?sca_esv=b13ba407a35da16c&hl=en&q=Wikipedia+inteligencia+artificial&sa=X&ved=2ahUKEwinq9Wq3aGSAxXvqZUCHT3pHrwQ1QJ6BAhIEAE"
      }
    ],
    "aiOverview": {
      "type": "live",
      "content": "La Inteligencia Artificial (IA) es un conjunto de tecnologías que permiten a las computadoras simular procesos de inteligencia humana, como el aprendizaje, el razonamiento, la percepción y la creatividad. Estas máquinas analizan grandes volúmenes de datos para detectar patrones, resolver problemas complejos y tomar decisiones o realizar acciones de forma autónoma.Aspectos clave de la Inteligencia Artificial:La IA es considerada una tecnología transformadora que busca automatizar tareas que tradicionalmente requerían inteligencia humana.",
      "sources": [
        {
          "url": "https://cloud.google.com/learn/what-is-artificial-intelligence?hl=es-419#:~:text=La%20Inteligencia%20Artificial%20(IA)%20es,ayuda%20a%20descubrir%20estad%C3%ADsticas%20valiosas.",
          "title": "¿Qué es la inteligencia artificial o IA? - Google Cloud",
          "description": "La Inteligencia Artificial (IA) es un conjunto de tecnologías que permite a las computadoras aprender, razonar y realizar una vari..."
        },
        {
          "url": "https://www.telefonica.com/es/sala-comunicacion/blog/que-es-y-como-funciona-la-inteligencia-artificial/#:~:text=%C2%BFQu%C3%A9%20es%20la%20Inteligencia%20Artificial,un%20%C3%A1mbito%20con%20aplicaciones%20universales.",
          "title": "Qué es y cómo funciona la Inteligencia Artificial - Telefónica",
          "description": "Nov 25, 2022 — ¿Qué es la Inteligencia Artificial? La Inteligencia Artificial es la capacidad que tienen las máquinas de imitar la manera en la q..."
        },
        {
          "url": "https://www.ibm.com/mx-es/think/topics/artificial-intelligence#:~:text=La%20inteligencia%20artificial%20(IA)%20es,de%20inteligencia%20o%20intervenci%C3%B3n%20humana",
          "title": "¿Qué es la inteligencia artificial o IA? - IBM",
          "description": "La inteligencia artificial (IA) es una tecnología que permite a las computadoras y máquinas simular el aprendizaje humano, la comp..."
        }
      ]
    },
    "paidResults": [],
    "paidProducts": [],
    "organicResults": [
      {
        "title": "Inteligencia artificial - Wikipedia, la enciclopedia libre",
        "url": "https://es.wikipedia.org/wiki/Inteligencia_artificial",
        "displayedUrl": "https://es.wikipedia.org › wiki › In...",
        "description": "La inteligencia artificial, abreviado como IA, en el contexto de las ciencias de la computación, es una disciplina y un conjunto de capacidades cognoscitivas e ...Read more",
        "emphasizedKeywords": [
          "La inteligencia artificial, abreviado como IA"
        ],
        "siteLinks": [],
        "productInfo": {},
        "type": "organic",
        "position": 1
      },
      {
        "title": "Google Gemini",
        "url": "https://gemini.google.com/?hl=es",
        "displayedUrl": "https://gemini.google.com › ...",
        "description": "Descubre Gemini, el asistente de IA de Google. Puedes pedirle que te ayude a escribir, a hacer planes o a explorar ideas, entre otras cosas.",
        "emphasizedKeywords": [
          "Gemini, el asistente de IA de Google"
        ],
        "siteLinks": [],
        "productInfo": {},
        "type": "organic",
        "position": 2
      },
      {
        "title": "¿Qué es la inteligencia artificial o IA?",
        "url": "https://cloud.google.com/learn/what-is-artificial-intelligence?hl=es-419",
        "displayedUrl": "https://cloud.google.com › learn",
        "description": "La Inteligencia Artificial (IA) es un conjunto de tecnologías que permite a las computadoras aprender, razonar y realizar una variedad de tareas avanzadas de ...Read more",
        "emphasizedKeywords": [
          "Inteligencia Artificial",
          "IA"
        ],
        "siteLinks": [],
        "productInfo": {},
        "type": "organic",
        "position": 3
      },
      {
        "title": "¿Qué es la Inteligencia Artificial?",
        "url": "https://www.argentina.gob.ar/justicia/convosenlaweb/situaciones/que-es-la-inteligencia-artificial",
        "displayedUrl": "https://www.argentina.gob.ar › qu...",
        "description": "La UNESCO definió a la Inteligencia Artificial (IA) como “máquinas capaces de imitar ciertas funcionalidades de la inteligencia humana incluyendo la percepción, ...Read more",
        "emphasizedKeywords": [
          "Inteligencia Artificial",
          "IA"
        ],
        "siteLinks": [],
        "productInfo": {},
        "type": "organic",
        "position": 4
      },
      {
        "title": "Inteligencia Artificial",
        "url": "https://www.unesco.org/es/artificial-intelligence",
        "displayedUrl": "https://www.unesco.org › artificial...",
        "description": "Construida a partir de data, hardware y conectividad, la IA permite que máquinas simulen aspectos de la inteligencia humana tales como la percepción, la ...Read more",
        "emphasizedKeywords": [
          "la IA permite que máquinas simulen aspectos de la inteligencia humana"
        ],
        "siteLinks": [],
        "productInfo": {},
        "type": "organic",
        "position": 5
      },
      {
        "title": "¿Qué es la Inteligencia Artificial (IA)?",
        "url": "https://www.ibm.com/es-es/think/topics/artificial-intelligence",
        "displayedUrl": "https://www.ibm.com › topics › ar...",
        "description": "La inteligencia artificial (IA) es una tecnología que permite a ordenadores y máquinas simular las capacidades humanas de aprendizaje, comprensión, ...",
        "emphasizedKeywords": [
          "inteligencia artificial",
          "IA"
        ],
        "siteLinks": [],
        "productInfo": {},
        "type": "organic",
        "position": 6
      },
      {
        "title": "Inteligencia Artificial",
        "url": "https://www.youtube.com/@la_inteligencia_artificial",
        "displayedUrl": "YouTube › Inteligencia Artificial",
        "description": "CURSO IA 2026 · En este curso de Inteligencia Artificial 2026 aprenderás, paso a paso y desde cero, a crear, trabajar y dominar la IA de forma real y práctica.Read more",
        "emphasizedKeywords": [
          "CURSO IA 2026"
        ],
        "siteLinks": [],
        "productInfo": {},
        "followersAmount": "597K+ followers",
        "type": "organic",
        "position": 7
      },
      {
        "title": "¿Qué es la Inteligencia Artificial?",
        "url": "https://www.palermo.edu/ingenieria/que-es-la-inteligencia-artificial.html",
        "displayedUrl": "https://www.palermo.edu › que-es...",
        "description": "La IA es una disciplina/rama de la informática que se encarga de desarrollar sistemas capaces de realizar tareas que normalmente requieren de la inteligencia ...Read more",
        "emphasizedKeywords": [
          "La IA es una disciplina/rama de la informática"
        ],
        "siteLinks": [],
        "productInfo": {},
        "type": "organic",
        "position": 8
      }
    ],
    "peopleAlsoAsk": []
  }
]

------

Foco em Organico .