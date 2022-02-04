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
This dashboard is updated on a daily basis at 10AM (GMT-4) via a Google Cloud Build that is triggered by a pub/sub message.

Note that the update of the dashboard will fail it all operations are not completed within 1200s (20 mins).

## Indicators

- comment's dates by months and quarter of the year
- issue creation date by months and quarter of the year
- pull request merge date by months and quarter of the year
- pull request creation date by months and quarter of the year
- external comments dates by months and quarter of the year
- forks creation dates by months and quarter of the year
- repository starring dates by months and quarter of the year
- repository commit dates by months and quarter of the year
- number of new issue authors by months and quarter of the year
- number of new pull request authors by months and quarter of the year
- number of new commit authors by months and quarter of the year
- number of open issues
- number of open pull requests
