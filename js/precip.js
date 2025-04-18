document.addEventListener('DOMContentLoaded', async function () {
    const currentDateTime = new Date();
    console.log("currentDateTime: ", currentDateTime);

    let setLocationCategory = null;
    let setLocationGroupOwner = null;
    let setTimeseriesGroup1 = null;
    let setLookBackHours = null;
    let reportDiv = null;

    console.log("***************************************************************");
    console.log("********************* Setup to Run Precip *********************");
    console.log("***************************************************************");
    // Set the category and base URL for API calls
    reportDiv = "precip";
    setLocationCategory = "Basins";
    setLocationGroupOwner = "Precip";
    setTimeseriesGroup1 = "Precip";
    setLookBackHours = subtractDaysFromDate(new Date(), 4);

    // Display the loading indicator for water quality alarm
    const loadingIndicator = document.getElementById(`loading_${reportDiv}`);
    loadingIndicator.style.display = 'block'; // Show the loading indicator

    console.log("setLocationCategory: ", setLocationCategory);
    console.log("setLocationGroupOwner: ", setLocationGroupOwner);
    console.log("setTimeseriesGroup1: ", setTimeseriesGroup1);
    console.log("setLookBackHours: ", setLookBackHours);

    let setBaseUrl = null;
    if (cda === "internal") {
        setBaseUrl = `https://wm.${office.toLowerCase()}.ds.usace.army.mil/${office.toLowerCase()}-data/`;
    } else if (cda === "public") {
        setBaseUrl = `https://cwms-data.usace.army.mil/cwms-data/`;
        // setBaseUrl = `https://cwms.sec.usace.army.mil/cwms-data/`;
    }
    // console.log("setBaseUrl: ", setBaseUrl);

    // Define the URL to fetch location groups based on category
    const categoryApiUrl = setBaseUrl + `location/group?office=${office}&group-office-id=${office}&category-office-id=${office}&category-id=${setLocationCategory}`;
    // console.log("categoryApiUrl: ", categoryApiUrl);

    // Initialize maps to store metadata and time-series ID (TSID) data for various parameters
    const metadataMap = new Map();
    const floodMap = new Map();
    const lwrpMap = new Map();
    const ownerMap = new Map();
    const tsidDatmanMap = new Map();
    const riverMileMap = new Map();

    // Initialize arrays for storing promises
    const metadataPromises = [];
    const floodPromises = [];
    const lwrpPromises = [];
    const ownerPromises = [];
    const datmanTsidPromises = [];
    const riverMilePromises = [];

    // Fetch location group data from the API
    fetch(categoryApiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                console.warn('No data available from the initial fetch.');
                return;
            }

            // Filter and map the returned data to basins belonging to the target category
            const targetCategory = { "office-id": office, "id": setLocationCategory };
            const filteredArray = filterByLocationCategory(data, targetCategory);
            let basins = filteredArray.map(item => item.id);
            console.log("basins: ", basins);

            // Remove Basins
            basins = basins.filter(basinId => basin.includes(basinId));
            console.log("basins: ", basins);

            if (basins.length === 0) {
                console.warn('No basins found for the given category.');
                return;
            }

            // Initialize an array to store promises for fetching basin data
            const apiPromises = [];
            const combinedData = [];

            // Loop through each basin and fetch data for its assigned locations
            basins.forEach(basin => {
                const basinApiUrl = setBaseUrl + `location/group/${basin}?office=${office}&category-id=${setLocationCategory}`;
                // console.log("basinApiUrl: ", basinApiUrl);

                apiPromises.push(
                    fetch(basinApiUrl)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Network response was not ok for basin ${basin}: ${response.statusText}`);
                            }
                            return response.json();
                        })
                        .then(getBasin => {
                            // console.log('getBasin:', getBasin);

                            if (!getBasin) {
                                // console.log(`No data for basin: ${basin}`);
                                return;
                            }

                            // Filter and sort assigned locations based on 'attribute' field
                            getBasin[`assigned-locations`] = getBasin[`assigned-locations`].filter(location => location.attribute <= 900);
                            getBasin[`assigned-locations`].sort((a, b) => a.attribute - b.attribute);
                            combinedData.push(getBasin);

                            // If assigned locations exist, fetch metadata and time-series data
                            if (getBasin['assigned-locations']) {
                                getBasin['assigned-locations'].forEach(loc => {
                                    (() => {
                                        let riverMileApiUrl = setBaseUrl + `stream-locations?office-mask=MVS`;
                                        if (riverMileApiUrl) {
                                            riverMilePromises.push(
                                                fetch(riverMileApiUrl)
                                                    .then(response => {
                                                        if (response.status === 404) {
                                                            console.warn(`River Mile data not found for location: ${loc['location-id']}`);
                                                            return null;
                                                        }
                                                        if (!response.ok) {
                                                            throw new Error(`Network response was not ok: ${response.statusText}`);
                                                        }
                                                        return response.json();
                                                    })
                                                    .then(riverMileData => {
                                                        if (riverMileData) {
                                                            // console.log("riverMileData: ", riverMileData);
                                                            riverMileMap.set(loc['location-id'], riverMileData);
                                                        }
                                                    })
                                                    .catch(error => {
                                                        console.error(`Problem with the fetch operation for river mile data at ${riverMileApiUrl}:`, error);
                                                    })
                                            );
                                        }
                                    })();

                                    (() => {
                                        let ownerApiUrl = setBaseUrl + `location/group/${setLocationGroupOwner}?office=${office}&category-id=${office}`;
                                        // console.log("ownerApiUrl: ", ownerApiUrl);
                                        if (ownerApiUrl) {
                                            ownerPromises.push(
                                                fetch(ownerApiUrl)
                                                    .then(response => {
                                                        if (response.status === 404) {
                                                            console.warn(`Datman TSID data not found for location: ${loc['location-id']}`);
                                                            return null;
                                                        }
                                                        if (!response.ok) {
                                                            throw new Error(`Network response was not ok: ${response.statusText}`);
                                                        }
                                                        return response.json();
                                                    })
                                                    .then(ownerData => {
                                                        if (ownerData) {
                                                            // console.log("ownerData", ownerData);
                                                            ownerMap.set(loc['location-id'], ownerData);
                                                        }
                                                    })
                                                    .catch(error => {
                                                        console.error(`Problem with the fetch operation for stage TSID data at ${ownerApiUrl}:`, error);
                                                    })
                                            );
                                        }
                                    })();

                                    (() => {
                                        const tsidDatmanApiUrl = setBaseUrl + `timeseries/group/${setTimeseriesGroup1}?office=${office}&category-id=${loc['location-id']}`;
                                        // console.log('tsidDatmanApiUrl:', tsidDatmanApiUrl);
                                        datmanTsidPromises.push(
                                            fetch(tsidDatmanApiUrl)
                                                .then(response => {
                                                    if (response.status === 404) return null; // Skip if not found
                                                    if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
                                                    return response.json();
                                                })
                                                .then(tsidDatmanData => {
                                                    // // console.log('tsidDatmanData:', tsidDatmanData);
                                                    if (tsidDatmanData) {
                                                        tsidDatmanMap.set(loc['location-id'], tsidDatmanData);
                                                    }
                                                })
                                                .catch(error => {
                                                    console.error(`Problem with the fetch operation for stage TSID data at ${tsidDatmanApiUrl}:`, error);
                                                })
                                        );
                                    })();
                                });
                            }
                        })
                        .catch(error => {
                            console.error(`Problem with the fetch operation for basin ${basin}:`, error);
                        })
                );
            });

            // Process all the API calls and store the fetched data
            Promise.all(apiPromises)
                .then(() => Promise.all(ownerPromises))
                .then(() => Promise.all(datmanTsidPromises))
                .then(() => Promise.all(riverMilePromises))
                .then(() => {
                    combinedData.forEach(basinData => {
                        if (basinData['assigned-locations']) {
                            basinData['assigned-locations'].forEach(loc => {
                                // Add river mile to json
                                const riverMileMapData = riverMileMap.get(loc['location-id']);
                                if (riverMileMapData) {
                                    loc['river-mile'] = riverMileMapData;
                                }

                                // Add owner to json
                                const ownerMapData = ownerMap.get(loc['location-id']);
                                if (ownerMapData) {
                                    loc['owner'] = ownerMapData;
                                }

                                // Add datman to json
                                const tsidDatmanMapData = tsidDatmanMap.get(loc['location-id']);
                                if (tsidDatmanMapData) {
                                    reorderByAttribute(tsidDatmanMapData);
                                    loc['tsid-datman'] = tsidDatmanMapData;
                                } else {
                                    loc['tsid-datman'] = null;  // Append null if missing
                                }

                                // Initialize empty arrays to hold API and last-value data for various parameters
                                loc['datman-api-data'] = [];
                                loc['datman-last-value'] = [];
                            });
                        }
                    });

                    console.log('combinedData:', combinedData);

                    const timeSeriesDataPromises = [];

                    // Iterate over all arrays in combinedData
                    for (const dataArray of combinedData) {
                        for (const locData of dataArray['assigned-locations'] || []) {
                            // Handle temperature, depth, and DO time series
                            const datmanTimeSeries = locData['tsid-datman']?.['assigned-time-series'] || [];

                            // Function to create fetch promises for time series data
                            const timeSeriesDataFetchPromises = (timeSeries, type) => {
                                return timeSeries.map((series, index) => {
                                    const tsid = series['timeseries-id'];
                                    const timeSeriesDataApiUrl = setBaseUrl + `timeseries?page-size=5000&name=${tsid}&begin=${setLookBackHours.toISOString()}&end=${currentDateTime.toISOString()}&office=${office}`;
                                    // console.log('timeSeriesDataApiUrl:', timeSeriesDataApiUrl);

                                    return fetch(timeSeriesDataApiUrl, {
                                        method: 'GET',
                                        headers: {
                                            'Accept': 'application/json;version=2'
                                        }
                                    })
                                        .then(res => res.json())
                                        .then(data => {

                                            // console.log("data: ", data);

                                            if (data.values) {
                                                data.values.forEach(entry => {
                                                    entry[0] = formatISODate2ReadableDate(entry[0]);
                                                });
                                            }

                                            // console.log("data: ", data);

                                            let apiDataKey;
                                            if (type === 'datman') {
                                                apiDataKey = 'datman-api-data'; // Assuming 'do-api-data' is the key for dissolved oxygen data
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return to avoid pushing data if type is unknown
                                            }

                                            locData[apiDataKey].push(data);

                                            let lastValueKey;
                                            if (type === 'datman') {
                                                lastValueKey = 'datman-last-value';  // Assuming 'do-last-value' is the key for dissolved oxygen last value
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return if the type is unknown
                                            }

                                            let maxValueKey;
                                            if (type === 'datman') {
                                                maxValueKey = 'datman-max-value';
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return if the type is unknown
                                            }

                                            let minValueKey;
                                            if (type === 'datman') {
                                                minValueKey = 'datman-min-value';
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return if the type is unknown
                                            }

                                            let cumValueKey;
                                            if (type === 'datman') {
                                                cumValueKey = 'datman-cum-value';
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return if the type is unknown
                                            }

                                            let incValueKey;
                                            if (type === 'datman') {
                                                incValueKey = 'datman-inc-value';
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return if the type is unknown
                                            }

                                            if (!locData[lastValueKey]) {
                                                locData[lastValueKey] = [];  // Initialize as an array if it doesn't exist
                                            }

                                            if (!locData[maxValueKey]) {
                                                locData[maxValueKey] = [];  // Initialize as an array if it doesn't exist
                                            }

                                            if (!locData[minValueKey]) {
                                                locData[minValueKey] = [];  // Initialize as an array if it doesn't exist
                                            }

                                            if (!locData[cumValueKey]) {
                                                locData[cumValueKey] = [];  // Initialize as an array if it doesn't exist
                                            }

                                            if (!locData[incValueKey]) {
                                                locData[incValueKey] = [];  // Initialize as an array if it doesn't exist
                                            }

                                            // Get and store the last non-null value for the specific tsid
                                            const lastValue = getLastNonNullValue(data, tsid);

                                            // Get and store the last max value for the specific tsid
                                            const maxValue = getMaxValue(data, tsid);
                                            // console.log("maxValue: ", maxValue);

                                            // Get and store the last min value for the specific tsid
                                            const minValue = getMinValue(data, tsid);
                                            // console.log("minValue: ", minValue);

                                            // Get and store the last min value for the specific tsid
                                            const cumValue = getCumValue(data, tsid);
                                            // console.log("cumValue: ", cumValue);

                                            // Get and store the last min value for the specific tsid
                                            const incValue = getIncValue(data, tsid);
                                            // console.log("incValue: ", incValue);

                                            // Push the last non-null value to the corresponding last-value array
                                            locData[lastValueKey].push(lastValue);

                                            // Push the last non-null value to the corresponding last-value array
                                            locData[maxValueKey].push(maxValue);

                                            // Push the last non-null value to the corresponding last-value array
                                            locData[minValueKey].push(minValue);

                                            // Push the last non-null value to the corresponding last-value array
                                            locData[cumValueKey].push(cumValue);

                                            // Push the last non-null value to the corresponding last-value array
                                            locData[incValueKey].push(incValue);
                                        })

                                        .catch(error => {
                                            console.error(`Error fetching additional data for location ${locData['location-id']} with TSID ${tsid}:`, error);
                                        });
                                });
                            };

                            // Create promises for temperature, depth, and DO time series
                            const datmanPromises = timeSeriesDataFetchPromises(datmanTimeSeries, 'datman');

                            // Additional API call for extents data
                            const timeSeriesDataExtentsApiCall = async (type) => {
                                const extentsApiUrl = setBaseUrl + `catalog/TIMESERIES?page-size=5000&office=${office}`;
                                // console.log('extentsApiUrl:', extentsApiUrl);

                                try {
                                    const res = await fetch(extentsApiUrl, {
                                        method: 'GET',
                                        headers: {
                                            'Accept': 'application/json;version=2'
                                        }
                                    });
                                    const data = await res.json();
                                    locData['extents-api-data'] = data;
                                    locData[`extents-data`] = {};

                                    // Collect TSIDs from temp, depth, and DO time series
                                    const datmanTids = datmanTimeSeries.map(series => series['timeseries-id']);
                                    const allTids = [...datmanTids]; // Combine both arrays

                                    allTids.forEach((tsid, index) => {
                                        const matchingEntry = data.entries.find(entry => entry['name'] === tsid);
                                        if (matchingEntry) {
                                            // Convert times from UTC
                                            let latestTimeUTC = matchingEntry.extents[0]?.['latest-time'];
                                            let earliestTimeUTC = matchingEntry.extents[0]?.['earliest-time'];

                                            // Convert UTC times to Date objects
                                            let latestTimeCST = new Date(latestTimeUTC);
                                            let earliestTimeCST = new Date(earliestTimeUTC);

                                            // Function to format date as "MM-DD-YYYY HH:mm"
                                            const formatDate = (date) => {
                                                return date.toLocaleString('en-US', {
                                                    timeZone: 'America/Chicago', // Set the timezone to Central Time (CST/CDT)
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false // Use 24-hour format
                                                }).replace(',', ''); // Remove the comma from the formatted string
                                            };

                                            // Format the times to CST/CDT
                                            let formattedLatestTime = formatDate(latestTimeCST);
                                            let formattedEarliestTime = formatDate(earliestTimeCST);

                                            // Construct the _data object with formatted times
                                            let _data = {
                                                office: matchingEntry.office,
                                                name: matchingEntry.name,
                                                earliestTime: formattedEarliestTime, // Use formatted earliestTime
                                                earliestTimeISO: earliestTimeCST.toISOString(), // Store original ISO format as well
                                                lastUpdate: matchingEntry.extents[0]?.['last-update'],
                                                latestTime: formattedLatestTime, // Use formatted latestTime
                                                latestTimeISO: latestTimeCST.toISOString(), // Store original ISO format as well
                                                tsid: matchingEntry['timeseries-id'],
                                            };

                                            // Determine extent key based on tsid
                                            let extent_key;
                                            if (tsid.includes('Stage') || tsid.includes('Elev') || tsid.includes('Flow') || tsid.includes('Conc-DO')) {
                                                extent_key = 'datman';
                                            } else {
                                                return; // Ignore if it doesn't match the condition
                                            }

                                            // Update locData with extents-data
                                            if (!locData[`extents-data`][extent_key]) {
                                                locData[`extents-data`][extent_key] = [_data];
                                            } else {
                                                locData[`extents-data`][extent_key].push(_data);
                                            }

                                        } else {
                                            console.warn(`No matching entry found for TSID: ${tsid}`);
                                        }
                                    });
                                } catch (error) {
                                    console.error(`Error fetching additional data for location ${locData['location-id']}:`, error);
                                }
                            };

                            // Combine all promises for this location
                            timeSeriesDataPromises.push(Promise.all([...datmanPromises, timeSeriesDataExtentsApiCall()]));
                        }
                    }

                    // Wait for all additional data fetches to complete
                    return Promise.all(timeSeriesDataPromises);
                })
                .then(() => {
                    // Assuming this is inside a promise chain (like in a `.then()`)

                    console.log('All combinedData data fetched successfully:', combinedData);

                    // Step 1: Filter out locations where 'attribute' ends with '.1'
                    combinedData.forEach((dataObj, index) => {
                        // console.log(`Processing dataObj at index ${index}:`, dataObj['assigned-locations']);

                        // Filter out locations with 'attribute' ending in '.1'
                        dataObj['assigned-locations'] = dataObj['assigned-locations'].filter(location => {
                            const attribute = location['attribute'].toString();
                            if (attribute.endsWith('.1')) {
                                // Log the location being removed
                                console.log(`Removing location with attribute '${attribute}' and id '${location['location-id']}' at index ${index}`);
                                return false; // Filter out this location
                            }
                            return true; // Keep the location
                        });

                        // console.log(`Updated assigned-locations for index ${index}:`, dataObj['assigned-locations']);
                    });

                    console.log('Filtered all locations ending with .1 successfully:', combinedData);

                    // Step 2: Filter out locations where 'location-id' doesn't match owner's 'assigned-locations'
                    combinedData.forEach(dataGroup => {
                        // Iterate over each assigned-location in the dataGroup
                        let locations = dataGroup['assigned-locations'];

                        // Loop through the locations array in reverse to safely remove items
                        for (let i = locations.length - 1; i >= 0; i--) {
                            let location = locations[i];

                            // Find if the current location-id exists in owner's assigned-locations
                            let matchingOwnerLocation = location['owner']['assigned-locations'].some(ownerLoc => {
                                return ownerLoc['location-id'] === location['location-id'];
                            });

                            // If no match, remove the location
                            if (!matchingOwnerLocation) {
                                // console.log(`Removing location with id ${location['location-id']} as it does not match owner`);
                                locations.splice(i, 1);
                            }
                        }
                    });

                    console.log('Filtered all locations by matching location-id with owner successfully:', combinedData);

                    // Step 3: Filter out locations where 'tsid-datman' is null
                    combinedData.forEach(dataGroup => {
                        // Iterate over each assigned-location in the dataGroup
                        let locations = dataGroup['assigned-locations'];

                        // Loop through the locations array in reverse to safely remove items
                        for (let i = locations.length - 1; i >= 0; i--) {
                            let location = locations[i];

                            // console.log("tsid-datman: ", location[`tsid-datman`]);

                            // Check if 'tsid-datman' is null or undefined
                            let isLocationNull = location[`tsid-datman`] == null;

                            // If tsid-datman is null, remove the location
                            if (isLocationNull) {
                                console.log(`Removing location with id ${location['location-id']}`);
                                locations.splice(i, 1); // Remove the location from the array
                            }
                        }
                    });

                    console.log('Filtered all locations where tsid is null successfully:', combinedData);

                    // Only call createTable if no valid data exists
                    const table = createTablePrecip(combinedData, type);

                    // Append the table to the specified container
                    const container = document.getElementById(`table_container_${reportDiv}`);
                    container.appendChild(table);

                    loadingIndicator.style.display = 'none';
                })
                .catch(error => {
                    console.error('There was a problem with one or more fetch operations:', error);
                    loadingIndicator.style.display = 'none';
                });

        })
        .catch(error => {
            console.error('There was a problem with the initial fetch operation:', error);
            loadingIndicator.style.display = 'none';
        });
});

function filterByLocationCategory(array, setLocationCategory) {
    return array.filter(item =>
        item['location-category'] &&
        item['location-category']['office-id'] === setLocationCategory['office-id'] &&
        item['location-category']['id'] === setLocationCategory['id']
    );
}

function subtractHoursFromDate(date, hoursToSubtract) {
    return new Date(date.getTime() - (hoursToSubtract * 60 * 60 * 1000));
}

function subtractDaysFromDate(date, daysToSubtract) {
    return new Date(date.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
}

function formatISODate2ReadableDate(timestamp) {
    const date = new Date(timestamp);
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // Month
    const dd = String(date.getDate()).padStart(2, '0'); // Day
    const yyyy = date.getFullYear(); // Year
    const hh = String(date.getHours()).padStart(2, '0'); // Hours
    const min = String(date.getMinutes()).padStart(2, '0'); // Minutes
    return `${mm}-${dd}-${yyyy} ${hh}:${min}`;
}

const reorderByAttribute = (data) => {
    data['assigned-time-series'].sort((a, b) => a.attribute - b.attribute);
};

const formatTime = (date) => {
    const pad = (num) => (num < 10 ? '0' + num : num);
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const findValuesAtTimes = (data) => {
    const result = [];
    const currentDate = new Date();

    // Create time options for 5 AM, 6 AM, and 7 AM today in Central Standard Time
    const timesToCheck = [
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 6, 0), // 6 AM CST
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 5, 0), // 5 AM CST
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 7, 0)  // 7 AM CST
    ];

    const foundValues = [];

    // Iterate over the values in the provided data
    const values = data.values;

    // Check for each time in the order of preference
    timesToCheck.forEach((time) => {
        // Format the date-time to match the format in the data
        const formattedTime = formatTime(time);
        // console.log(formattedTime);

        const entry = values.find(v => v[0] === formattedTime);
        if (entry) {
            foundValues.push({ time: formattedTime, value: entry[1] }); // Store both time and value if found
        } else {
            foundValues.push({ time: formattedTime, value: null }); // Store null if not found
        }
    });

    // Push the result for this data entry
    result.push({
        name: data.name,
        values: foundValues // This will contain the array of { time, value } objects
    });

    return result;
};

function getLastNonNullValue(data, tsid) {
    // Iterate over the values array in reverse
    for (let i = data.values.length - 1; i >= 0; i--) {
        // Check if the value at index i is not null
        if (data.values[i][1] !== null) {
            // Return the non-null value as separate variables
            return {
                tsid: tsid,
                timestamp: data.values[i][0],
                value: data.values[i][1],
                qualityCode: data.values[i][2]
            };
        }
    }
    // If no non-null value is found, return null
    return null;
}

function getMaxValue(data, tsid) {
    let maxValue = -Infinity; // Start with the smallest possible value
    let maxEntry = null; // Store the corresponding max entry (timestamp, value, quality code)

    // Loop through the values array
    for (let i = 0; i < data.values.length; i++) {
        // Check if the value at index i is not null
        if (data.values[i][1] !== null) {
            // Update maxValue and maxEntry if the current value is greater
            if (data.values[i][1] > maxValue) {
                maxValue = data.values[i][1];
                maxEntry = {
                    tsid: tsid,
                    timestamp: data.values[i][0],
                    value: data.values[i][1],
                    qualityCode: data.values[i][2]
                };
            }
        }
    }

    // Return the max entry (or null if no valid values were found)
    return maxEntry;
}

function getMinValue(data, tsid) {
    let minValue = Infinity; // Start with the largest possible value
    let minEntry = null; // Store the corresponding min entry (timestamp, value, quality code)

    // Loop through the values array
    for (let i = 0; i < data.values.length; i++) {
        // Check if the value at index i is not null
        if (data.values[i][1] !== null) {
            // Update minValue and minEntry if the current value is smaller
            if (data.values[i][1] < minValue) {
                minValue = data.values[i][1];
                minEntry = {
                    tsid: tsid,
                    timestamp: data.values[i][0],
                    value: data.values[i][1],
                    qualityCode: data.values[i][2]
                };
            }
        }
    }

    // Return the min entry (or null if no valid values were found)
    return minEntry;
}

function getCumValue(data, tsid) {
    let value0 = null;  // Recent (0 hours)
    let value6 = null;  // 6 hours earlier
    let value12 = null; // 12 hours earlier
    let value18 = null; // 18 hours earlier
    let value24 = null; // 24 hours earlier
    let value30 = null; // 30 hours earlier
    let value36 = null; // 36 hours earlier
    let value42 = null; // 42 hours earlier
    let value48 = null; // 48 hours earlier
    let value54 = null; // 54 hours earlier
    let value60 = null; // 60 hours earlier
    let value66 = null; // 66 hours earlier
    let value72 = null; // 72 hours earlier

    // console.log("Data received:", data);
    // console.log("TSID:", tsid);

    // Iterate over the values array in reverse
    for (let i = data.values.length - 1; i >= 0; i--) {
        const [timestamp, value, qualityCode] = data.values[i];

        // console.log(`Processing index ${i}:`, { timestamp, value, qualityCode });

        // Ensure the value is not null
        if (value !== null) {
            // Convert timestamp to Date object
            let currentTimestamp = new Date(fixTimestamp(timestamp));
            // console.log("Parsed currentTimestamp:", currentTimestamp);

            if (isNaN(currentTimestamp.getTime())) {
                console.warn(`Invalid date parsed: ${timestamp}`);
                continue; // Skip this iteration
            }

            // If value0 hasn't been set, assign it the latest non-null value
            if (!value0) {
                value0 = {
                    tsid,
                    timestamp: timestamp.replace(/(\d{2})-(\d{2})-(\d{4}) (\d{2}:\d{2})/, "$3-$1-$2T$4:00Z"),
                    value: parseFloat(value),
                    qualityCode
                };
                // console.log("Assigned value0:", value0);
            } else {
                // Calculate target timestamps for each interval
                const timeOffsets = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72];
                let timeValues = [
                    value6, value12, value18, value24, value30, value36,
                    value42, value48, value54, value60, value66, value72
                ];

                for (let j = 0; j < timeOffsets.length; j++) {
                    if (!timeValues[j]) {
                        const targetTime = new Date(value0.timestamp);
                        targetTime.setHours(targetTime.getHours() - timeOffsets[j]);
                        // console.log(`Checking for offset ${timeOffsets[j]} hours, targetTime:`, targetTime);

                        // Allow slight variations due to potential parsing issues
                        const timeDiff = Math.abs(currentTimestamp - targetTime);
                        if (timeDiff < 3600000) { // Allow a 1-hour tolerance
                            timeValues[j] = { tsid, timestamp, value: parseFloat(value), qualityCode };
                            // console.log(`Assigned value for ${timeOffsets[j]} hours earlier:`, timeValues[j]);
                        }
                    }
                }

                // Assign updated values back
                [value6, value12, value18, value24, value30, value36,
                    value42, value48, value54, value60, value66, value72] = timeValues;

                // Break loop if all values are found
                if (timeValues.every(val => val)) {
                    // console.log("All required values found, breaking loop.");
                    break;
                }
            }
        }
    }

    // console.log("Final extracted values:", {
    //     value0, value6, value12, value18, value24, value30,
    //     value36, value42, value48, value54, value60, value66, value72
    // });

    // Calculate cumulative values (value0 - valueX)
    const cumulativeValues = {
        cumulative6: value0 && value6 ? parseFloat(value0.value) - parseFloat(value6.value) : null,
        cumulative12: value0 && value12 ? parseFloat(value0.value) - parseFloat(value12.value) : null,
        cumulative24: value0 && value24 ? parseFloat(value0.value) - parseFloat(value24.value) : null,
        cumulative48: value0 && value48 ? parseFloat(value0.value) - parseFloat(value48.value) : null,
        cumulative72: value0 && value72 ? parseFloat(value0.value) - parseFloat(value72.value) : null,
    };

    // console.log("Cumulative Values:", cumulativeValues);

    return {
        value0,
        value6,
        value12,
        value18,
        value24,
        value30,
        value36,
        value42,
        value48,
        value54,
        value60,
        value66,
        value72,
        ...cumulativeValues
    };
}

function getIncValue(data, tsid) {
    let value0 = null;
    let value6 = null;
    let value12 = null;
    let value18 = null;
    let value24 = null;
    let value30 = null;
    let value36 = null;
    let value42 = null;
    let value48 = null;
    let value54 = null;
    let value60 = null;
    let value66 = null;
    let value72 = null;

    for (let i = data.values.length - 1; i >= 0; i--) {
        const [timestamp, value, qualityCode] = data.values[i];

        if (value !== null) {
            let currentTimestamp = new Date(fixTimestamp(timestamp));
            // console.log("Parsed currentTimestamp:", currentTimestamp);

            if (isNaN(currentTimestamp.getTime())) {
                // console.warn(`Invalid date parsed: ${timestamp}`);
                continue; // Skip this iteration
            }

            if (!value0) {
                value0 = {
                    tsid,
                    timestamp: timestamp.replace(/(\d{2})-(\d{2})-(\d{4}) (\d{2}:\d{2})/, "$3-$1-$2T$4:00Z"),
                    value: parseFloat(value),
                    qualityCode
                };
                // console.log("Assigned value0:", value0);
            } else {
                // Calculate target timestamps for each interval
                const timeOffsets = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72];
                let timeValues = [
                    value6, value12, value18, value24, value30, value36,
                    value42, value48, value54, value60, value66, value72
                ];

                for (let j = 0; j < timeOffsets.length; j++) {
                    if (!timeValues[j]) {
                        const targetTime = new Date(value0.timestamp);
                        targetTime.setHours(targetTime.getHours() - timeOffsets[j]);
                        // console.log(`Checking for offset ${timeOffsets[j]} hours, targetTime:`, targetTime);

                        // Allow slight variations due to potential parsing issues
                        const timeDiff = Math.abs(currentTimestamp - targetTime);
                        if (timeDiff < 3600000) { // Allow a 1-hour tolerance
                            timeValues[j] = { tsid, timestamp, value: parseFloat(value), qualityCode };
                            // console.log(`Assigned value for ${timeOffsets[j]} hours earlier:`, timeValues[j]);
                        }
                    }
                }

                // Assign updated values back
                [value6, value12, value18, value24, value30, value36,
                    value42, value48, value54, value60, value66, value72] = timeValues;

                // Break loop if all values are found
                if (timeValues.every(val => val)) {
                    // console.log("All required values found, breaking loop.");
                    break;
                }
            }
        }
    }

    const incrementalValues = {
        incremental6: value6 ? parseFloat(value0.value) - parseFloat(value6.value) : null,
        incremental12: value12 ? parseFloat(value6.value) - parseFloat(value12.value) : null,
        incremental18: value18 ? parseFloat(value12.value) - parseFloat(value18.value) : null,
        incremental24: value24 ? parseFloat(value18.value) - parseFloat(value24.value) : null,
        incremental30: value30 ? parseFloat(value24.value) - parseFloat(value30.value) : null,
        incremental36: value36 ? parseFloat(value30.value) - parseFloat(value36.value) : null,
        incremental42: value42 ? parseFloat(value36.value) - parseFloat(value42.value) : null,
        incremental48: value48 ? parseFloat(value42.value) - parseFloat(value48.value) : null,
        incremental54: value54 ? parseFloat(value48.value) - parseFloat(value54.value) : null,
        incremental60: value60 ? parseFloat(value54.value) - parseFloat(value60.value) : null,
        incremental66: value66 ? parseFloat(value60.value) - parseFloat(value66.value) : null,
        incremental72: value72 ? parseFloat(value66.value) - parseFloat(value72.value) : null,
    };    

    // console.log("Final incremental values:", incrementalValues);

    return {
        value0,
        value6,
        value12,
        value18,
        value24,
        value30,
        value36,
        value42,
        value48,
        value54,
        value60,
        value66,
        value72,
        ...incrementalValues
    };
}

function hasLastValue(data) {
    let allLocationsValid = true; // Flag to track if all locations are valid

    // Iterate through each key in the data object
    for (const locationIndex in data) {
        if (data.hasOwnProperty(locationIndex)) { // Ensure the key belongs to the object
            const item = data[locationIndex];
            // console.log(`Checking basin ${parseInt(locationIndex) + 1}:`, item); // Log the current item being checked

            const assignedLocations = item['assigned-locations'];
            // Check if assigned-locations is an object
            if (typeof assignedLocations !== 'object' || assignedLocations === null) {
                // console.log('No assigned-locations found in basin:', item);
                allLocationsValid = false; // Mark as invalid since no assigned locations are found
                continue; // Skip to the next basin
            }

            // Iterate through each location in assigned-locations
            for (const locationName in assignedLocations) {
                const location = assignedLocations[locationName];
                // console.log(`Checking location: ${locationName}`, location); // Log the current location being checked

                // Check if location['tsid-temp-water'] exists, if not, set tempWaterTsidArray to an empty array
                const datmanTsidArray = (location['tsid-datman'] && location['tsid-datman']['assigned-time-series']) || [];
                const datmanLastValueArray = location['datman-last-value'];
                // console.log("datmanTsidArray: ", datmanTsidArray);
                // console.log("datmanLastValueArray: ", datmanLastValueArray);

                // Check if 'datman-last-value' exists and is an array
                let hasValidValue = false;

                if (Array.isArray(datmanTsidArray) && datmanTsidArray.length > 0) {
                    // console.log('datmanTsidArray has data.');

                    // Loop through the datmanLastValueArray and check for null or invalid entries
                    for (let i = 0; i < datmanLastValueArray.length; i++) {
                        const entry = datmanLastValueArray[i];
                        // console.log("Checking entry: ", entry);

                        // Step 1: If the entry is null, set hasValidValue to false
                        if (entry === null) {
                            // console.log(`Entry at index ${i} is null and not valid.`);
                            hasValidValue = false;
                            continue; // Skip to the next iteration, this is not valid
                        }

                        // Step 2: If the entry exists, check if the value is valid
                        if (entry.value !== null && entry.value !== 'N/A' && entry.value !== undefined) {
                            // console.log(`Valid entry found at index ${i}:`, entry);
                            hasValidValue = true; // Set to true only if we have a valid entry
                        } else {
                            // console.log(`Entry at index ${i} has an invalid value:`, entry.value);
                            hasValidValue = false; // Invalid value, so set it to false
                        }
                    }

                    // console.log("hasValidValue: ", hasValidValue);

                    // Log whether a valid entry was found
                    if (hasValidValue) {
                        // console.log("There are valid entries in the array.");
                    } else {
                        // console.log("There are invalid entries found in the array.");
                    }
                } else {
                    // console.log(`datmanTsidArray is either empty or not an array for location ${locationName}.`);
                }

                // If no valid values found in the current location, mark as invalid
                if (!hasValidValue) {
                    allLocationsValid = false; // Set flag to false if any location is invalid
                }
            }
        }
    }

    // Return true only if all locations are valid
    if (allLocationsValid) {
        console.log('All locations have valid entries.');
        return true;
    } else {
        console.log('Some locations are missing valid entries.');
        return false;
    }
}

function createTablePrecip(combinedData, type) {
    const table = document.createElement('table');
    table.setAttribute('id', 'gage_data');

    const headerRow = document.createElement('tr');
    let columns;

    // Set columns based on type
    if (type === "inc") {
        columns = ["River Mile", "Location", "06 hr.", "12 hr.", "18 hr.", "24 hr.", "30 hr.", "36 hr.", "42 hr.", "48 hr.", "54 hr.", "60 hr.", "66 hr.", "72 hr.", "Zero hr."];
    } else if (type === "cum") {
        columns = ["River Mile", "Location", "06 hr.", "12 hr.", "24 hr.", "48 hr.", "72 hr.", "Zero hr."];
    }

    // Create header cells
    columns.forEach((columnName) => {
        const th = document.createElement('th');
        th.textContent = columnName;
        th.style.height = '50px';
        th.style.backgroundColor = 'darkblue';
        th.style.color = 'white'; // Added for better visibility
        th.style.whiteSpace = 'nowrap';
        th.style.paddingRight = '15px'; // Added for spacing
        th.style.paddingLeft = '15px'; // Added for spacing
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Populate table rows with data
    combinedData.forEach((basin) => {
        basin['assigned-locations'].forEach((location) => {
            const row = document.createElement('tr');

            const riverMileCell = document.createElement('td');
            const locationId = location[`location-id`];
            const riverMileObject = location['river-mile'];
            const riverMileValue = getStationForLocation(locationId, riverMileObject);
            riverMileCell.textContent = riverMileValue != null ? parseFloat(riverMileValue).toFixed(1) : "N/A";

            // const riverMileValue = location['river-mile'] && location['river-mile']['river_mile_hard_coded'];
            // riverMileCell.textContent = riverMileValue != null ? parseFloat(riverMileValue).toFixed(1) : "N/A";

            // Set the title for the cell
            // riverMileCell.title = "Hard Coded with Json File";

            // Set halo effect using text-shadow with orange color
            // riverMileCell.style.textShadow = '0 0 2px rgba(255, 165, 0, 0.7), 0 0 2px rgba(255, 140, 0, 0.5)';
            row.appendChild(riverMileCell);

            // Location cell with link
            const value0 = location['datman-inc-value'][0]?.value0;
            const tsid = value0 ? value0.tsid : '';
            const link = `../chart/index.html?office=MVS&cwms_ts_id=${tsid}&cda=internal&lookback=7`;
            const locationCell = document.createElement('td');
            const linkElement = document.createElement('a');
            linkElement.href = link;
            linkElement.target = '_blank';
            linkElement.textContent = (location['location-id']).split('-')[0];
            locationCell.style.whiteSpace = 'nowrap';
            locationCell.appendChild(linkElement);
            row.appendChild(locationCell);

            let dataValues;
            if (type === "inc") {
                dataValues = location['datman-inc-value'] && location['datman-inc-value'][0];

                // Handle incremental values
                const valueKeys = ["incremental6", "incremental12", "incremental18", "incremental24", "incremental30", "incremental36", "incremental42", "incremental48", "incremental54", "incremental60", "incremental66", "incremental72"];
                valueKeys.forEach((timeKey) => {
                    const cell = document.createElement('td');
                    const value = dataValues ? dataValues[timeKey] : null; // Use null if dataValues or key is missing
                    const numericValue = (value !== undefined && value !== null) ? Number(value) : NaN; // Convert to number

                    // Set cell text
                    cell.textContent = !isNaN(numericValue) ? numericValue.toFixed(2) : 'N/A';

                    // Set background color based on value conditions
                    if (!isNaN(numericValue)) {
                        if (numericValue > 2.00 || numericValue < 0.00) {
                            cell.style.backgroundColor = 'red';
                        } else if (numericValue === 0.00) {
                            cell.style.backgroundColor = 'white';
                        } else if (numericValue > 0.00 && numericValue <= 0.25) {
                            cell.style.backgroundColor = 'limegreen';
                        } else if (numericValue > 0.25 && numericValue <= 0.50) {
                            cell.style.backgroundColor = 'sandybrown';
                        } else if (numericValue > 0.50 && numericValue <= 1.00) {
                            cell.style.backgroundColor = 'gold';
                        } else if (numericValue > 1.00 && numericValue <= 2.00) {
                            cell.style.backgroundColor = 'orange';
                        } else {
                            cell.style.backgroundColor = 'purple';
                        }
                    }

                    row.appendChild(cell);
                });

                // Zero hour cell
                const zeroHourCell = document.createElement('td');
                zeroHourCell.style.whiteSpace = 'nowrap';  // Prevent line break in the cell
                zeroHourCell.textContent = dataValues && dataValues.value0 && dataValues.value0.timestamp
                    ? dataValues.value0.timestamp
                    : 'N/A'; // Default to 'N/A' if missing
                row.appendChild(zeroHourCell);

            } else if (type === "cum") {
                const dataValues = location['datman-cum-value'] && location['datman-cum-value'][0]; // Safely access the first element

                ["cumulative6", "cumulative12", "cumulative24", "cumulative48", "cumulative72"].forEach((timeKey) => {
                    const cell = document.createElement('td');
                    const value = dataValues ? dataValues[timeKey] : null; // Use null if dataValues or key is missing
                    const numericValue = (value !== undefined && value !== null) ? parseFloat(value) : NaN; // Convert to float
                    cell.textContent = !isNaN(numericValue) ? numericValue.toFixed(2) : 'N/A';

                    // Set background color based on value conditions
                    if (!isNaN(numericValue)) {
                        if (numericValue > 2.00 || numericValue < 0.00) {
                            cell.style.backgroundColor = 'red';
                        } else if (numericValue === 0.00) {
                            cell.style.backgroundColor = 'white';
                        } else if (numericValue > 0.00 && numericValue <= 0.25) {
                            cell.style.backgroundColor = 'limegreen';
                        } else if (numericValue > 0.25 && numericValue <= 0.50) {
                            cell.style.backgroundColor = 'sandybrown';
                        } else if (numericValue > 0.50 && numericValue <= 1.00) {
                            cell.style.backgroundColor = 'gold';
                        } else if (numericValue > 1.00 && numericValue <= 2.00) {
                            cell.style.backgroundColor = 'orange';
                        } else {
                            cell.style.backgroundColor = 'purple';
                        }
                    }

                    row.appendChild(cell);
                });

                // Zero hour cell
                const zeroHourCell = document.createElement('td');
                zeroHourCell.style.whiteSpace = 'nowrap';  // Prevent line break in the cell
                const zeroHour = dataValues && dataValues.value0 && dataValues.value0.timestamp;
                zeroHourCell.innerHTML = zeroHour
                    ? dataValues.value0.timestamp
                    : 'N/A'; // Default to 'N/A' if missing
                zeroHourCell.style.whiteSpace = 'nowrap';  // Prevent line break in the cell
                row.appendChild(zeroHourCell);
            }

            // Append row to table
            table.appendChild(row);
        });
    });

    return table;
}

function getStationForLocation(locationId, riverMileObject) {
    if (!Array.isArray(riverMileObject)) {
        console.error("riverMileObject is not an array or is undefined/null");
        return null;
    }
    for (const entry of riverMileObject) {
        const name = entry["stream-location-node"].id.name;
        if (name === locationId) {
            return entry["stream-location-node"]["stream-node"].station || null; // Return station if it exists, else null
        }
    }
    return null; // Return null if no match is found
}

function fixTimestamp(timestamp) {
    // Convert "MM-DD-YYYY HH:mm" → "YYYY-MM-DDTHH:mm:ssZ"
    let [month, day, year, time] = timestamp.split(/[- ]/);
    return `${year}-${month}-${day}T${time}:00Z`;
}