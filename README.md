# MobilityData metrics
[Click here to view metrics dashboard](https://docs.google.com/spreadsheets/d/e/2PACX-1vRsOds1l3nNCntabcxqOdvTrVmK1nWjKAsrEoN5gCxB4rqDwrG3j2dDeWgx5pI6m24UGoiG1631fajI/pubhtml)

## Repositories
This dashboard gives information regarding the following repositories:
* [MobilityData/gtfs-validator](https://www.github.com/MobilityData/gtfs-valdiator)
* [MobilityData/gbfs](https://www.github.com/MobilityData/gbfs)
* [MobilityData/transit](https://www.github.com/MobilityData/transit)
* [NABSA/gbfs](https://www.github.com/NABSA/gbfs)
* [google/transit](https://www.github.com/google/transit)

## Implementation
Different scripts are implemented in this repository. Their execution in the following order enables rendering of the metrics dashboard.
* [FetchRawData.js](/src/scripts/FetchRawData.js) fetches raw data from the Github repositories;
* [AggregateData.js](/src/scripts/AggregateData.js) aggregates the data previously retrieved for future rendering;
* [GoogleSheetUpdater.js](/src/scripts/GoogleSheetUpdater.js) updates the google spreadsheet cells with new data.

## Automation
[Google Cloud Platform](https://cloud.google.com/) is used to automate the process. Data is refreshed every day at 9am (GMT-4). 
